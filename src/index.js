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

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
