<<<<<<< HEAD
<<<<<<< HEAD
const { Scenes, Markup } = require('telegraf');
const { getEventsByOrganiser, getEventRegistrationCount } = require('./db/organiser');
=======
const { Scenes } = require('telegraf');
const { getEventsByOrganiser, getEventRegistrationCount } = require('../db/queries');
>>>>>>> 4499122 (Fix issues with sending alerts)

const eventSummaryWizard = new Scenes.WizardScene(
    'EVENT_SUMMARY_WIZARD',
    // Step 1: List user's events via buttons
=======
const { Scenes } = require('telegraf');
const { getEventsByOrganiser, getEventRegistrationCount } = require('../db/queries');

const eventSummaryWizard = new Scenes.WizardScene(
    'EVENT_SUMMARY_WIZARD',
    // Step 1: List user's events and ask for selection
>>>>>>> d530e99 (Add Supabase integration)
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
<<<<<<< HEAD
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

=======
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

            await ctx.replyWithMarkdownV2(summary);
        } catch (err) {
            console.error(err);
            ctx.reply('Error fetching registration data.');
        }

        return ctx.scene.leave();
    }
);

>>>>>>> d530e99 (Add Supabase integration)
module.exports = eventSummaryWizard;
