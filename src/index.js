require('dotenv').config();
const { Telegraf, Scenes, session } = require('telegraf');
const newEventWizard = require('./ops/newEvent');
const editEventWizard = require('./ops/editEvent');
const eventSummaryWizard = require('./ops/eventSummary');
const exportWizard = require('./ops/export');
const organiserScene = require('./ops/organiser');
const signupScene = require('./ops/signup');
const { profileScene, setupProfileScene } = require('./ops/profile');
const db = require('./db/queries');
const messages = require('./messages.json');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper to get message strings with variable substitution
const getMessage = (path, params = {}) => {
    const keys = path.split('.');
    let msg = messages;
    for (const key of keys) {
        msg = msg[key];
        if (!msg) return path; // Return key if not found
    }

    if (typeof msg !== 'string') return path;

    return msg.replace(/{(\w+)}/g, (match, key) => {
        return typeof params[key] !== 'undefined' ? params[key] : match;
    });
};

// Test DB connection on startup
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
});

const stage = new Scenes.Stage([
    newEventWizard,
    editEventWizard,
    eventSummaryWizard,
    exportWizard,
    organiserScene,
    signupScene,
    profileScene,
    setupProfileScene
]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Basic logger
bot.use(async (ctx, next) => {
    const user = ctx.from ? (ctx.from.username || ctx.from.first_name) : 'Unknown';
    console.log(`Update ${ctx.update.update_id} from ${user}`);
    return await next();
});

// Enhanced /start with deep link support
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(' ');

    // Parse deep link: /start ev_<eventId>
    if (args[1] && args[1].startsWith('ev_')) {
        const eventId = args[1].slice(3); // Extract event ID
        const event = await db.getEvent(eventId);

        if (!event) {
            return ctx.reply(getMessage('errors.eventNotFound'));
        }

        // Store pending event and start signup flow
        await db.setBotState(userId, 'ASK_SELF_OR_OTHER', eventId);

        return ctx.reply(
            getMessage('welcome.askSelfOrOther', {
                title: event.title,
                location: event.location,
                dateTime: event.date_time // You might want to format this date
            }),
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: getMessage('buttons.myself'), callback_data: 'self' }],
                        [{ text: getMessage('buttons.someoneElse'), callback_data: 'caregiver' }]
                    ]
                }
            }
        );
    }

    // Regular /start
    await db.getOrCreateUser(userId, {
        name: ctx.from.first_name,
        telegram_username: ctx.from.username
    });
    ctx.reply(getMessage('welcome.regular'));
});

// Handle button clicks
bot.action(['self', 'caregiver'], async (ctx) => {
    const userId = ctx.from.id;
    const state = await db.getBotState(userId);

    if (!state || state.state !== 'ASK_SELF_OR_OTHER') {
        return ctx.answerCbQuery(getMessage('errors.startOver'));
    }

    const isCaregiver = ctx.callbackQuery.data === 'caregiver';
    await db.setBotState(userId, 'ASK_NAME', state.pending_event_id, {
        is_caregiver: isCaregiver
    });

    ctx.editMessageText(
        getMessage('prompts.enterName', { who: isCaregiver ? 'participant' : 'your' }),
        { reply_markup: { inline_keyboard: [[{ text: getMessage('buttons.cancel'), callback_data: 'cancel' }]] } }
    );
});

// Commands
bot.command('newevent', (ctx) => ctx.scene.enter('NEW_EVENT_WIZARD'));
bot.command('editevent', (ctx) => ctx.scene.enter('EDIT_EVENT_WIZARD'));
bot.command('eventsummary', (ctx) => ctx.scene.enter('EVENT_SUMMARY_WIZARD'));
bot.command('export', (ctx) => ctx.scene.enter('EXPORT_WIZARD'));
bot.command('organiser', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));
bot.command('profile', (ctx) => ctx.scene.enter('PROFILE_SCENE'));

