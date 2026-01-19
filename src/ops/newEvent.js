const { Scenes, Markup } = require('telegraf');
const { createEvent } = require('./db/organiser');

const newEventWizard = new Scenes.WizardScene(
    'NEW_EVENT_WIZARD',
    // Step 1: Ask for Event Title
    (ctx) => {
        ctx.reply('🆕 *New Event Signup*\n\nWhat is the title of the event?',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 2: Record Title, Ask for Date
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please provide a valid event title.');

        ctx.wizard.state.title = ctx.message.text;
        ctx.reply('📅 What is the event date? (Format: YYYY-MM-DD)',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 3: Record Date, Ask for Time
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please provide a valid date.');

        ctx.wizard.state.event_date = ctx.message.text;
        ctx.reply('⏰ And what time will it be? (Format: HH:mm)',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 4: Record Time, Ask for Location
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please provide a valid time.');

        ctx.wizard.state.event_time = ctx.message.text;
        ctx.reply('📍 Where will the event be held?',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 5: Record Location, Ask for Capacity
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please provide a valid location.');

        ctx.wizard.state.location = ctx.message.text;
        ctx.reply('👥 What is the maximum capacity?',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 6: Record Capacity, Ask for Description
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text || isNaN(parseInt(ctx.message.text))) {
            return ctx.reply('Please provide a valid number for capacity.');
        }
        ctx.wizard.state.capacity = parseInt(ctx.message.text);
        ctx.reply('📝 Please provide a short description:',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 7: Record Description, Ask for Photo
    (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please provide a valid description.');

        ctx.wizard.state.description = ctx.message.text;
        ctx.reply('🖼️ Finally, send a photo or poster (or send /skip):',
            Markup.inlineKeyboard([Markup.button.callback('❌ Cancel', 'cancel_wizard')])
        );
        return ctx.wizard.next();
    },
    // Step 8: Record Photo and Save
    async (ctx) => {
        if (ctx.callbackQuery?.data === 'cancel_wizard') return cancel(ctx);

        let imageUrl = null;
        if (ctx.message && ctx.message.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            imageUrl = photo.file_id;
        }

        await ctx.reply('⏳ Saving your event...');

        try {
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

            await ctx.reply('✅ Success! Your event has been created.',
                Markup.inlineKeyboard([Markup.button.callback('🔙 Back to Dashboard', 'home')])
            );

        } catch (err) {
            console.error(err);
            await ctx.reply(`❌ Error saving: ${err.message}`,
                Markup.inlineKeyboard([Markup.button.callback('🔙 Dashboard', 'home')])
            );
        }

        return ctx.wizard.next();
    },
    // Final Step: Return to Dashboard
    async (ctx) => {
        return ctx.scene.enter('ORGANISER_SCENE');
    }
);

async function cancel(ctx) {
    await ctx.answerCbQuery('Action cancelled');
    await ctx.reply('❌ Creation cancelled.');
    return ctx.scene.enter('ORGANISER_SCENE');
}

// Global action handler for the wizard
newEventWizard.action('cancel_wizard', cancel);
newEventWizard.action('home', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));

module.exports = newEventWizard;
