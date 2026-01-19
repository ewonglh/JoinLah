const { Scenes, Markup } = require('telegraf');
const db = require('./db/profile');

const setupProfileScene = new Scenes.WizardScene(
    'SETUP_PROFILE_SCENE',
    async (ctx) => {
        await ctx.reply('Welcome! Before we get started, please help us complete your profile. What is your full name?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid name.');
        ctx.wizard.state.fullName = ctx.message.text;
        await ctx.reply('Thank you! Please enter your contact number:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid number.');
        const fullName = ctx.wizard.state.fullName;

        await db.updateUserProfile(ctx.from.id, {
            name: fullName,
            phone: ctx.message.text
        });

        await ctx.reply('✅ Profile setup complete!');

        // Handle redirection if there was a pending event
        if (ctx.session.pendingEventId) {
            const eventId = ctx.session.pendingEventId;
            delete ctx.session.pendingEventId;
            await ctx.reply('Now proceeding to event registration...');
            return ctx.scene.enter('SIGNUP_SCENE', { eventId });
        }

        return ctx.scene.leave();
    }
);

const profileScene = new Scenes.WizardScene(
    'PROFILE_SCENE',
    async (ctx) => {
        const user = await db.getOrCreateUser(ctx.from.id, {
            name: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
            telegram_username: ctx.from.username
        });

        let profileText = `👤 *Your Profile*\n\n` +
            `Name: ${user.name || 'Not set'}\n` +
            `Phone: ${user.phone || 'Not set'}\n` +
            `Role: ${user.is_caregiver ? 'Caregiver' : 'User'}\n\n` +
            `Would you like to update your details?`;

        await ctx.replyWithMarkdown(profileText, Markup.inlineKeyboard([
            [Markup.button.callback('📝 Edit Profile', 'edit'), Markup.button.callback('🔙 Back', 'back')]
        ]));
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'edit') {
            await ctx.reply('Please enter your updated bio or any additional info.');
            return ctx.wizard.next();
        } else {
            await ctx.reply('Menu closed.');
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter valid text.');
        await db.updateUserProfile(ctx.from.id, { bio: ctx.message.text });
        await ctx.reply('✅ Profile updated!');
        return ctx.scene.leave();
    }
);

module.exports = { profileScene, setupProfileScene };
