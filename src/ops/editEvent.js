const { Scenes } = require('telegraf');
const { getEventsByOrganiser, updateEvent } = require('../db/queries');

const editEventWizard = new Scenes.WizardScene(
    'EDIT_EVENT_WIZARD',
    // Step 1: List user's events and ask for selection
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.leave();
            }

            ctx.wizard.state.events = events;
            let message = 'Select an event to edit by typing its number:\n\n';
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
    // Step 2: Record selection, Prompt for Title
    (ctx) => {
        const selection = parseInt(ctx.message?.text);
        const events = ctx.wizard.state.events;

        if (isNaN(selection) || selection < 1 || selection > events.length) {
            ctx.reply('Invalid selection. Please enter a number from the list.');
            return;
        }

        ctx.wizard.state.targetEvent = events[selection - 1];
        ctx.wizard.state.updates = {};

        ctx.reply(`Editing: "${ctx.wizard.state.targetEvent.title}"\n\nCurrent Title: ${ctx.wizard.state.targetEvent.title}\n\nEnter a new title or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 3: Record Title, Prompt for Date
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            ctx.wizard.state.updates.title = ctx.message.text;
        }
        const currentEvent = ctx.wizard.state.targetEvent;
        const currentDate = new Date(currentEvent.date_time).toISOString().split('T')[0];
        ctx.reply(`Current Date: ${currentDate}\n\nEnter a new date (YYYY-MM-DD) or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 4: Record Date, Prompt for Time
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            ctx.wizard.state.event_date = ctx.message.text;
        }
        const currentEvent = ctx.wizard.state.targetEvent;
        const currentTime = new Date(currentEvent.date_time).toISOString().split('T')[1].substring(0, 5);
        ctx.reply(`Current Time: ${currentTime}\n\nEnter a new time (HH:mm) or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 5: Record Time, Prompt for Location
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            ctx.wizard.state.event_time = ctx.message.text;
        }
        ctx.reply(`Current Location: ${ctx.wizard.state.targetEvent.location}\n\nEnter a new location or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 6: Record Location, Prompt for Capacity
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            ctx.wizard.state.updates.location = ctx.message.text;
        }
        ctx.reply(`Current Capacity: ${ctx.wizard.state.targetEvent.capacity}\n\nEnter a new capacity (Number) or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 7: Record Capacity, Prompt for Description
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            const capacity = parseInt(ctx.message.text);
            if (isNaN(capacity)) {
                ctx.reply('Please enter a valid number for capacity.');
                return;
            }
            ctx.wizard.state.updates.capacity = capacity;
        }
        ctx.reply(`Current Description: ${ctx.wizard.state.targetEvent.description}\n\nEnter a new description or send /skip.`);
        return ctx.wizard.next();
    },
    // Step 8: Record Description, Prompt for Photo
    (ctx) => {
        if (ctx.message?.text !== '/skip') {
            ctx.wizard.state.updates.description = ctx.message.text;
        }
        ctx.reply('Send a new photo/poster or send /skip.');
        return ctx.wizard.next();
    },
    // Step 9: Record Photo and Save Updates
    async (ctx) => {
        if (ctx.message?.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            ctx.wizard.state.updates.image_url = photo.file_id;
        }

        // Handle combined date/time update
        if (ctx.wizard.state.event_date || ctx.wizard.state.event_time) {
            const currentEvent = ctx.wizard.state.targetEvent;
            const currentFullDate = new Date(currentEvent.date_time).toISOString();
            const [d, t] = currentFullDate.split('T');

            const date = ctx.wizard.state.event_date || d;
            const time = ctx.wizard.state.event_time || t.substring(0, 5);

            ctx.wizard.state.updates.date_time = new Date(`${date}T${time}:00Z`).toISOString();
        }

        if (Object.keys(ctx.wizard.state.updates).length === 0) {
            ctx.reply('No changes were made.');
            return ctx.scene.leave();
        }

        ctx.reply('Updating your event...');

        try {
            await updateEvent(ctx.wizard.state.targetEvent.id, ctx.wizard.state.updates);

            ctx.reply('Success! Your event has been updated.');
        } catch (err) {
            console.error(err);
            ctx.reply(`Error updating event: ${err.message}`);
        }

        return ctx.scene.leave();
    }
);

module.exports = editEventWizard;
