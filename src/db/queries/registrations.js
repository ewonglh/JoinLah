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
    const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    // Manually fetch and merge data
    return Promise.all(registrations.map(async (r) => {
        const { data: user } = await supabase
            .from('users')
            .select('name')
            .eq('telegram_user_id', r.user_telegram_id)
            .single();

        const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', r.event_id)
            .single();

        return {
            ...r,
            user_name: user?.name,
            event_title: event?.title
        };
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
    const { data: registrations, error } = await supabase
        .from('registrations')
        .select('participant_name, participant_age, status, notes, created_at, user_telegram_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    return Promise.all(registrations.map(async (r) => {
        const { data: user } = await supabase
            .from('users')
            .select('name, telegram_username, phone, email')
            .eq('telegram_user_id', r.user_telegram_id)
            .single();

        return {
            ...r,
            users: user
        };
    }));
}

module.exports = {
    createRegistration,
    listRegistrationsForEvent,
    getEventRegistrationCount,
    getRegistrationsForExport
};
