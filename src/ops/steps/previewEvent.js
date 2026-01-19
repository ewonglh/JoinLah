const { Markup } = require('telegraf');
const db = require('../../db/queries');
const { showEventPreview } = require('../helpers/eventPreview');

/**
 * STEP 8: Preview Event Selection Handler
 */
async function handlePreviewSelection(ctx) {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data.startsWith('preview_')) {
        const eventId = data.replace('preview_', '');
        const event = await db.getEvent(eventId);

        if (!event) {
            await ctx.reply('❌ Event not found.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.previewEventId = eventId;
        await showEventPreview(ctx, event);
        return ctx.wizard.next(); // Go to Step 9 (Preview Actions)
    }
}

/**
 * STEP 9: Preview Actions (Edit, Send to Channel, Back)
 */
async function handlePreviewActions(ctx) {
    if (!ctx.callbackQuery) return;
    const action = ctx.callbackQuery.data;
    const eventId = ctx.wizard.state.previewEventId;
    await ctx.answerCbQuery();

    if (action === 'back_menu') {
        await ctx.reply('Returning to dashboard...');
        return ctx.scene.leave();
    }

    if (action === 'send_channel') {
        const event = await db.getEvent(eventId);
        const now = new Date();

        // Check cooldown (15 minutes)
        if (event.last_published_at) {
            const last = new Date(event.last_published_at);
            const diffMins = (now - last) / 60000;
            if (diffMins < 15) {
                return ctx.reply(`⚠️ Please wait ${Math.ceil(15 - diffMins)} minutes before posting again.`);
            }
        }

        try {
            const channelId = '@joinlahjoinlah';
            const messageOpts = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        Markup.button.url('🔗 Register Here', `https://t.me/${ctx.botInfo.username}?start=ev_${eventId}`)
                    ]]
                }
            };

            const caption = `📅 *${event.title || event.name}*\n\n` +
                `📍 *Location:* ${event.location}\n` +
                `🗓 *Date:* ${event.date_time || event.date}\n` +
                `👥 *Capacity:* ${event.capacity || 'Unlimited'}\n\n` +
                `${event.description || 'Join us for this amazing event!'}`;

            if (event.image_url) {
                await ctx.telegram.sendPhoto(channelId, event.image_url, { caption, ...messageOpts });
            } else {
                await ctx.telegram.sendMessage(channelId, caption, messageOpts);
            }

            await db.updateEvent(eventId, { last_published_at: now.toISOString() });
            await ctx.reply('✅ Event published to channel!');
        } catch (err) {
            console.error('Channel publish error:', err);
            await ctx.reply('❌ Failed to publish. Make sure the bot is an admin in the channel.');
        }
        return;
    }

    if (action === 'edit_event') {
        await ctx.reply('What would you like to edit?', Markup.inlineKeyboard([
            [Markup.button.callback('📝 Description', 'edit_desc')],
            [Markup.button.callback('🖼️ Image', 'edit_image')],
            [Markup.button.callback('📅 Date', 'edit_date')],
            [Markup.button.callback('📍 Location', 'edit_loc')],
            [Markup.button.callback('👥 Capacity', 'edit_capacity')],
            [Markup.button.callback('🔙 Cancel', 'cancel_edit')]
        ]));
        return;
    }

    if (['edit_desc', 'edit_image', 'edit_date', 'edit_loc', 'edit_capacity'].includes(action)) {
        const fieldMap = {
            'edit_desc': 'description',
            'edit_image': 'image',
            'edit_date': 'date',
            'edit_loc': 'location',
            'edit_capacity': 'capacity'
        };
        ctx.wizard.state.editingField = fieldMap[action];

        let prompt;
        if (action === 'edit_image') {
            prompt = 'Please send the new image (as a Photo) or image URL.';
        } else if (action === 'edit_capacity') {
            prompt = 'Please enter the new capacity (a number):';
        } else {
            prompt = `Please enter the new ${ctx.wizard.state.editingField}:`;
        }

        await ctx.reply(prompt);
        return ctx.wizard.next(); // Go to Step 10 (Edit Input)
    }

    if (action === 'cancel_edit') {
        const event = await db.getEvent(eventId);
        await showEventPreview(ctx, event);
        return;
    }
}

/**
 * STEP 10: Handle Edit Input
 */
async function handleEditInput(ctx) {
    const field = ctx.wizard.state.editingField;
    const eventId = ctx.wizard.state.previewEventId;
    let update = {};

    if (field === 'image') {
        if (ctx.message?.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            update.image_url = photo.file_id;
        } else if (ctx.message?.text) {
            update.image_url = ctx.message.text;
        } else {
            return ctx.reply('Please send a photo or image URL.');
        }
    } else if (field === 'capacity') {
        const capacity = parseInt(ctx.message?.text);
        if (isNaN(capacity) || capacity <= 0) {
            return ctx.reply('❌ Please enter a valid positive number.');
        }
        update.capacity = capacity;
    } else if (ctx.message?.text) {
        const dbFieldMap = {
            'description': 'description',
            'date': 'date_time',
            'location': 'location'
        };
        const dbField = dbFieldMap[field] || field;
        update[dbField] = ctx.message.text;
    } else {
        return ctx.reply('Please enter valid text.');
    }

    try {
        await db.updateEvent(eventId, update);
        await ctx.reply(`✅ ${field} updated!`);

        const event = await db.getEvent(eventId);
        await showEventPreview(ctx, event);

        return ctx.wizard.back(); // Go back to Step 9
    } catch (error) {
        console.error('Update error:', error);
        await ctx.reply('❌ Failed to update. Please try again.');
        return ctx.wizard.back();
    }
}

module.exports = {
    handlePreviewSelection,
    handlePreviewActions,
    handleEditInput
};
