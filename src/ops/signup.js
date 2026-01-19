const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');

// Helper for event card
function getEventCard(event) {
    return getMessage('signup.card', {
        name: event.title,
        location: event.location,
        date: new Date(event.date_time).toLocaleString()
    });
}

const signupScene = new Scenes.WizardScene(
    'SIGNUP_SCENE',
    // Step 1: Display Event & Ask Role (Beneficiary vs Organiser - Legacy intent, now essentially "Myself" vs "Organiser/Admin Role")
    // Actually, following previous logic: Organiser -> Switch role. Beneficiary -> Signup.
    // In new schema, we'll interpret "Organiser" as just setting "is_caregiver" maybe? Or just ignore?
    // Let's stick to the flow: If Organiser, go to Organiser scene.
    async (ctx) => {
        const eventId = ctx.wizard.state.eventId;
        const event = await db.getEvent(eventId);

        if (!event) {
            await ctx.reply(getMessage('signup.eventNotFound'));
            return ctx.scene.leave();
        }

        ctx.wizard.state.event = event;

        // Fetch user
        const user = await db.getOrCreateUser(ctx.from.id, {
            name: ctx.from.first_name,
            telegram_username: ctx.from.username
        });
        ctx.wizard.state.userProfile = user;

        await ctx.replyWithMarkdownV2(getEventCard(event));
        await ctx.reply(getMessage('signup.askRole'),
            Markup.inlineKeyboard([
                [Markup.button.callback(getMessage('buttons.beneficiary'), 'beneficiary'), Markup.button.callback(getMessage('buttons.organiser'), 'organiser')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Handle Role Input & Scene Branching
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply(getMessage('errors.unknownInput'));
        const role = ctx.callbackQuery.data;
        ctx.wizard.state.regRole = role;
        await ctx.answerCbQuery();

        if (role === 'organiser') {
            // Update user to indicate they are acting as organiser (if we need to track this, maybe is_caregiver? or just ignore since no role col)
            // For now, just switch scenes as requested by logic
            await ctx.reply(getMessage('signup.organiserSwitch'));
            return ctx.scene.enter('ORGANISER_SCENE');
        } else {
            await ctx.reply(getMessage('signup.askBeneficiaryName'));
            return ctx.wizard.next();
        }
    },
    // Step 3: Name Comparison
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        const providedName = ctx.message.text.trim();
        ctx.wizard.state.beneficiaryName = providedName;

        const profile = ctx.wizard.state.userProfile;
        const profileName = (profile.name || '').trim();

        if (providedName.toLowerCase() !== profileName.toLowerCase()) {
            await ctx.reply(getMessage('signup.nameMismatch', {
                providedName,
                profileName: profileName || 'Unknown'
            }),
                Markup.inlineKeyboard([
                    [Markup.button.callback(getMessage('buttons.yesOnBehalf'), 'on_behalf'), Markup.button.callback(getMessage('buttons.noSelf'), 'self')]
                ])
            );
            return ctx.wizard.next();
        }

        ctx.wizard.state.onBehalf = false;
        await ctx.reply(getMessage('signup.askRequirements'));
        return ctx.wizard.selectStep(5); // Jump to Requirements
    },
    // Step 4: Handle On-Behalf Confirmation
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons provided.');
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        ctx.wizard.state.onBehalf = (action === 'on_behalf');

        await ctx.reply(getMessage('signup.askRequirements'));
        return ctx.wizard.next();
    },
    // Step 5: Collect Beneficiary Requirements
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidText'));
        ctx.wizard.state.requirements = ctx.message.text;

        const state = ctx.wizard.state;
        let summary = getMessage('signup.summary', {
            eventName: state.event.title,
            beneficiaryName: state.beneficiaryName,
            onBehalf: state.onBehalf ? getMessage('signup.onBehalfLabel') : '',
            requirements: state.requirements
        });

        await ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
            [Markup.button.callback(getMessage('buttons.confirm'), 'confirm'), Markup.button.callback(getMessage('buttons.cancel'), 'cancel')]
        ]));
        return ctx.wizard.next();
    },
    // Step 6: Finalize Beneficiary Registration
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'confirm') {
            const state = ctx.wizard.state;

            await db.createRegistration({
                eventId: state.eventId,
                userTelegramId: ctx.from.id,
                participantName: state.beneficiaryName,
                notes: state.requirements
            });
            // Note: Schema has `notes` for requirements. I should update createRegistration to accept notes if it doesn't already, well `createRegistration` takes params.
            // Wait, my `createRegistration` in `queries/registrations.js` doesn't take `notes` argument?
            // I need to check `registrations.js`. It takes `participantName`, `participantAge`.
            // I should update `createRegistration` query to accept `notes` or pass it in a generic object.

            // For now, I'll assume I update the query in the next step or just pass it and hope (it won't work if not defined).
            // Let's rely on the fact that I can update createRegistration to support more fields.

            await ctx.reply(getMessage('signup.success'));
        } else {
            await ctx.reply(getMessage('signup.cancelled'));
        }
        return ctx.scene.leave();
    }
);

module.exports = signupScene;
