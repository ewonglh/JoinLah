const { Scenes, Markup } = require('telegraf');
const { getEventsByOrganiser, getRegistrationsForExport } = require('./db/organiser');
const ExcelJS = require('exceljs');

const exportWizard = new Scenes.WizardScene(
    'EXPORT_WIZARD',
    // Step 1: List user's events via buttons
    async (ctx) => {
        try {
            const events = await getEventsByOrganiser(ctx.from.id);

            if (!events || events.length === 0) {
                await ctx.reply('You haven\'t created any events yet.');
                return ctx.scene.enter('ORGANISER_SCENE');
            }

            const buttons = events.map(e => [Markup.button.callback(e.title, `exp_sel_${e.id}`)]);
            buttons.push([Markup.button.callback('❌ Cancel', 'cancel_wizard')]);

            await ctx.reply('📥 *Select an event to export signups:*', Markup.inlineKeyboard(buttons));
            return ctx.wizard.next();
        } catch (err) {
            console.error(err);
            await ctx.reply('Error fetching events.');
            return ctx.scene.enter('ORGANISER_SCENE');
        }
    },
    // Step 2: Handle selection and generate excel
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons.');
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data === 'cancel_wizard') return cancel(ctx);
        const eventId = data.replace('exp_sel_', '');

        const events = await getEventsByOrganiser(ctx.from.id);
        const target = events.find(e => e.id === eventId);

        if (!target) return ctx.scene.enter('ORGANISER_SCENE');

        try {
            await ctx.reply('⏳ Generating export file...');

            const registrations = await getRegistrationsForExport(target.id);
            if (!registrations || registrations.length === 0) {
                await ctx.reply('No registrations found for this event.',
                    Markup.inlineKeyboard([Markup.button.callback('🔙 Dashboard', 'home')])
                );
                return ctx.wizard.next();
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Participants');

            worksheet.columns = [
                { header: 'Participant Name', key: 'name', width: 25 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Notes', key: 'notes', width: 30 },
                { header: 'Signed By', key: 'signer', width: 20 },
                { header: 'Phone', key: 'phone', width: 15 }
            ];

            registrations.forEach(reg => {
                worksheet.addRow({
                    name: reg.participant_name,
                    status: reg.status,
                    notes: reg.notes || '',
                    signer: reg.users?.name || '',
                    phone: reg.users?.phone || ''
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const filename = `${target.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

            await ctx.replyWithDocument({ source: buffer, filename });
            await ctx.reply('✅ Export complete!',
                Markup.inlineKeyboard([Markup.button.callback('🔙 Back to Dashboard', 'home')])
            );

        } catch (err) {
            console.error(err);
            await ctx.reply('Error generating export.');
        }

        return ctx.wizard.next();
    },
    async (ctx) => {
        return ctx.scene.enter('ORGANISER_SCENE');
    }
);

async function cancel(ctx) {
    return ctx.scene.enter('ORGANISER_SCENE');
}

exportWizard.action('cancel_wizard', cancel);
exportWizard.action('home', (ctx) => ctx.scene.enter('ORGANISER_SCENE'));

module.exports = exportWizard;
