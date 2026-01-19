require('dotenv').config();
const http = require('http');
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { getMessage } = require('./utils/messages');
const db = require('./db/queries');

// Import Scenes
const organiserScene = require('./ops/organiser');
const { profileScene, setupProfileScene } = require('./ops/profile');
const signupScene = require('./ops/signup');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Test DB connection on startup
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
});

const stage = new Scenes.Stage([
    organiserScene,
    profileScene,
    setupProfileScene,
    signupScene
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

    // Ensure user exists in our DB
    const user = await db.getOrCreateUser(userId, {
        name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
        telegram_username: ctx.from.username
    });

    // Parse deep link: /start ev_<eventId>
    if (args[1] && args[1].startsWith('ev_')) {
        const eventId = args[1].slice(3); // Extract event ID

        // If profile is incomplete, force setup first
        if (!user.phone) {
            ctx.session.pendingEventId = eventId;
            return ctx.scene.enter('SETUP_PROFILE_SCENE');
        }

        // Otherwise go straight to signup
        return ctx.scene.enter('SIGNUP_SCENE', { eventId });
    }

    // Regular /start
    if (!user.phone) {
        return ctx.scene.enter('SETUP_PROFILE_SCENE');
    }

    // Dashboard selection for registered users
    ctx.reply(
        'Welcome back! Please select a dashboard:',
        Markup.inlineKeyboard([
            [Markup.button.callback('👤 Participant Dashboard', 'dashboard_participant')],
            [Markup.button.callback('📅 Organiser Dashboard', 'dashboard_organiser')]
        ])
    );
});

// Dashboard actions
bot.action('dashboard_participant', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('PROFILE_SCENE');
});

bot.action('dashboard_organiser', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('ORGANISER_SCENE');
});

// Commands
bot.command('organiser', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));
bot.command('profile', (ctx) => ctx.scene.enter('PROFILE_SCENE'));

bot.help((ctx) => {
    const helpText = `
*Available Commands:*

*General:*
/start - Start the bot (Dashboard selection)
/profile - View or edit your profile
/help - Show this help message

*Organiser Tools:*
/organiser - Access Organiser Dashboard
/newevent - Create a new event
/editevent - Edit an existing event
/eventsummary - View event signups
/export - Download participant list (.xlsx)
    `;
    ctx.reply(helpText, { parse_mode: 'Markdown' });
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
    // Start a dummy HTTP server to satisfy Render's port binding requirement for Web Services
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('Health check: OK');
        res.end();
    }).listen(port, () => {
        console.log(`Health check server running on port ${port}`);
    });
}

bot.launch(launchOptions).then(() => {
    console.log('Bot is running!');
});

// Graceful stop
// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
