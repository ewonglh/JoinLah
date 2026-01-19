const supabase = require('../client');

async function createRegistration({ eventId, userTelegramId, participantName, participantAge = null, participantTelegramId = null, notes = null, status = 'confirmed' }) {
    const { data, error } = await supabase
        .from('registrations')
        .insert({
            event_id: eventId,
            user_telegram_id: userTelegramId,
            // participant_telegram_id: participantTelegramId, // Ensure this column allows null if not always passed
            participant_name: participantName,
            participant_age: participantAge,
            notes,
            status
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

module.exports = {
    createRegistration,
    listRegistrationsForEvent,
    getEventRegistrationCount,
    getRegistrationsForExport
};
