const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');
const { generateCalendar, parseCalendarCallback } = require('../utils/calendar');
const { generateTimePicker, parseTimeCallback } = require('../utils/timePicker');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    // Step 0: Dashboard
    async (ctx) => {
        // In new schema, any user can be an organiser. We just ensure they exist.
        await db.getOrCreateUser(ctx.from.id, {
            name: ctx.from.first_name,
            telegram_username: ctx.from.username
        });

        await ctx.reply(getMessage('organiser.dashboard'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🆕 Create New Event', 'create')],
                [Markup.button.callback('📢 Send Reminders', 'remind')],
                [Markup.button.callback('📊 View Registrations', 'stats')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 1: Handle dashboard action selection
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'create') {
            await ctx.reply(getMessage('organiser.createName'));
            return ctx.wizard.next();
        } else if (action === 'remind') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `remind_${e.id}`)]);
            await ctx.reply('Select event to send reminders for:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(8); // Jump to unified handler
        } else if (action === 'stats') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `stats_${e.id}`)]);
            await ctx.reply('Select event to view registrations:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(8); // Jump to unified handler
        } else {
            await ctx.reply(getMessage('organiser.exited'));
            return ctx.scene.leave();
        }
    },
    // Step 2: Get event name
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        ctx.wizard.state.newName = ctx.message.text;

        // Show calendar picker
        const now = new Date();
        ctx.wizard.state.calendarYear = now.getFullYear();
        ctx.wizard.state.calendarMonth = now.getMonth();

        await ctx.reply('📅 Select event date:', generateCalendar(ctx.wizard.state.calendarYear, ctx.wizard.state.calendarMonth));
        return ctx.wizard.next();
    },
    // Step 3: Handle calendar navigation and date selection
    async (ctx) => {
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
            // Update calendar display
            ctx.wizard.state.calendarYear = parsed.year;
            ctx.wizard.state.calendarMonth = parsed.month;

            await ctx.editMessageText('📅 Select event date:', generateCalendar(parsed.year, parsed.month));
            return; // Stay on same step
        }

        if (parsed.action === 'select') {
            // Date selected, move to time picker
            ctx.wizard.state.selectedYear = parsed.year;
            ctx.wizard.state.selectedMonth = parsed.month;
            ctx.wizard.state.selectedDay = parsed.day;

            await ctx.editMessageText(`✅ Date selected: ${parsed.year}-${(parsed.month + 1).toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`);
            await ctx.reply('🕐 Select event time:', generateTimePicker());
            return ctx.wizard.next();
        }
    },
    // Step 4: Handle time picker
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const parsed = parseTimeCallback(data);

        if (!parsed || parsed.action === 'ignore') {
            return; // Do nothing for ignored buttons
        }

        if (parsed.action === 'cancel') {
            await ctx.reply('Event creation cancelled.');
            return ctx.scene.leave();
        }

        if (parsed.action === 'back') {
            // Reset to hour selection
            ctx.wizard.state.selectedHour = null;
            ctx.wizard.state.selectedMinute = null;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker());
            return;
        }

        if (parsed.action === 'hour') {
            // Hour selected, show minute picker
            ctx.wizard.state.selectedHour = parsed.hour;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour));
            return;
        }

        if (parsed.action === 'minute') {
            // Minute selected, show confirmation
            ctx.wizard.state.selectedHour = parsed.hour;
            ctx.wizard.state.selectedMinute = parsed.minute;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour, parsed.minute));
            return;
        }

        if (parsed.action === 'confirm') {
            // Time confirmed, move to location
            const dateStr = `${ctx.wizard.state.selectedYear}-${(ctx.wizard.state.selectedMonth + 1).toString().padStart(2, '0')}-${ctx.wizard.state.selectedDay.toString().padStart(2, '0')}`;
            const timeStr = `${parsed.hour.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')}`;
            ctx.wizard.state.newDate = `${dateStr} ${timeStr}`;

            await ctx.editMessageText(`✅ Time selected: ${timeStr}`);
            await ctx.reply(getMessage('organiser.createLocation'));
            return ctx.wizard.next();
        }
    },
    // Step 5: Get location and finalize event creation
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidLocation'));
        const state = ctx.wizard.state;
        const newEvent = await db.createEvent({
            title: state.newName || state.title,
            dateTime: state.newDate || state.dateTime,
            location: ctx.message.text,
            organiserTelegramId: ctx.from.id,
            capacity: 100,
            description: 'Created via Wizard'
        });

        try {
            // Try to construct a valid date
            const dateObj = new Date(state.dateTime);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid Date');
            }

            const newEvent = await db.createEvent({
                title: state.title,
                organiserTelegramId: ctx.from.id,
                dateTime: dateObj.toISOString(),
                location: ctx.message.text,
                capacity: 100, // Default capacity
                description: 'Created via Wizard'
            });

            await ctx.replyWithMarkdown(getMessage('organiser.created', {
                id: newEvent.id,
                link: `https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}`
            }));
        } catch (e) {
            await ctx.reply('Failed to create event. Please ensure date is valid (YYYY-MM-DD HH:mm) and try again.');
            console.error(e);
        }
        return ctx.scene.leave();
    },
    // Step 6: Unused (placeholder for future edit features)
    async (ctx) => {
        return ctx.scene.leave();
    },
    // Step 7: Unused (placeholder for future edit features)
    async (ctx) => {
        return ctx.scene.leave();
    },
    // Step 8: Unified Handler for Reminders and Stats
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data.startsWith('remind_')) {
            const eventId = data.replace('remind_', '');
            const regs = await db.listRegistrationsForEvent(eventId);
            await ctx.reply(getMessage('organiser.remindersSent', { count: regs.length }));
            return ctx.scene.leave();
        } else if (data.startsWith('stats_')) {
            const eventId = data.replace('stats_', '');
            const regs = await db.listRegistrationsForEvent(eventId);

            if (regs.length === 0) {
                await ctx.reply(getMessage('organiser.noRegistrations'));
            } else {
                let report = getMessage('organiser.statsHeader', { eventId });
                regs.forEach((r, i) => {
                    const name = r.user_name || r.participant_name || 'Unknown';
                    const role = r.status || 'Registered';
                    report += `${i + 1}. ${name} (${role})\n`;
                });
                await ctx.replyWithMarkdown(report);
            }
            return ctx.scene.leave();
        }
    }
);

module.exports = organiserScene;
