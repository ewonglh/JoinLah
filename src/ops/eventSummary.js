const { Scenes } = require('telegraf');
const { getEventsByOrganiser, getEventRegistrationCount } = require('./db/organiser');

const eventSummaryWizard = new Scenes.WizardScene(
    'EVENT_SUMMARY_WIZARD',
    // Step 1: List user's events and ask for selection
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.leave();
            }

            ctx.wizard.state.events = events;
            let message = 'Select an event to view summary:\n\n';
            events.forEach((event, index) => {
                message += `${index + 1}. ${event.title} (${new Date(event.date_time).toLocaleDateString()})\n`;
            });

            ctx.reply(message);
            return ctx.wizard.next();
        } catch (err) {
            console.error(err);
            ctx.reply('Error fetching your events. Please try again later.');
            return ctx.scene.leave();
        }
    },
    // Step 2: Display Summary
    async (ctx) => {
        const selection = parseInt(ctx.message?.text);
        const events = ctx.wizard.state.events;

        if (isNaN(selection) || selection < 1 || selection > events.length) {
            ctx.reply('Invalid selection. Please enter a number from the list.');
            return;
        }

        const targetEvent = events[selection - 1];

        try {
            // Get registration count
            // Get registration count
            const count = await getEventRegistrationCount(targetEvent.id);

            const dateStr = new Date(targetEvent.date_time).toLocaleString();

            let summary = `📊 *Event Summary: ${targetEvent.title}*\n\n`;
            summary += `📅 *Date:* ${dateStr}\n`;
            summary += `📍 *Location:* ${targetEvent.location || 'N/A'}\n`;
            summary += `👥 *Signups:* ${count}${targetEvent.capacity ? ` / ${targetEvent.capacity}` : ''}\n`;

            if (targetEvent.description) {
                summary += `\n📝 *Description:* ${targetEvent.description}\n`;
            }

            await ctx.replyWithMarkdown(summary);
        } catch (err) {
            console.error(err);
            ctx.reply('Error fetching registration data.');
        }

        return ctx.scene.leave();
    }
);

module.exports = eventSummaryWizard;
