require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Basic middleware
bot.use(async (ctx, next) => {
  console.log(`Update ${ctx.update.update_id} received`);
  return await next();
});

// Commands
bot.start((ctx) => ctx.reply('Welcome! I am your new Telegraf bot.'));
bot.help((ctx) => ctx.reply('Send me a message or use commands like /start.'));

// Basic text response
bot.on('text', async (ctx) => {
  await ctx.reply(`You said: ${ctx.message.text}`);
});

// Launch bot
bot.launch().then(() => {
  console.log('Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
