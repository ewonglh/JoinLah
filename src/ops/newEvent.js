const { Scenes } = require('telegraf');
const { createEvent } = require('../db/queries');

const newEventWizard = new Scenes.WizardScene(
    'NEW_EVENT_WIZARD',
    // Step 1: Ask for Event Title
    (ctx) => {
        ctx.reply('Welcome! Let\'s create a new event. What is the title of the event?');
        return ctx.wizard.next();
    },
    // Step 2: Record Title, Ask for Date
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply('Please provide a valid event title.');
            return;
        }
        ctx.wizard.state.title = ctx.message.text;
        ctx.reply('Got it. What is the event date? (Format: YYYY-MM-DD)');
        return ctx.wizard.next();
    },
    // Step 3: Record Date, Ask for Time
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply('Please provide a valid date.');
            return;
        }
        ctx.wizard.state.event_date = ctx.message.text;
        ctx.reply('And what time will it be? (Format: HH:mm)');
        return ctx.wizard.next();
    },
    // Step 4: Record Time, Ask for Location
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply('Please provide a valid time.');
            return;
        }
        ctx.wizard.state.event_time = ctx.message.text;
        ctx.reply('Where will the event be held? (Location)');
        return ctx.wizard.next();
    },
    // Step 5: Record Location, Ask for Capacity
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply('Please provide a valid location.');
            return;
        }
        ctx.wizard.state.location = ctx.message.text;
        ctx.reply('What is the maximum capacity for this event? (Number)');
        return ctx.wizard.next();
    },
    // Step 6: Record Capacity, Ask for Description
    (ctx) => {
        if (!ctx.message || !ctx.message.text || isNaN(parseInt(ctx.message.text))) {
            ctx.reply('Please provide a valid number for capacity.');
            return;
        }
        ctx.wizard.state.capacity = parseInt(ctx.message.text);
        ctx.reply('Please provide a short description for the event.');
        return ctx.wizard.next();
    },
    // Step 7: Record Description, Ask for Photo
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply('Please provide a valid description.');
            return;
        }
        ctx.wizard.state.description = ctx.message.text;
        ctx.reply('Now, please send a photo/poster for the event.');
        return ctx.wizard.next();
    },
    // Step 8: Record Photo and Save
    async (ctx) => {
        let imageUrl = null;
        if (ctx.message && ctx.message.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            imageUrl = photo.file_id; // For simplicity, storing file_id as image_url
        } else {
            ctx.reply('No photo received. Leaving it blank.');
        }

        ctx.reply('Saving your event...');

        try {
            // Combine date and time into one timestamp
            const dateTime = new Date(`${ctx.wizard.state.event_date}T${ctx.wizard.state.event_time}:00Z`).toISOString();

            await createEvent({
                title: ctx.wizard.state.title,
                organiserTelegramId: ctx.from.id,
                dateTime,
                location: ctx.wizard.state.location,
                capacity: ctx.wizard.state.capacity,
                description: ctx.wizard.state.description,
                image_url: imageUrl
            });

            ctx.reply('Success! Your event has been created and stored in the database.');

        } catch (err) {
            console.error(err);
            ctx.reply(`Error saving event: ${err.message}`);
        }

        return ctx.scene.leave();
    }
);

module.exports = newEventWizard;
