const { Scenes, Markup } = require('telegraf');
const { getEventsByOrganiser, getEventRegistrationCount } = require('./db/organiser');

const eventSummaryWizard = new Scenes.WizardScene(
    'EVENT_SUMMARY_WIZARD',
    // Step 1: List user's events via buttons
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                await ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.enter('ORGANISER_SCENE');
            }

            const buttons = events.map(e => [Markup.button.callback(e.title, `sum_sel_${e.id}`)]);
            buttons.push([Markup.button.callback('❌ Cancel', 'cancel_wizard')]);

            await ctx.reply('📊 *Select an event for summary:*', Markup.inlineKeyboard(buttons));
            return ctx.wizard.next();
        } catch (err) {
            console.error(err);
            await ctx.reply('Error fetching events.');
            return ctx.scene.enter('ORGANISER_SCENE');
        }
    },
    // Step 2: Handle selection and display summary
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons.');
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data === 'cancel_wizard') return cancel(ctx);
        const eventId = data.replace('sum_sel_', '');

        const events = await getEventsByOrganiser(ctx.from.id);
        const target = events.find(e => e.id === eventId);

        if (!target) return ctx.scene.enter('ORGANISER_SCENE');

        try {
            const count = await getEventRegistrationCount(target.id);
            const dateStr = new Date(target.date_time).toLocaleString();

            let summary = `📊 *Event Summary: ${target.title}*\n\n`;
            summary += `📅 *Date:* ${dateStr}\n`;
            summary += `📍 *Location:* ${target.location || 'N/A'}\n`;
            summary += `👥 *Signups:* ${count}${target.capacity ? ` / ${target.capacity}` : ''}\n`;

            if (target.description) {
                summary += `\n📝 *Description:* ${target.description}\n`;
            }

            await ctx.replyWithMarkdown(summary,
                Markup.inlineKeyboard([Markup.button.callback('🔙 Back to Dashboard', 'home')])
            );
        } catch (err) {
            console.error(err);
            await ctx.reply('Error fetching summary data.');
        }

        return ctx.wizard.next();
    },
    async (ctx) => {
        return ctx.scene.enter('ORGANISER_SCENE');
    }
);

async function cancel(ctx) {
    return ctx.scene.enter('ORGANISER_SCENE');
}

eventSummaryWizard.action('cancel_wizard', cancel);
eventSummaryWizard.action('home', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));

module.exports = eventSummaryWizard;
