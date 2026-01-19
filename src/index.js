const newEventWizard = require('./ops/newEvent');
const editEventWizard = require('./ops/editEvent');
const eventSummaryWizard = require('./ops/eventSummary');

const bot = new Telegraf(process.env.BOT_TOKEN);

const stage = new Scenes.Stage([newEventWizard, editEventWizard, eventSummaryWizard]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Basic logger
bot.use(async (ctx, next) => {
    console.log(`Update ${ctx.update.update_id} received`);
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
bot.start((ctx) => ctx.reply('Welcome! Use /newevent to create a session, /editevent to modify one, or /eventsummary to view signups.'));
bot.help((ctx) => ctx.reply('Available commands:\n/newevent - Create a new event\n/editevent - Edit an existing event\n/eventsummary - View signup counts'));

// Unknown command handler
bot.on('text', (ctx) => {
    if (ctx.message.text.startsWith('/')) {
        return ctx.reply('Unknown command. Please run /help for a list of commands and their purpose.');
    }
    return ctx.reply('I\'m not sure I understand. Type /help to see what I can do.');
});

// Launch bot using webhooks
const webhookUrl = `${process.env.WEBHOOK_DOMAIN}/bot${process.env.BOT_TOKEN}`;

bot.launch({
    webhook: {
        domain: process.env.WEBHOOK_DOMAIN,
        secretToken: process.env.WEBHOOK_SECRET_TOKEN,
        port: process.env.PORT || 3000,
    },
}).then(() => {
    console.log(`Bot is running on ${webhookUrl} (Webhook mode)`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
