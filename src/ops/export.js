const { Scenes } = require('telegraf');
const { getEventsByOrganiser, getRegistrationsForExport } = require('../db/queries');
const ExcelJS = require('exceljs');

const exportWizard = new Scenes.WizardScene(
    'EXPORT_WIZARD',
    // Step 1: List user's events and ask for selection
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.leave();
            }

            ctx.wizard.state.events = events;
            let message = 'Select an event to export participants:\n\n';
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
    // Step 2: Fetch participants and export
    async (ctx) => {
        const selection = parseInt(ctx.message?.text);
        const events = ctx.wizard.state.events;

        if (isNaN(selection) || selection < 1 || selection > events.length) {
            ctx.reply('Invalid selection. Please enter a number from the list.');
            return;
        }

        const targetEvent = events[selection - 1];

        try {
            ctx.reply('Generating export file...');

            // Fetch all participants for the selected event
            // Fetch all participants for the selected event
            const registrations = await getRegistrationsForExport(targetEvent.id);

            if (!registrations || registrations.length === 0) {
                ctx.reply('There are no signups for this event yet.');
                return ctx.scene.leave();
            }

            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Participants');

            // Define columns
            worksheet.columns = [
                { header: 'Participant Name', key: 'name', width: 25 },
                { header: 'Age', key: 'age', width: 10 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Notes', key: 'notes', width: 30 },
                { header: 'Registered At', key: 'registered_at', width: 20 },
                { header: 'Signer Name', key: 'signer_name', width: 20 },
                { header: 'Signer Username', key: 'signer_user', width: 20 },
                { header: 'Signer Phone', key: 'signer_phone', width: 20 },
                { header: 'Signer Email', key: 'signer_email', width: 25 }
            ];

            // Format data for ExcelJS
            const rows = registrations.map(reg => ({
                name: reg.participant_name,
                age: reg.participant_age,
                status: reg.status,
                notes: reg.notes || '',
                registered_at: new Date(reg.created_at).toLocaleString(),
                signer_name: reg.users?.name || '',
                signer_user: reg.users?.telegram_username ? `@${reg.users.telegram_username}` : '',
                signer_phone: reg.users?.phone || '',
                signer_email: reg.users?.email || ''
            }));

            // Add rows
            worksheet.addRows(rows);

            // Style header row (optional but nice)
            worksheet.getRow(1).font = { bold: true };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Send to Telegram
            const filename = `${targetEvent.title.replace(/[^a-z0-9]/gi, '_')}_signups.xlsx`;
            await ctx.replyWithDocument({ source: buffer, filename: filename });

        } catch (err) {
            console.error(err);
            ctx.reply(`Error exporting data: ${err.message}`);
        }

        return ctx.scene.leave();
    }
);

module.exports = exportWizard;
