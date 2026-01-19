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

async function createRegistration(userId, eventId, details) {
    const { data, error } = await supabase
        .from('registrations')
        .insert([{
            userId: userId.toString(),
            eventId: eventId,
            ...details,
            registeredAt: new Date().toISOString()
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
