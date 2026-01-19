const { Markup } = require('telegraf');
const { formatEventDate } = require('./formatDate');

/**
 * Display event preview with edit and publish options
 */
async function showEventPreview(ctx, event) {
    const formattedDate = formatEventDate(event.date_time || event.date);
    const eventName = event.title || event.name || 'Untitled Event';

    const caption = `*${eventName}*\n\n` +
        `📍 *Location:* ${event.location || 'TBD'}\n` +
        `🗓 *Date:* ${formattedDate}\n` +
        `👥 *Capacity:* ${event.capacity || 'Unlimited'}\n\n` +
        `📝 ${event.description || '_No description yet_'}`;


    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Edit', 'edit_event'), Markup.button.callback('🚀 Send to Channel', 'send_channel')],
        [Markup.button.callback('🔙 Back to Menu', 'back_menu')]
    ]);

    try {
        if (event.image_url) {
            await ctx.replyWithPhoto(event.image_url, { caption, parse_mode: 'Markdown', ...buttons });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', ...buttons });
        }
    } catch (error) {
        console.error('Preview display error:', error);
        await ctx.reply(caption, { parse_mode: 'Markdown', ...buttons });
    }
}

module.exports = { showEventPreview };
