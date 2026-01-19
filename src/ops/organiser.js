const { Scenes, Markup } = require('telegraf');
const db = require('./db/organiser');
const ExcelJS = require('exceljs'); // For export

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
                [Markup.button.callback('📊 View Registrations', 'stats')],
                [Markup.button.callback('✏️ Edit My Events', 'edit')],
                [Markup.button.callback('🌐 Browse All Events', 'all_events')],
                [Markup.button.callback('📥 Export Signups', 'export_file')],
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
            await ctx.reply('Please enter the TITLE of the new event:');
            return ctx.wizard.next();
        } else if (action === 'stats') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (events.length === 0) return ctx.reply('No events found.');
            const buttons = events.map(e => [Markup.button.callback(e.title, `stats_${e.id}`)]);
            await ctx.reply('Select event for stats:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(5); // Shared handler
        } else if (action === 'edit') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (events.length === 0) return ctx.reply('No events found.');
            const buttons = events.map(e => [Markup.button.callback(e.title, `edit_sel_${e.id}`)]);
            await ctx.reply('Select event to edit:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(5);
        } else if (action === 'all_events') {
            const events = await db.getAllEvents();
            let msg = '🌐 *All System Events*\n\n';
            events.forEach((e, i) => msg += `${i + 1}. ${e.title} (${e.location || 'No Loc'})\n`);
            await ctx.replyWithMarkdown(msg);
            return ctx.scene.leave();
        } else if (action === 'export_file') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (events.length === 0) return ctx.reply('No events found.');
            const buttons = events.map(e => [Markup.button.callback(e.title, `export_dl_${e.id}`)]);
            await ctx.reply('Select event to export:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(5);
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

        try {
            const newEvent = await db.createEvent({
                title: state.newName,
                organiserTelegramId: ctx.from.id,
                dateTime: new Date(state.newDate).toISOString(),
                location: ctx.message.text
            });

            await ctx.replyWithMarkdown(`✅ *Event Created!*\n\n` +
                `ID: \`${newEvent.id}\`\n` +
                `Registration Link: \`https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}\``);
        } catch (err) {
            console.error(err);
            await ctx.reply('❌ Error creating event. Check date format (YYYY-MM-DD).');
        }
        return ctx.scene.leave();
    },
    // Unified Handler for Selection (Step 5)
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data.startsWith('stats_')) {
            const eventId = data.replace('stats_', '');
            const regs = await db.listRegistrationsForEvent(eventId);
            const count = await db.getEventRegistrationCount(eventId);
            let report = `📊 *Stats for Event* (${count} signups):\n\n`;
            regs.forEach((r, i) => report += `${i + 1}. ${r.participant_name}\n`);
            await ctx.replyWithMarkdown(report);
            return ctx.scene.leave();
        } else if (data.startsWith('edit_sel_')) {
            ctx.wizard.state.editId = data.replace('edit_sel_', '');
            await ctx.reply('What would you like to update?', Markup.inlineKeyboard([
                [Markup.button.callback('Title', 'field_title'), Markup.button.callback('Location', 'field_location')],
                [Markup.button.callback('Capacity', 'field_capacity'), Markup.button.callback('Done', 'cancel')]
            ]));
            return ctx.wizard.next();
        } else if (data.startsWith('export_dl_')) {
            const eventId = data.replace('export_dl_', '');
            const registrations = await db.getRegistrationsForExport(eventId);
            if (registrations.length === 0) return ctx.reply('No data to export.');

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Signups');
            sheet.columns = [
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            registrations.forEach(r => sheet.addRow({ name: r.participant_name, status: r.status }));
            const buffer = await workbook.xlsx.writeBuffer();
            await ctx.replyWithDocument({ source: buffer, filename: `export_${eventId}.xlsx` });
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
