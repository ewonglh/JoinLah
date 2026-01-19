const supabase = require('./client');

async function getEvent(eventId) {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error) {
        console.error('Error fetching event:', error);
        return null;
    }
    return data;
}

async function createRegistration(userTelegramId, eventId, details) {
    const { data, error } = await supabase
        .from('registrations')
        .insert([{
            user_telegram_id: userTelegramId,
            event_id: eventId,
            participant_name: details.participant_name || details.beneficiaryName,
            participant_age: details.participant_age || null,
            status: details.status || 'pending',
            notes: details.notes || details.requirements || '',
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating registration:', error);
        return null;
    }
    return data;
}

module.exports = {
    getEvent,
    createRegistration
};
