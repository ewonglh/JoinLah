const { Markup } = require('telegraf');
const db = require('../../db/queries');
const { getMessage } = require('../../utils/messages');

/**
 * STEP 0: Dashboard - Display main menu
 */
async function showDashboard(ctx) {
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
            [Markup.button.callback('👁️ Preview Event', 'preview')],
            [Markup.button.callback('🔙 Exit', 'exit')]
        ])
    });
    return ctx.wizard.next();
}

/**
 * STEP 1: Dashboard Action Handler
 */
async function handleDashboardAction(ctx) {
    if (!ctx.callbackQuery) return;
    const action = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (action === 'create') {
        await ctx.reply('📝 Please enter the *NAME* of the new event:', { parse_mode: 'Markdown' });
        return ctx.wizard.next(); // Go to Step 2 (Get Name)
    }

    if (action === 'remind') {
        const events = await db.getEventsByOrganiser(ctx.from.id);
        if (!events || events.length === 0) {
            await ctx.reply('No events found.');
            return ctx.scene.leave();
        }
        const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `remind_${e.id}`)]);
        await ctx.reply('Select event to send reminders for:', Markup.inlineKeyboard(buttons));
        return ctx.wizard.selectStep(12); // Jump to Remind/Stats Handler
    }

    if (action === 'stats') {
        const events = await db.getEventsByOrganiser(ctx.from.id);
        if (!events || events.length === 0) {
            await ctx.reply('No events found.');
            return ctx.scene.leave();
        }
        const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `stats_${e.id}`)]);
        await ctx.reply('Select event to view registrations:', Markup.inlineKeyboard(buttons));
        return ctx.wizard.selectStep(12); // Jump to Remind/Stats Handler
    }

    if (action === 'preview') {
        const events = await db.getEventsByOrganiser(ctx.from.id);
        if (!events || events.length === 0) {
            await ctx.reply('No events found.');
            return ctx.scene.leave();
        }
        const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `preview_${e.id}`)]);
        await ctx.reply('Select event to preview:', Markup.inlineKeyboard(buttons));
        return ctx.wizard.selectStep(9); // Jump to Preview Event Selection Handler
    }

    // Exit
    await ctx.reply(getMessage('organiser.exited'));
    return ctx.scene.leave();
}

module.exports = {
    showDashboard,
    handleDashboardAction
};
