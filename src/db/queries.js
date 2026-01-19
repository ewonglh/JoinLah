const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getOrCreateUser(telegramUserId, profile = {}) {
  const { name, email, phone, telegram_username, is_caregiver = false } = profile;

  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_user_id: telegramUserId,
      telegram_username,
      name,
      email,
      phone,
      is_caregiver,
      updated_at: new Date()
    }, { onConflict: 'telegram_user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getBotState(telegramUserId) {
  const { data, error } = await supabase
    .from('bot_states')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .single();

  // It's okay if state doesn't exist, just return null (Supabase returns error for .single() if not found, usually code PGRST116)
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

async function setBotState(telegramUserId, state, pendingEventId = null, tempData = {}) {
  const { data, error } = await supabase
    .from('bot_states')
    .upsert({
      telegram_user_id: telegramUserId,
      state,
      pending_event_id: pendingEventId,
      temp_data: tempData,
      updated_at: new Date()
    }, { onConflict: 'telegram_user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function clearBotState(telegramUserId) {
  const { error } = await supabase
    .from('bot_states')
    .delete()
    .eq('telegram_user_id', telegramUserId);

  if (error) throw error;
}

async function createRegistration({ eventId, userTelegramId, participantName, participantAge = null, participantTelegramId = null }) {
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      event_id: eventId,
      user_telegram_id: userTelegramId,
      // participant_telegram_id: participantTelegramId, // Ensure this column allows null if not always passed
      participant_name: participantName,
      participant_age: participantAge
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listRegistrationsForEvent(eventId) {
  // Join users and events tables
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
      users!user_telegram_id(name),
      events!event_id(title)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Map to flatten structure expected by the app (user_name, event_title)
  // Check src/index.js usage: r.participant_name, r.user_name
  return data.map(r => ({
    ...r,
    user_name: r.users?.name,
    event_title: r.events?.title
  }));
}

async function createEvent({ title, organiserTelegramId, dateTime, location, capacity, description, image_url }) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      organiser_telegram_id: organiserTelegramId,
      date_time: dateTime,
      location,
      capacity,
      description,
      image_url
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getEventsByOrganiser(organiserTelegramId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organiser_telegram_id', organiserTelegramId)
    .order('date_time', { ascending: false });

  if (error) throw error;
  return data;
}

async function updateEvent(eventId, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getEventRegistrationCount(eventId) {
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) throw error;
  return count;
}

async function getRegistrationsForExport(eventId) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      participant_name,
      participant_age,
      status,
      notes,
      created_at,
      users!user_telegram_id (
        name,
        telegram_username,
        phone,
        email
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function getEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
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
  getEventsByOrganiser,
  updateEvent,
  getEventRegistrationCount,
  getRegistrationsForExport,
  supabase
};

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getOrCreateUser(telegramUserId, profile = {}) {
  const { name, email, phone, telegram_username, is_caregiver = false } = profile;

  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_user_id: telegramUserId,
      telegram_username,
      name,
      email,
      phone,
      is_caregiver,
      updated_at: new Date()
    }, { onConflict: 'telegram_user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getBotState(telegramUserId) {
  const { data, error } = await supabase
    .from('bot_states')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .single();

  // It's okay if state doesn't exist, just return null (Supabase returns error for .single() if not found, usually code PGRST116)
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

async function setBotState(telegramUserId, state, pendingEventId = null, tempData = {}) {
  const { data, error } = await supabase
    .from('bot_states')
    .upsert({
      telegram_user_id: telegramUserId,
      state,
      pending_event_id: pendingEventId,
      temp_data: tempData,
      updated_at: new Date()
    }, { onConflict: 'telegram_user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function clearBotState(telegramUserId) {
  const { error } = await supabase
    .from('bot_states')
    .delete()
    .eq('telegram_user_id', telegramUserId);

  if (error) throw error;
}

async function createRegistration({ eventId, userTelegramId, participantName, participantAge = null, participantTelegramId = null }) {
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      event_id: eventId,
      user_telegram_id: userTelegramId,
      // participant_telegram_id: participantTelegramId, // Ensure this column allows null if not always passed
      participant_name: participantName,
      participant_age: participantAge
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listRegistrationsForEvent(eventId) {
  // Join users and events tables
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
      users!user_telegram_id(name),
      events!event_id(title)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Map to flatten structure expected by the app (user_name, event_title)
  // Check src/index.js usage: r.participant_name, r.user_name
  return data.map(r => ({
    ...r,
    user_name: r.users?.name,
    event_title: r.events?.title
  }));
}

async function createEvent({ title, organiserTelegramId, dateTime, location, capacity, description, image_url }) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      organiser_telegram_id: organiserTelegramId,
      date_time: dateTime,
      location,
      capacity,
      description,
      image_url
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getEventsByOrganiser(organiserTelegramId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organiser_telegram_id', organiserTelegramId)
    .order('date_time', { ascending: false });

  if (error) throw error;
  return data;
}

async function updateEvent(eventId, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getEventRegistrationCount(eventId) {
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) throw error;
  return count;
}

async function getRegistrationsForExport(eventId) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      participant_name,
      participant_age,
      status,
      notes,
      created_at,
      users!user_telegram_id (
        name,
        telegram_username,
        phone,
        email
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function getEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
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
  getEventsByOrganiser,
  updateEvent,
  getEventRegistrationCount,
  getRegistrationsForExport,
  supabase
};
