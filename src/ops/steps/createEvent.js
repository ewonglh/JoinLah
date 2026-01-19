const db = require('../../db/queries');
const { getMessage } = require('../../utils/messages');
const { generateCalendar, parseCalendarCallback } = require('../../utils/calendar');
const { generateTimePicker, parseTimeCallback } = require('../../utils/timePicker');

/**
 * STEP 2: Create Event - Get Name
 */
async function getEventName(ctx) {
    if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
    ctx.wizard.state.newName = ctx.message.text;

    // Show calendar picker
    const now = new Date();
    ctx.wizard.state.calendarYear = now.getFullYear();
    ctx.wizard.state.calendarMonth = now.getMonth();

    await ctx.reply('📅 Select event date:', generateCalendar(ctx.wizard.state.calendarYear, ctx.wizard.state.calendarMonth));
    return ctx.wizard.next();
}

/**
 * STEP 3: Create Event - Calendar Navigation
 */
async function handleCalendarNavigation(ctx) {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    const parsed = parseCalendarCallback(data);

    if (!parsed || parsed.action === 'ignore') {
        return; // Do nothing for ignored buttons
    }

    if (parsed.action === 'cancel') {
        await ctx.reply('Event creation cancelled.');
        return ctx.scene.leave();
    }

    if (parsed.action === 'navigate') {
        ctx.wizard.state.calendarYear = parsed.year;
        ctx.wizard.state.calendarMonth = parsed.month;
        await ctx.editMessageText('📅 Select event date:', generateCalendar(parsed.year, parsed.month));
        return; // Stay on same step
    }

    if (parsed.action === 'select') {
        ctx.wizard.state.selectedYear = parsed.year;
        ctx.wizard.state.selectedMonth = parsed.month;
        ctx.wizard.state.selectedDay = parsed.day;

        await ctx.editMessageText(`✅ Date selected: ${parsed.year}-${(parsed.month + 1).toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`);
        await ctx.reply('🕐 Select event time:', generateTimePicker());
        return ctx.wizard.next();
    }
}

/**
 * STEP 4: Create Event - Time Picker
 */
async function handleTimePicker(ctx) {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    const parsed = parseTimeCallback(data);

    if (!parsed || parsed.action === 'ignore') {
        return;
    }

    if (parsed.action === 'cancel') {
        await ctx.reply('Event creation cancelled.');
        return ctx.scene.leave();
    }

    if (parsed.action === 'back') {
        ctx.wizard.state.selectedHour = null;
        ctx.wizard.state.selectedMinute = null;
        await ctx.editMessageText('🕐 Select event time:', generateTimePicker());
        return;
    }

    if (parsed.action === 'hour') {
        ctx.wizard.state.selectedHour = parsed.hour;
        await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour));
        return;
    }

    if (parsed.action === 'minute') {
        ctx.wizard.state.selectedHour = parsed.hour;
        ctx.wizard.state.selectedMinute = parsed.minute;
        await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour, parsed.minute));
        return;
    }

    if (parsed.action === 'confirm') {
        const dateStr = `${ctx.wizard.state.selectedYear}-${(ctx.wizard.state.selectedMonth + 1).toString().padStart(2, '0')}-${ctx.wizard.state.selectedDay.toString().padStart(2, '0')}`;
        const timeStr = `${parsed.hour.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')}`;
        ctx.wizard.state.newDate = `${dateStr} ${timeStr}`;

        await ctx.editMessageText(`✅ Time selected: ${timeStr}`);
        await ctx.reply('📍 Please enter the *LOCATION* of the event:', { parse_mode: 'Markdown' });
        return ctx.wizard.next();
    }
}

/**
 * STEP 5: Create Event - Get Location
 */
async function getEventLocation(ctx) {
    if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidLocation'));
    ctx.wizard.state.newLocation = ctx.message.text;

    await ctx.reply('📝 Please enter a *DESCRIPTION* for the event:\n\n_This will be shown to participants when they register._', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
}

const { Markup } = require('telegraf');

/**
 * STEP 6: Create Event - Get Description
 */
async function getEventDescription(ctx) {
    if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid description.');
    ctx.wizard.state.newDescription = ctx.message.text;

    await ctx.reply('🖼️ (Optional) Send a photo/poster for the event, or click "Skip".',
        Markup.inlineKeyboard([
            Markup.button.callback('Skip', 'skip_photo')
        ])
    );
    return ctx.wizard.next();
}

/**
 * STEP 7: Create Event - Get Photo
 */
async function getEventPhoto(ctx) {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'skip_photo') {
        await ctx.answerCbQuery();
        ctx.wizard.state.newImage = null;
        await ctx.reply('Skipped photo.');
    } else if (ctx.message && ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get highest resolution
        ctx.wizard.state.newImage = photo.file_id;
        await ctx.reply('✅ Photo received.');
    } else if (ctx.message && ctx.message.text) {
        // If they sent text instead of photo (and it wasn't a callback), assume it might be a URL or just invalid
        // For simplicity, let's just treat text as a skip if they didn't use the button, or better, ask again?
        // Let's assume text is a URL or just ignore and skip if not a photo for now to keep flow moving,
        // or strictly require photo/skip. Let's strictly require valid input.
        // Actually, let's allow image URL as text too.
        ctx.wizard.state.newImage = ctx.message.text;
        await ctx.reply('✅ Image URL received.');
    } else {
        return ctx.reply('Please send a photo, an image URL, or click "Skip".');
    }

    await ctx.reply('👥 Please enter the *CAPACITY* (maximum number of participants):\n\n_Enter a number, e.g. 50_', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
}

/**
 * STEP 8: Create Event - Get Capacity & Finalize
 */
async function getEventCapacityAndFinalize(ctx) {
    if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid number.');

    const capacity = parseInt(ctx.message.text);
    if (isNaN(capacity) || capacity <= 0) {
        return ctx.reply('❌ Please enter a valid positive number for capacity.');
    }

    const state = ctx.wizard.state;

    try {
        const newEvent = await db.createEvent({
            title: state.newName,
            dateTime: state.newDate,
            location: state.newLocation,
            organiserTelegramId: ctx.from.id,
            capacity: capacity,
            description: state.newDescription,
            image_url: state.newImage
        });

        const caption = `✅ *Event Created Successfully!*\n\n` +
            `📌 *Name:* ${state.newName}\n` +
            `📅 *Date:* ${state.newDate}\n` +
            `📍 *Location:* ${state.newLocation}\n` +
            `👥 *Capacity:* ${capacity}\n` +
            `📝 *Description:* ${state.newDescription}\n\n` +
            `🔗 *Registration Link:*\n\`https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}\``;

        if (state.newImage && !state.newImage.startsWith('http')) {
            // Assume file_id
            await ctx.replyWithPhoto(state.newImage, { caption, parse_mode: 'Markdown' });
        } else if (state.newImage) {
            // Assume URL
            await ctx.replyWithPhoto({ url: state.newImage }, { caption, parse_mode: 'Markdown' }).catch(async () => {
                // If URL fails, send text only
                await ctx.replyWithMarkdown(caption);
            });
        } else {
            await ctx.replyWithMarkdown(caption);
        }

    } catch (error) {
        console.error('Event creation error:', error);
        await ctx.reply('❌ Failed to create event. Please try again.');
    }

    return ctx.scene.leave();
}

module.exports = {
    getEventName,
    handleCalendarNavigation,
    handleTimePicker,
    getEventLocation,
    getEventDescription,
    getEventPhoto,
    getEventCapacityAndFinalize
};
