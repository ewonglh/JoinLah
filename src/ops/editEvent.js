const { Scenes, Markup } = require('telegraf');
const { getEventsByOrganiser, updateEvent } = require('./db/organiser');

const editEventWizard = new Scenes.WizardScene(
    'EDIT_EVENT_WIZARD',
    // Step 1: List user's events via buttons
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                await ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.enter('ORGANISER_SCENE');
            }

            const buttons = events.map(e => [Markup.button.callback(e.title, `edit_sel_${e.id}`)]);
            buttons.push([Markup.button.callback('❌ Cancel', 'cancel_wizard')]);

            await ctx.reply('✏️ *Select an event to edit:*', Markup.inlineKeyboard(buttons));
            return ctx.wizard.next();
        } catch (err) {
            console.error(err);
            await ctx.reply('Error fetching your events.');
            return ctx.scene.enter('ORGANISER_SCENE');
        }
    },
    // Step 2: Handle selection, Prompt for Title
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons.');
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data === 'cancel_wizard') return cancel(ctx);
        const eventId = data.replace('edit_sel_', '');

        const events = await getEventsByOrganiser(ctx.from.id);
        const target = events.find(e => e.id === eventId);

        if (!target) return ctx.scene.enter('ORGANISER_SCENE');

        ctx.wizard.state.targetEvent = target;
        ctx.wizard.state.updates = {};

        await ctx.reply(`Editing: *${target.title}*\n\nEnter new title (or /skip):`,
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 3: Record Title, Prompt for Date
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            ctx.wizard.state.updates.title = ctx.message.text;
        }

        const currentEvent = ctx.wizard.state.targetEvent;
        const currentDate = new Date(currentEvent.date_time).toISOString().split('T')[0];

        await ctx.reply(`📅 Current Date: ${currentDate}\n\nEnter new date (YYYY-MM-DD) or /skip:`,
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 4: Record Date, Prompt for Time
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            ctx.wizard.state.event_date = ctx.message.text;
        }

        const currentEvent = ctx.wizard.state.targetEvent;
        const currentTime = new Date(currentEvent.date_time).toISOString().split('T')[1].substring(0, 5);

        await ctx.reply(`⏰ Current Time: ${currentTime}\n\nEnter new time (HH:mm) or /skip:`,
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 5: Record Time, Prompt for Location
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            ctx.wizard.state.event_time = ctx.message.text;
        }

        await ctx.reply(`📍 Current Location: ${ctx.wizard.state.targetEvent.location}\n\nEnter new location or /skip:`,
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 6: Record Location, Prompt for Capacity
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            ctx.wizard.state.updates.location = ctx.message.text;
        }

        await ctx.reply(`👥 Current Capacity: ${ctx.wizard.state.targetEvent.capacity}\n\nEnter new capacity (Number) or /skip:`,
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 7: Record Capacity, Prompt for Description
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            const cap = parseInt(ctx.message.text);
            if (!isNaN(cap)) ctx.wizard.state.updates.capacity = cap;
        }

        await ctx.reply('📝 Enter new description (or /skip):',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 8: Finalize and Save
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (ctx.message?.text && ctx.message.text !== '/skip') {
            ctx.wizard.state.updates.description = ctx.message.text;
        }

        // Handle combined date/time
        if (ctx.wizard.state.event_date || ctx.wizard.state.event_time) {
            const current = ctx.wizard.state.targetEvent;
            const fullStr = new Date(current.date_time).toISOString();
            const [d, t] = fullStr.split('T');
            const date = ctx.wizard.state.event_date || d;
            const time = ctx.wizard.state.event_time || t.substring(0, 5);
            ctx.wizard.state.updates.date_time = new Date(`${date}T${time}:00Z`).toISOString();
        }

        if (Object.keys(ctx.wizard.state.updates).length === 0) {
            await ctx.reply('No changes made.');
            return ctx.scene.enter('ORGANISER_SCENE');
        }

        try {
            await updateEvent(ctx.wizard.state.targetEvent.id, ctx.wizard.state.updates);
            await ctx.reply('✅ Event updated successfully!',
                Markup.inlineKeyboard([Markup.button.callback('🔙 Dashboard', 'home')])
            );
        } catch (err) {
            console.error(err);
            await ctx.reply('❌ Error updating event.');
        }
        return ctx.wizard.next();
    },
    // Exit handler
    async (ctx) => {
        return ctx.scene.enter('ORGANISER_SCENE');
    }
);

async function cancel(ctx) {
    await ctx.answerCbQuery('Action cancelled');
    return ctx.scene.enter('ORGANISER_SCENE');
}

editEventWizard.action('cancel_wizard', cancel);
editEventWizard.action('home', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));

module.exports = editEventWizard;
