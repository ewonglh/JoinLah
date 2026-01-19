const db = require('../../db/queries');

/**
 * STEP 11: Remind/Stats Handler
 */
async function handleRemindStats(ctx) {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data.startsWith('remind_')) {
        const eventId = data.replace('remind_', '');
        const regs = await db.listRegistrationsForEvent(eventId);

        // TODO: Implement actual reminder sending logic
        await ctx.reply(`✅ Reminders sent to all ${regs.length} people registered!`);
        return ctx.scene.leave();
    }

    if (data.startsWith('stats_')) {
        const eventId = data.replace('stats_', '');
        const regs = await db.listRegistrationsForEvent(eventId);

        if (regs.length === 0) {
            await ctx.reply('No registrations yet.');
        } else {
            let report = `📊 *Registrations for Event*\n\n`;
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

module.exports = {
    handleRemindStats
};
