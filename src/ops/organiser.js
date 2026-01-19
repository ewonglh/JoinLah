const { Scenes, Markup } = require('telegraf');
const db = require('./db/organiser');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    // Step 1: Main Dashboard Menu
    async (ctx) => {
        if (!(await db.isAdmin(ctx.from.id))) {
            await ctx.reply('⛔ Access denied. You are not an organiser.');
            return ctx.scene.leave();
        }

        await ctx.replyWithMarkdown('🛠️ *Organiser Dashboard*\nWhat would you like to do?',
            Markup.inlineKeyboard([
                [Markup.button.callback('🆕 Create New Event', 'create')],
                [Markup.button.callback('📊 View Registrations', 'stats')],
                [Markup.button.callback('✏️ Edit My Events', 'edit')],
                [Markup.button.callback('🌐 Browse All Events', 'all_events')],
                [Markup.button.callback('📥 Export Signups', 'export_file')],
                [Markup.button.callback('🔙 Exit', 'exit')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Handle Dashboard Actions
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        switch (action) {
            case 'create':
                return ctx.scene.enter('NEW_EVENT_WIZARD');
            case 'stats':
                return ctx.scene.enter('EVENT_SUMMARY_WIZARD');
            case 'edit':
                return ctx.scene.enter('EDIT_EVENT_WIZARD');
            case 'all_events':
                const events = await db.getAllEvents();
                if (events.length === 0) {
                    await ctx.reply('No events found.');
                } else {
                    let msg = '🌐 *All System Events*\n\n';
                    events.forEach((e, i) => msg += `${i + 1}. *${e.title}* (${e.location || 'No Location'})\n`);
                    await ctx.replyWithMarkdown(msg,
                        Markup.inlineKeyboard([Markup.button.callback('🔙 Back to Dashboard', 'home')])
                    );
                    return ctx.wizard.next(); // Wait for back button or user to leave
                }
                return ctx.wizard.selectStep(0); // Refresh menu
            case 'export_file':
                return ctx.scene.enter('EXPORT_WIZARD');
            case 'exit':
                await ctx.reply('Exited dashboard.');
                return ctx.scene.leave();
            default:
                return ctx.wizard.selectStep(0);
        }
    },
    // Step 3: Handle "Back" from All Events (optional but nice)
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'home') {
            await ctx.answerCbQuery();
            return ctx.scene.enter('ORGANISER_SCENE');
        }
    }
);

organiserScene.action('home', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));

module.exports = organiserScene;
