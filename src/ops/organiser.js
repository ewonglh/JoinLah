const { Scenes, Markup } = require('telegraf');
const db = require('./db/organiser');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    async (ctx) => {
        if (!(await db.isAdmin(ctx.from.id))) {
            await ctx.reply('⛔ Access denied. You are not an organiser.');
            return ctx.scene.leave();
        }

        await ctx.reply('🛠️ *Organiser Dashboard*', {
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
            const buttons = events.map(e => [Markup.button.callback(e.name, `remind_${e.id}`)]);
            await ctx.reply('Select event to send reminders for:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else if (action === 'stats') {
            const events = await db.getAllEvents();
            const buttons = events.map(e => [Markup.button.callback(e.name, `stats_${e.id}`)]);
            await ctx.reply('Select event to view registrations:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
        } else {
            await ctx.reply('Exited dashboard.');
            return ctx.scene.leave();
        }
    },
    // Step for "Create Event" - Get Name
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid name.');
        ctx.wizard.state.newName = ctx.message.text;
        await ctx.reply('Great! Now enter the DATE of the event (e.g. 2026-03-20):');
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Date
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid date.');
        ctx.wizard.state.newDate = ctx.message.text;
        await ctx.reply('Last step: Enter the LOCATION:');
        return ctx.wizard.next();
    },
    // Step for "Create Event" - Get Location & Finalize
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid location.');
        const state = ctx.wizard.state;
        const newEvent = await db.createEvent({
            name: state.newName,
            date: state.newDate,
            location: ctx.message.text
        });

        await ctx.replyWithMarkdown(`✅ *Event Created!*\n\n` +
            `ID: \`${newEvent.id}\`\n` +
            `Registration Link: \`https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}\``);
        return ctx.scene.leave();
    },
    // Handler for Reminders/Stats (Step 4)
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data.startsWith('remind_')) {
            const eventId = data.replace('remind_', '');
            const regs = await db.getRegistrationsForEvent(eventId);
            await ctx.reply(`✅ Reminders sent to all ${regs.length} people registered!`);
            return ctx.scene.leave();
        } else if (data.startsWith('stats_')) {
            const eventId = data.replace('stats_', '');
            const regs = await db.getRegistrationsForEvent(eventId);

            if (regs.length === 0) {
                await ctx.reply('No registrations yet.');
            } else {
                let report = `📊 *Registrations for Event ${eventId}*\n\n`;
                regs.forEach((r, i) => {
                    report += `${i + 1}. ${r.user.firstName} (${r.role === 'organiser' ? 'Organiser' : 'Beneficiary'})\n`;
                });
                await ctx.replyWithMarkdown(report);
            }
            return ctx.scene.leave();
        }
    }
);

module.exports = organiserScene;
