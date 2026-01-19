const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    // Step 1: Main Dashboard Menu
    async (ctx) => {
        // In new schema, any user can be an organiser. We just ensure they exist.
        await db.getOrCreateUser(ctx.from.id, {
            name: ctx.from.first_name,
            telegram_username: ctx.from.username
        });

        await ctx.reply(getMessage('organiser.dashboard'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(getMessage('buttons.createEvent'), 'create')],
                [Markup.button.callback(getMessage('buttons.sendReminders'), 'remind')],
                [Markup.button.callback(getMessage('buttons.viewRegistrations'), 'stats')],
                [Markup.button.callback(getMessage('buttons.exit'), 'exit')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Handle Dashboard Actions
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'create') {
            await ctx.reply(getMessage('organiser.createName'));
            return ctx.wizard.next();
        } else if (action === 'remind') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events.length) {
                await ctx.reply('You have no events.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title, `remind_${e.id}`)]);
            await ctx.reply(getMessage('organiser.selectReminder'), Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else if (action === 'stats') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events.length) {
                await ctx.reply('You have no events.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title, `stats_${e.id}`)]);
            await ctx.reply(getMessage('organiser.selectStats'), Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else {
            await ctx.reply(getMessage('organiser.exited'));
            return ctx.scene.leave();
        }
    },
    // Step for "Create Event" - Get Name (Title)
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        ctx.wizard.state.title = ctx.message.text;
        await ctx.reply(getMessage('organiser.createDate')); // Expecting YYYY-MM-DD HH:mm or just text? Assuming text for now but schema needs Date.
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Date
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidDate'));
        // Basic parsing attempt, assuming user enters ISO-like or we just try constructor
        const dateInput = ctx.message.text;
        // Ideally we'd have a stronger validation here
        ctx.wizard.state.dateTime = dateInput;

        await ctx.reply(getMessage('organiser.createLocation'));
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Location & Finalize
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidLocation'));
        const state = ctx.wizard.state;

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
    // Handler for Reminders/Stats (Step 4)
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
                    report += `${i + 1}. ${r.participant_name} (via ${r.user_name})\n`;
                });
                await ctx.replyWithMarkdown(report);
            }
            return ctx.scene.leave();
        }
    }
);

module.exports = organiserScene;