bot.help((ctx) => ctx.reply('Available commands:\n/organiser - Organiser Dashboard\n/profile - View/Edit Profile\n/newevent - Create a new event\n/editevent - Edit an existing event\n/eventsummary - View signup counts\n/export - Download participant list (Excel)'));

// Staff command
bot.command('roster', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args[1] && args[1].startsWith('ev_')) {
        const registrations = await db.listRegistrationsForEvent(args[1].slice(3));
        if (registrations.length === 0) {
            return ctx.reply('No registrations yet.');
        }

        const list = registrations.map(r => `• ${r.participant_name} (${r.user_name})`).join('\n');
        ctx.reply(`📋 *Roster* (${registrations.length} signed up):\n${list}`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply('Usage: /roster ev_<eventId>');
    }
});

// Text handler (State machine for registration)
bot.on('text', async (ctx) => {
    // Ignore commands handled above
    if (ctx.message.text.startsWith('/')) {
        return ctx.reply(getMessage('errors.unknownCommand'));
    }

    const userId = ctx.from.id;
    const state = await db.getBotState(userId);

    if (!state) {
        // Default fallback for unknown text
        return ctx.reply(getMessage('errors.unknownInput'));
    }

    switch (state.state) {
        case 'ASK_NAME':
            await db.setBotState(userId, 'ASK_EMAIL', state.pending_event_id, {
                ...state.temp_data,
                participant_name: ctx.message.text
            });
            return ctx.reply(getMessage('prompts.enterEmail'));

        case 'ASK_EMAIL':
            await db.setBotState(userId, 'CONFIRM', state.pending_event_id, {
                ...state.temp_data,
                email: ctx.message.text
            });

            const event = await db.getEvent(state.pending_event_id);
            const data = state.temp_data;
            return ctx.reply(
                getMessage('prompts.confirmRegistration', {
                    participantName: data.participant_name,
                    email: ctx.message.text,
                    eventTitle: event.title
                }),
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: getMessage('buttons.confirm'), callback_data: 'confirm' }],
                            [{ text: getMessage('buttons.edit'), callback_data: 'edit' }]
                        ]
                    }
                }
            );

        default:
            return ctx.reply(getMessage('errors.unknownInput'));
    }
});

// Final confirmation action
bot.action('confirm', async (ctx) => {
    const userId = ctx.from.id;
    const state = await db.getBotState(userId);

    if (!state || !state.pending_event_id) {
        return ctx.answerCbQuery(getMessage('errors.startOver'));
    }

    const registration = await db.createRegistration({
        eventId: state.pending_event_id,
        userTelegramId: userId,
        participantName: state.temp_data.participant_name,
        participantAge: state.temp_data.participant_age
    });

    await db.clearBotState(userId);

    const event = await db.getEvent(state.pending_event_id);
    ctx.editMessageText(
        getMessage('success.registrationConfirmed', {
            participantName: state.temp_data.participant_name,
            eventTitle: event.title,
            registrationId: registration.id.slice(0, 8)
        }),
        { parse_mode: 'Markdown' }
    );
});

// Cancellation
bot.action('cancel', async (ctx) => {
    const userId = ctx.from.id;
    await db.clearBotState(userId);
    ctx.editMessageText('❌ Registration cancelled.');
});

// Launch bot
console.log('Bot is starting...');

const launchOptions = {};
if (process.env.WEBHOOK_DOMAIN) {
    launchOptions.webhook = {
        domain: process.env.WEBHOOK_DOMAIN,
        secretToken: process.env.WEBHOOK_SECRET_TOKEN,
        port: process.env.PORT || 3000,
    };
    const webhookUrl = `${process.env.WEBHOOK_DOMAIN}/bot${process.env.BOT_TOKEN}`;
    console.log(`Configuring webhook mode: ${webhookUrl}`);
} else {
    console.log('Configuring polling mode');
}

bot.launch(launchOptions).then(() => {
    console.log('Bot is running!');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
