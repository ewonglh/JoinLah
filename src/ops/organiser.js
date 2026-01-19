const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
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
                [Markup.button.callback('📊 View Registrations', 'stats')],
                [Markup.button.callback('🔙 Exit', 'exit')]
            ])
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'create') {
            await ctx.reply('Please enter the NAME of the new event:');
            return ctx.wizard.next();
        } else if (action === 'remind') {
            const events = await db.getAllEvents();
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `remind_${e.id}`)]);
            await ctx.reply('Select event to send reminders for:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else if (action === 'stats') {
            const events = await db.getAllEvents();
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `stats_${e.id}`)]);
            await ctx.reply('Select event to view registrations:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else {
            await ctx.reply(getMessage('organiser.exited'));
            return ctx.scene.leave();
        }
    },
    // Step for "Create Event" - Get Name
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        ctx.wizard.state.newName = ctx.message.text;
        await ctx.reply('Please enter the DATE and TIME (YYYY-MM-DD HH:mm):');
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Date
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidDate'));
        ctx.wizard.state.newDate = ctx.message.text;
        await ctx.reply(getMessage('organiser.createLocation'));
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Location & Finalize
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidLocation'));
        const state = ctx.wizard.state;
        const newEvent = await db.createEvent({
            title: state.newName || state.title, // Handle both just in case
            dateTime: state.newDate || state.dateTime,
            location: ctx.message.text,
            organiserTelegramId: ctx.from.id,
            capacity: 100,
            description: 'Created via Wizard'
        });

        await ctx.replyWithMarkdown(`✅ *Event Created!*\n\n` +
            `ID: \`${newEvent.id}\`\n` +
            `Registration Link: \`https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}\``);
        return ctx.scene.leave();
    },
    // Unified Handler for Selection (Step 5)
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data.startsWith('remind_')) {
            const eventId = data.replace('remind_', '');
            const regs = await db.listRegistrationsForEvent(eventId);
            await ctx.reply(`✅ Reminders sent to all ${regs.length} people registered!`);
            return ctx.scene.leave();
        } else if (data.startsWith('stats_')) {
            const eventId = data.replace('stats_', '');
            const regs = await db.listRegistrationsForEvent(eventId);

            if (regs.length === 0) {
                await ctx.reply('No registrations yet.');
            } else {
                let report = `📊 *Registrations for Event ${eventId}*\n\n`;
                regs.forEach((r, i) => {
                    const name = r.user_name || r.participant_name || 'Unknown';
                    const role = r.status || 'Registered'; // API doesn't return role, use status
                    report += `${i + 1}. ${name} (${role})\n`;
                });
                await ctx.replyWithMarkdown(report);
            }
            return ctx.scene.leave();
        }
    },
    // Handler for Edit Field Selection (Step 6)
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const field = ctx.callbackQuery.data.replace('field_', '');
        await ctx.answerCbQuery();
        if (field === 'cancel') return ctx.scene.leave();
        ctx.wizard.state.editField = field;
        await ctx.reply(`Enter the new value for ${field}:`);
        return ctx.wizard.next();
    },
    // Handler for Edit Value Entry (Step 7)
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter text.');
        const val = ctx.message.text;
        const field = ctx.wizard.state.editField;
        const updates = {};
        updates[field] = field === 'capacity' ? parseInt(val) : val;

        await db.updateEvent(ctx.wizard.state.editId, updates);
        await ctx.reply('✅ Event updated successfully!');
        return ctx.scene.leave();
    }
);

module.exports = organiserScene;
