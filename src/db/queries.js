const client = require('./client');
const users = require('./queries/users');
const botState = require('./queries/botState');
const events = require('./queries/events');
const registrations = require('./queries/registrations');

module.exports = {
  supabase: client,
  ...users,
  ...botState,
  ...events,
  ...registrations
};
