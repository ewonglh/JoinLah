const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');

const setupProfileScene = new Scenes.WizardScene(
    'SETUP_PROFILE_SCENE',
    async (ctx) => {
        await ctx.reply(getMessage('profile.setupWelcome'));
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        ctx.wizard.state.name = ctx.message.text;
        await ctx.reply(getMessage('profile.askPhone'));
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidNumber'));
        const name = ctx.wizard.state.name;

        await db.updateUser(ctx.from.id, {
            name: name,
            phone: ctx.message.text
        });

        await ctx.reply(getMessage('profile.setupComplete'));

        // Handle redirection if there was a pending event
        if (ctx.session.pendingEventId) {
            const eventId = ctx.session.pendingEventId;
            delete ctx.session.pendingEventId;
            await ctx.reply(getMessage('profile.proceedToEvent'));
            return ctx.scene.enter('SIGNUP_SCENE', { eventId });
        }

        return ctx.scene.leave();
    }
);

const profileScene = new Scenes.WizardScene(
    'PROFILE_SCENE',
    async (ctx) => {
        const user = await db.getOrCreateUser(ctx.from.id, {
            name: ctx.from.first_name,
            telegram_username: ctx.from.username
        });

        let profileText = getMessage('profile.view', {
            firstName: user.name, // Mapping name to firstName param for message template compatibility
            lastName: '',
            phone: user.phone || 'Not set',
            role: user.is_caregiver ? 'Caregiver' : 'User'
        });

        await ctx.replyWithMarkdownV2(profileText, Markup.inlineKeyboard([
            [Markup.button.callback(getMessage('buttons.editProfile'), 'edit'), Markup.button.callback(getMessage('buttons.back'), 'back')]
        ]));
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'edit') {
            await ctx.reply('Please enter your new name:'); // Simplified edit flow for now
            return ctx.wizard.next();
        } else {
            await ctx.reply(getMessage('profile.menuClosed'));
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidText'));
        await db.updateUser(ctx.from.id, { name: ctx.message.text });
        await ctx.reply(getMessage('profile.updated'));
        return ctx.scene.leave();
    }
);

module.exports = { profileScene, setupProfileScene };
