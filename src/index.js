const newEventWizard = require('./ops/newEvent');
const editEventWizard = require('./ops/editEvent');
const eventSummaryWizard = require('./ops/eventSummary');
const db = require('../db'); // Points to your db/index.js

const bot = new Telegraf(process.env.BOT_TOKEN);

// Test DB connection on startup
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
});

const stage = new Scenes.Stage([newEventWizard, editEventWizard, eventSummaryWizard]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Basic logger
bot.use(async (ctx, next) => {
  console.log(`Update ${ctx.update.update_id} from ${ctx.from.username || ctx.from.first_name}`);
  return await next();
    console.log(`Update ${ctx.update.update_id} received`);
    return await next();
});

// Enhanced /start with deep link support
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ');
  
  // Parse deep link: /start ev_<eventId>
  let eventId = null;
  if (args[1] && args[1].startsWith('ev_')) {
    eventId = args[1].slice(3); // Extract event ID
    const event = await db.getEvent(eventId);
    if (!event) {
      return ctx.reply('❌ Event not found. Try /start again.');
    }
    
    // Store pending event and start signup flow
    await db.setBotState(userId, 'ASK_SELF_OR_OTHER', eventId);
    return ctx.reply(
      `📅 *${event.title}*\n${event.location} • ${event.date_time}\n\n` +
      'Are you signing up for yourself or someone else?',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👤 Myself', callback_data: 'self' }],
            [{ text: '❤️ Someone else', callback_data: 'caregiver' }]
          ]
        }
      }
    );
  }
  
  // Regular /start
  await db.getOrCreateUser(userId, {
    name: ctx.from.first_name,
    telegram_username: ctx.from.username
  });
  ctx.reply('👋 Welcome! Click any event signup link to register.');
});

// Handle button clicks
bot.action(['self', 'caregiver'], async (ctx) => {
  const userId = ctx.from.id;
  const state = await db.getBotState(userId);
  
  if (state.state !== 'ASK_SELF_OR_OTHER') {
    return ctx.answerCbQuery('Please start over with /start');
  }
  
  const isCaregiver = ctx.callbackQuery.data === 'caregiver';
  await db.setBotState(userId, 'ASK_NAME', state.pending_event_id, {
    is_caregiver: isCaregiver
  });
  
  ctx.editMessageText(
    `Please enter the ${isCaregiver ? 'participant' : 'your'} full name:`,
    { reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] } }
  );
});
// Commands
bot.command('newevent', (ctx) => ctx.scene.enter('NEW_EVENT_WIZARD'));
bot.command('editevent', (ctx) => ctx.scene.enter('EDIT_EVENT_WIZARD'));
bot.command('eventsummary', (ctx) => ctx.scene.enter('EVENT_SUMMARY_WIZARD'));
bot.start((ctx) => ctx.reply('Welcome! Use /newevent to create a session, /editevent to modify one, or /eventsummary to view signups.'));
bot.help((ctx) => ctx.reply('Available commands:\n/newevent - Create a new event\n/editevent - Edit an existing event\n/eventsummary - View signup counts'));

// Basic text handler (for name/email input)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = await db.getBotState(userId);
  
  if (!state) {
    return ctx.reply('Use /start ev_<id> from an event post to sign up.');
  }
  
  switch (state.state) {
    case 'ASK_NAME':
      await db.setBotState(userId, 'ASK_EMAIL', state.pending_event_id, {
        ...state.temp_data,
        participant_name: ctx.message.text
      });
      return ctx.reply('Great! Now enter your email:');
      
    case 'ASK_EMAIL':
      await db.setBotState(userId, 'CONFIRM', state.pending_event_id, {
        ...state.temp_data,
        email: ctx.message.text
      });
      
      const event = await db.getEvent(state.pending_event_id);
      const data = state.temp_data;
      ctx.reply(
        `✅ *Confirm registration*\n\n` +
        `👤 ${data.participant_name}\n` +
        `📧 ${ctx.message.text}\n` +
        `📅 ${event.title}\n\n` +
        `Is this correct?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yes, register me!', callback_data: 'confirm' }],
              [{ text: '❌ Edit details', callback_data: 'edit' }]
            ]
          }
        }
      );
  }
// Unknown command handler
bot.on('text', (ctx) => {
    if (ctx.message.text.startsWith('/')) {
        return ctx.reply('Unknown command. Please run /help for a list of commands and their purpose.');
    }
    return ctx.reply('I\'m not sure I understand. Type /help to see what I can do.');
});

// Final confirmation
bot.action('confirm', async (ctx) => {
  const userId = ctx.from.id;
  const state = await db.getBotState(userId);
  
  const registration = await db.createRegistration({
    eventId: state.pending_event_id,
    userTelegramId: userId,
    participantName: state.temp_data.participant_name,
    participantAge: state.temp_data.participant_age
  });
  
  await db.clearBotState(userId);
  
  const event = await db.getEvent(state.pending_event_id);
  ctx.editMessageText(
    `🎉 *Registration confirmed!*\n\n` +
    `👤 ${state.temp_data.participant_name}\n` +
    `📅 ${event.title}\n` +
    `ID: ${registration.id.slice(0, 8)}`,
    { parse_mode: 'Markdown' }
  );
});

// Staff command
bot.command('roster', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args[1] && args[1].startsWith('ev_')) {
    const registrations = await db.listRegistrationsForEvent(args[1].slice(3));
    if (registrations.length === 0) {
      return ctx.reply('No registrations yet.');
    }
    
    const list = registrations.map(r => `• ${r.participant_name} (${r.user_name})`).join('\n');
    ctx.reply(`📋 *Roster* (${registrations.length} signed up):\n${list}`, { parse_mode: 'Markdown' });
  } else {
    ctx.reply('Usage: /roster ev_<eventId>');
  }
});

bot.launch().then(() => {
  console.log('Bot is running...');
// Launch bot using webhooks
const webhookUrl = `${process.env.WEBHOOK_DOMAIN}/bot${process.env.BOT_TOKEN}`;

bot.launch({
    webhook: {
        domain: process.env.WEBHOOK_DOMAIN,
        secretToken: process.env.WEBHOOK_SECRET_TOKEN,
        port: process.env.PORT || 3000,
    },
}).then(() => {
    console.log(`Bot is running on ${webhookUrl} (Webhook mode)`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
