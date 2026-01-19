const { Scenes, Markup } = require('telegraf');
const dbSignup = require('./db/signup');
const dbProfile = require('./db/profile');

// Helper for event card
function getEventCard(event) {
    return `🌟 *${event.name}* 🌟\n\n` +
        `📍 *Location:* ${event.location}\n` +
        `📅 *Date:* ${event.date}\n\n` +
        `This event provides support for our community. Join us! ❤️`;
}

const signupScene = new Scenes.WizardScene(
    'SIGNUP_SCENE',
    // Step 1: Role Selection
    async (ctx) => {
        const eventId = ctx.wizard.state.eventId;
        const event = await dbSignup.getEvent(eventId);

        if (!event) {
            await ctx.reply('❌ Sorry, this event was not found.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.event = event;

        // Fetch user profile for name comparison
        const user = await dbProfile.getOrCreateUser(ctx.from.id, {});
        ctx.wizard.state.userProfile = user;

        await ctx.replyWithMarkdown(getEventCard(event));
        await ctx.reply('Are you signing up as a Beneficiary (someone needing support) or as an Organiser?',
            Markup.inlineKeyboard([
                [Markup.button.callback('💖 Beneficiary', 'beneficiary'), Markup.button.callback('🛠️ Organiser', 'organiser')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Handle Role Input & Scene Branching
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons.');
        const role = ctx.callbackQuery.data;
        ctx.wizard.state.regRole = role;
        await ctx.answerCbQuery();

        if (role === 'organiser') {
            await dbProfile.updateUserProfile(ctx.from.id, { role: 'organiser' });
            await ctx.reply('🛠️ You are now registered as an Organiser. Switching to Dashboard...');
            return ctx.scene.enter('ORGANISER_SCENE');
        } else {
            await ctx.reply('What is the FULL NAME of the beneficiary?');
            return ctx.wizard.next();
        }
    },
    // Step 3: Name Comparison
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter a valid name.');
        const providedName = ctx.message.text.trim();
        ctx.wizard.state.beneficiaryName = providedName;

        const profile = ctx.wizard.state.userProfile;
        const profileName = `${profile.firstName} ${profile.lastName}`.trim();

        if (providedName.toLowerCase() !== profileName.toLowerCase()) {
            await ctx.reply(`The name provided ("${providedName}") is different from your profile name ("${profileName}").\n\nAre you signing up on behalf of this beneficiary?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Yes', 'on_behalf'), Markup.button.callback('❌ No, it\'s for me', 'self')]
                ])
            );
            return ctx.wizard.next();
        }

        ctx.wizard.state.onBehalf = false;
        await ctx.reply('Please tell us about any specific assistance or items you need:');
        return ctx.wizard.selectStep(5); // Jump to Requirements
    },
    // Step 4: Handle On-Behalf Confirmation
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Please use the buttons provided.');
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        ctx.wizard.state.onBehalf = (action === 'on_behalf');

        await ctx.reply('Please tell us about any specific assistance or items you need:');
        return ctx.wizard.next();
    },
    // Step 5: Collect Beneficiary Requirements
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Please enter some information.');
        ctx.wizard.state.requirements = ctx.message.text;

        const state = ctx.wizard.state;
        let summary = `📝 *Beneficiary Registration Summary*\n\n` +
            `Event: ${state.event.name}\n` +
            `Beneficiary: ${state.beneficiaryName}\n` +
            (state.onBehalf ? `*On behalf of beneficiary*\n` : '') +
            `Notes: ${state.requirements}\n\nConfirm this registration?`;

        await ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm', 'confirm'), Markup.button.callback('❌ Cancel', 'cancel')]
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
            await dbSignup.createRegistration(ctx.from.id, state.eventId, {
                role: 'beneficiary',
                beneficiaryName: state.beneficiaryName,
                onBehalf: state.onBehalf || false,
                requirements: state.requirements
            });

            await ctx.reply('🎉 Success! Your registration is complete. We will reach out soon.');
        } else {
            await ctx.reply('Registration cancelled.');
        }
        return ctx.scene.leave();
    }
);

module.exports = signupScene;
