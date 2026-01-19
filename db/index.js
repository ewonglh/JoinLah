const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  // Supabase pooler transaction mode (port 6543)
  ssl: { rejectUnauthorized: false }
});

async function getOrCreateUser(telegramUserId, profile = {}) {
  const { name, email, phone, telegram_username, is_caregiver = false } = profile;
  
  const result = await pool.query(
    `INSERT INTO users (telegram_user_id, telegram_username, name, email, phone, is_caregiver)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_user_id) 
     DO UPDATE SET 
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       telegram_username = EXCLUDED.telegram_username,
       is_caregiver = EXCLUDED.is_caregiver,
       updated_at = NOW()
     RETURNING *`,
    [telegramUserId, telegram_username, name, email, phone, is_caregiver]
  );
  
  return result.rows[0];
}

async function getBotState(telegramUserId) {
  const result = await pool.query(
    'SELECT * FROM bot_states WHERE telegram_user_id = $1',
    [telegramUserId]
  );
  return result.rows[0];
}

async function setBotState(telegramUserId, state, pendingEventId = null, tempData = {}) {
  await pool.query(
    `INSERT INTO bot_states (telegram_user_id, state, pending_event_id, temp_data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_user_id) 
     DO UPDATE SET 
       state = EXCLUDED.state,
       pending_event_id = EXCLUDED.pending_event_id,
       temp_data = EXCLUDED.temp_data,
       updated_at = NOW()`,
    [telegramUserId, state, pendingEventId, tempData]
  );
  
  return getBotState(telegramUserId);
}

async function clearBotState(telegramUserId) {
  await pool.query(
    'DELETE FROM bot_states WHERE telegram_user_id = $1',
    [telegramUserId]
  );
}

async function createRegistration({ eventId, userTelegramId, participantName, participantAge = null, participantTelegramId = null }) {
  const result = await pool.query(
    `INSERT INTO registrations (event_id, user_telegram_id, participant_telegram_id, participant_name, participant_age)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [eventId, userTelegramId, participantTelegramId, participantName, participantAge]
  );
  return result.rows[0];
}

async function listRegistrationsForEvent(eventId) {
  const result = await pool.query(
    `SELECT r.*, u.name as user_name, e.title as event_title
     FROM registrations r
     JOIN users u ON r.user_telegram_id = u.telegram_user_id
     JOIN events e ON r.event_id = e.id
     WHERE r.event_id = $1
     ORDER BY r.created_at`,
    [eventId]
  );
  return result.rows;
}

async function createEvent({ title, organiserTelegramId, dateTime, location, capacity }) {
  const result = await pool.query(
    `INSERT INTO events (title, organiser_telegram_id, date_time, location, capacity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, organiserTelegramId, dateTime, location, capacity]
  );
  return result.rows[0];
}

async function getEvent(eventId) {
  const result = await pool.query(
    'SELECT * FROM events WHERE id = $1',
    [eventId]
  );
  return result.rows[0];
}

module.exports = {
  getOrCreateUser,
  getBotState,
  setBotState,
  clearBotState,
  createRegistration,
  listRegistrationsForEvent,
  createEvent,
  getEvent,
  pool // Export pool for custom queries if needed
};
