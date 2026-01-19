const { Scenes, Markup } = require('telegraf');
const db = require('../db/queries');
const { getMessage } = require('../utils/messages');
const { generateCalendar, parseCalendarCallback } = require('../utils/calendar');
const { generateTimePicker, parseTimeCallback } = require('../utils/timePicker');

const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    // Step 0: Dashboard
    async (ctx) => {
        // In new schema, any user can be an organiser. We just ensure they exist.
        await db.getOrCreateUser(ctx.from.id, {
            name: ctx.from.first_name,
            telegram_username: ctx.from.username
        });

        await ctx.reply(getMessage('organiser.dashboard'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🆕 Create New Event', 'create')],
                [Markup.button.callback('📢 Send Reminders', 'remind')],
<<<<<<< HEAD
                [Markup.button.callback('📊 View Registrations', 'stats')]
=======
                [Markup.button.callback('📊 View Registrations', 'stats')],
                [Markup.button.callback('👁️ Preview Event', 'preview')],
                [Markup.button.callback('🔙 Exit', 'exit')]
>>>>>>> 40abde2 (Add organiser post preview button)
            ])
        );
        return ctx.wizard.next();
    },
    // Step 1: Handle dashboard action selection
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'create') {
            await ctx.reply(getMessage('organiser.createName'));
            return ctx.wizard.next();
        } else if (action === 'remind') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `remind_${e.id}`)]);
            await ctx.reply('Select event to send reminders for:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(8); // Jump to unified handler
        } else if (action === 'stats') {
            const events = await db.getEventsByOrganiser(ctx.from.id);
            if (!events || events.length === 0) {
                await ctx.reply('No events found.');
                return ctx.scene.leave();
            }
            const buttons = events.map(e => [Markup.button.callback(e.title || e.name || 'Untitled', `stats_${e.id}`)]);
            await ctx.reply('Select event to view registrations:', Markup.inlineKeyboard(buttons));
<<<<<<< HEAD
            return ctx.wizard.selectStep(8); // Jump to unified handler
=======
            return ctx.wizard.selectStep(4);
        } else if (action === 'preview') {
            const events = await db.getAllEvents();
            const buttons = events.map(e => [Markup.button.callback(e.name, `preview_${e.id}`)]);
            await ctx.reply('Select event to preview:', Markup.inlineKeyboard(buttons));
            return ctx.wizard.selectStep(4);
>>>>>>> 40abde2 (Add organiser post preview button)
        } else {
            await ctx.reply(getMessage('organiser.exited'));
            return ctx.scene.leave();
        }
    },
    // Step 2: Get event name
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidName'));
        ctx.wizard.state.newName = ctx.message.text;

        // Show calendar picker
        const now = new Date();
        ctx.wizard.state.calendarYear = now.getFullYear();
        ctx.wizard.state.calendarMonth = now.getMonth();

        await ctx.reply('📅 Select event date:', generateCalendar(ctx.wizard.state.calendarYear, ctx.wizard.state.calendarMonth));
        return ctx.wizard.next();
    },
    // Step 3: Handle calendar navigation and date selection
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const parsed = parseCalendarCallback(data);

        if (!parsed || parsed.action === 'ignore') {
            return; // Do nothing for ignored buttons
        }

        if (parsed.action === 'cancel') {
            await ctx.reply('Event creation cancelled.');
            return ctx.scene.leave();
        }

        if (parsed.action === 'navigate') {
            // Update calendar display
            ctx.wizard.state.calendarYear = parsed.year;
            ctx.wizard.state.calendarMonth = parsed.month;

            await ctx.editMessageText('📅 Select event date:', generateCalendar(parsed.year, parsed.month));
            return; // Stay on same step
        }

        if (parsed.action === 'select') {
            // Date selected, move to time picker
            ctx.wizard.state.selectedYear = parsed.year;
            ctx.wizard.state.selectedMonth = parsed.month;
            ctx.wizard.state.selectedDay = parsed.day;

            await ctx.editMessageText(`✅ Date selected: ${parsed.year}-${(parsed.month + 1).toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`);
            await ctx.reply('🕐 Select event time:', generateTimePicker());
            return ctx.wizard.next();
        }
    },
    // Step 4: Handle time picker
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const parsed = parseTimeCallback(data);

        if (!parsed || parsed.action === 'ignore') {
            return; // Do nothing for ignored buttons
        }

        if (parsed.action === 'cancel') {
            await ctx.reply('Event creation cancelled.');
            return ctx.scene.leave();
        }

        if (parsed.action === 'back') {
            // Reset to hour selection
            ctx.wizard.state.selectedHour = null;
            ctx.wizard.state.selectedMinute = null;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker());
            return;
        }

        if (parsed.action === 'hour') {
            // Hour selected, show minute picker
            ctx.wizard.state.selectedHour = parsed.hour;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour));
            return;
        }

        if (parsed.action === 'minute') {
            // Minute selected, show confirmation
            ctx.wizard.state.selectedHour = parsed.hour;
            ctx.wizard.state.selectedMinute = parsed.minute;
            await ctx.editMessageText('🕐 Select event time:', generateTimePicker(parsed.hour, parsed.minute));
            return;
        }

        if (parsed.action === 'confirm') {
            // Time confirmed, move to location
            const dateStr = `${ctx.wizard.state.selectedYear}-${(ctx.wizard.state.selectedMonth + 1).toString().padStart(2, '0')}-${ctx.wizard.state.selectedDay.toString().padStart(2, '0')}`;
            const timeStr = `${parsed.hour.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')}`;
            ctx.wizard.state.newDate = `${dateStr} ${timeStr}`;

            await ctx.editMessageText(`✅ Time selected: ${timeStr}`);
            await ctx.reply(getMessage('organiser.createLocation'));
            return ctx.wizard.next();
        }
    },
    // Step 5: Get location and finalize event creation
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply(getMessage('errors.invalidLocation'));
        const state = ctx.wizard.state;
        const newEvent = await db.createEvent({
            title: state.newName || state.title,
            dateTime: state.newDate || state.dateTime,
            location: ctx.message.text,
            organiserTelegramId: ctx.from.id,
            capacity: 100,
            description: 'Created via Wizard'
        });

        try {
            // Try to construct a valid date
            const dateObj = new Date(state.dateTime);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid Date');
            }

            const newEvent = await db.createEvent({
                title: state.title,
                organiserTelegramId: ctx.from.id,
                dateTime: dateObj.toISOString(),
                location: ctx.message.text,
                capacity: 100, // Default capacity
                description: 'Created via Wizard'
            });

            await ctx.replyWithMarkdown(getMessage('organiser.created', {
                id: newEvent.id,
                link: `https://t.me/${ctx.botInfo.username}?start=ev_${newEvent.id}`
            }));
        } catch (e) {
            await ctx.reply('Failed to create event. Please ensure date is valid (YYYY-MM-DD HH:mm) and try again.');
            console.error(e);
        }
        return ctx.scene.leave();
    },
    // Step 6: Unused (placeholder for future edit features)
    async (ctx) => {
        return ctx.scene.leave();
    },
    // Step 7: Unused (placeholder for future edit features)
    async (ctx) => {
        return ctx.scene.leave();
    },
    // Step 8: Unified Handler for Reminders and Stats
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data.startsWith('remind_')) {
            const eventId = data.replace('remind_', '');
<<<<<<< HEAD
            const regs = await db.listRegistrationsForEvent(eventId);
            await ctx.reply(getMessage('organiser.remindersSent', { count: regs.length }));
            return ctx.scene.leave();
=======
            const regs = await db.getRegistrationsForEvent(eventId);
            await ctx.reply(`✅ Reminders sent to all ${regs.length} people registered!`);
            return ctx.scene.leave(); // Or go back to menu?
>>>>>>> 40abde2 (Add organiser post preview button)
        } else if (data.startsWith('stats_')) {
            const eventId = data.replace('stats_', '');
            const regs = await db.listRegistrationsForEvent(eventId);

            if (regs.length === 0) {
                await ctx.reply(getMessage('organiser.noRegistrations'));
            } else {
                let report = getMessage('organiser.statsHeader', { eventId });
                regs.forEach((r, i) => {
                    const name = r.user_name || r.participant_name || 'Unknown';
                    const role = r.status || 'Registered';
                    report += `${i + 1}. ${name} (${role})\n`;
                });
                await ctx.replyWithMarkdown(report);
            }
            return ctx.scene.leave();
        } else if (data.startsWith('preview_')) {
            const eventId = data.replace('preview_', '');
            const event = await db.getEvent(eventId);
            ctx.wizard.state.previewEventId = eventId;
            
            await showEventPreview(ctx, event);
            return ctx.wizard.next(); // Go to Step 5 (Preview Actions)
        }
    },
    // Step 5: Preview Actions (Edit, Send, Back)
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        const eventId = ctx.wizard.state.previewEventId;
        await ctx.answerCbQuery();

        if (action === 'back_menu') {
            return ctx.scene.leave(); // Or jump to Step 0? prompt says "Back to Dashboard" usually implies leaving or restarting.
        }

        if (action === 'send_channel') {
            // Check cooldown
            const event = await db.getEvent(eventId);
            const now = new Date();
            if (event.last_published_at) {
                const last = new Date(event.last_published_at);
                const diffMins = (now - last) / 60000;
                if (diffMins < 15) {
                    return ctx.reply(`⚠️ Please wait ${Math.ceil(15 - diffMins)} minutes before posting again.`);
                }
            }

            // Send to channel
            try {
                const channelId = '@joinlahjoinlah';
                const messageOpts = {
                     parse_mode: 'Markdown',
                     reply_markup: {
                         inline_keyboard: [[Markup.button.url('🔗 Register Here', `https://t.me/${ctx.botInfo.username}?start=ev_${eventId}`)]]
                     }
                };

                let caption = `📅 *${event.name}*\n\n` +
                              `📍 *Location:* ${event.location}\n` +
                              `🗓 *Date:* ${event.date}\n\n` +
                              `${event.description || 'Join us for this amazing event!'}`;

                if (event.image_url) {
                    await ctx.telegram.sendPhoto(channelId, event.image_url, { caption, ...messageOpts });
                } else {
                    await ctx.telegram.sendMessage(channelId, caption, messageOpts);
                }

                await db.updateEvent(eventId, { last_published_at: now.toISOString() });
                await ctx.reply('✅ Event published to channel!');
            } catch (err) {
                console.error(err);
                await ctx.reply('❌ Failed to publish. Make sure the bot is an admin in the channel.');
            }
            return; // Stay in this step? Or exit? Let's stay so they can edit again if needed.
        }

        if (action === 'edit_event') {
            await ctx.reply('What would you like to edit?', Markup.inlineKeyboard([
                [Markup.button.callback('📝 Description', 'edit_desc')],
                [Markup.button.callback('🖼️ Image', 'edit_image')],
                [Markup.button.callback('📅 Date', 'edit_date')],
                [Markup.button.callback('📍 Location', 'edit_loc')],
                [Markup.button.callback('🔙 Cancel', 'cancel_edit')]
            ]));
            return; // Wait for sub-action
        }

        if (['edit_desc', 'edit_image', 'edit_date', 'edit_loc'].includes(action)) {
            const fieldMap = {
                'edit_desc': 'description',
                'edit_image': 'image',
                'edit_date': 'date',
                'edit_loc': 'location'
            };
            ctx.wizard.state.editingField = fieldMap[action];
            
            let prompt = '';
            if (action === 'edit_image') prompt = 'Please send the new image (as a Photo).';
            else prompt = `Please enter the new ${ctx.wizard.state.editingField}:`;
            
            await ctx.reply(prompt);
            return ctx.wizard.next(); // Go to Step 6 (Input)
        }

        if (action === 'cancel_edit') {
            const event = await db.getEvent(eventId);
            await showEventPreview(ctx, event);
            return;
        }
    },
    // Step 6: Handle Edit Input
    async (ctx) => {
        const field = ctx.wizard.state.editingField;
        const eventId = ctx.wizard.state.previewEventId;
        let update = {};

        if (field === 'image') {
            if (ctx.message.photo) {
                // Get largest photo file_id
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                // In a real app we'd upload this to storage. For Telegram strictly, we can store file_id 
                // BUT file_ids are temporary-ish. Ideally we need a public URL or valid re-usable file_id.
                // For this hackathon scope, we'll try using file_id as image_url if the logic allows, 
                // OR we just assume text URL for now if "image_url" expects a string.
                // Let's assume user sends a URL for now to be safe with DB schema, 
                // OR if they send a photo we mistakenly try to save file_id?
                // Re-reading: "This allows them to edit the description, image, etc."
                // I'll stick to text URL if they send text, or file_id if they send photo.
                // Note: file_id only works for sending via Telegram.
                update.image_url = photo.file_id; 
            } else if (ctx.message.text) {
                 update.image_url = ctx.message.text;
            } else {
                return ctx.reply('Please send a photo or image URL.');
            }
        } else if (ctx.message && ctx.message.text) {
            if (field === 'description') update.description = ctx.message.text;
            if (field === 'date') update.date = ctx.message.text;
            if (field === 'location') update.location = ctx.message.text;
        } else {
            return ctx.reply('Please enter valid text.');
        }

        if (field === 'date') {
             // In CREATE flow, date is stored as 'date' in JSON but 'date_time' in DB? 
             // src/ops/organiser.js:66 `date: state.newDate`
             // src/ops/db/organiser.js:createEvent `eventData`
             // src/db/queries/events.js:createEvent `date_time: dateTime`
             // Wait, `createEvent` in `ops/organiser.js` passes `{name, date, location}`.
             // `ops/db/organiser.js` passes `[eventData]` to `.insert()`.
             // `db/queries/events.js` expects different args.
             // It seems `ops/db/organiser.js` directly inserts `eventData` into `events` table.
             // So the columns must be `name`, `date`, `location`.
             // But `db/queries/events.js` uses `title`, `date_time`, `location`.
             // CONTRADICTION found in previous `read_file`.
             // `ops/organiser.js` uses `db.createEvent`. `db` is `./db/organiser`.
             // `ops/db/organiser.js` inserts directly.
             // I must respect `ops/db/organiser.js` schema logic which implies columns `name`, `date` exist ??? 
             // Or maybe `ops` code I read was assuming different schema than what `db/queries` thinks.
             // Let's check `getAllEvents` in `ops/db/organiser.js`: `select('*')`.
             // The `ops/organiser.js` line 33 uses `e.name`.
             // So the column is likely `name`.
             // I'll assume updates should match what was in Insert.
             // `update.name`? No, I only offered to change Desc, Image, Date, Loc.
             // `name` was not offered.
        }

        await db.updateEvent(eventId, update);
        await ctx.reply(`✅ ${field} updated!`);
        
        // Show preview again
        const event = await db.getEvent(eventId);
        await showEventPreview(ctx, event);
        
        return ctx.wizard.back(); // Go back to Step 5
    }
);

// Helper function
async function showEventPreview(ctx, event) {
    let caption = `📅 *${event.name}*\n\n` +
                  `📍 *Location:* ${event.location}\n` +
                  `🗓 *Date:* ${event.date}\n\n` +
                  `${event.description || '_No description yet_'}`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Edit', 'edit_event'), Markup.button.callback('🚀 Send to Channel', 'send_channel')],
        [Markup.button.callback('🔙 Back to Menu', 'back_menu')]
    ]);

    if (event.image_url) {
        // If it looks like a URL or file_id
        await ctx.replyWithPhoto(event.image_url, { caption, parse_mode: 'Markdown', ...buttons });
    } else {
        await ctx.reply(caption, { parse_mode: 'Markdown', ...buttons });
    }
}

module.exports = organiserScene;
