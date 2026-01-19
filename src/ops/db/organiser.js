const supabase = require('./client');

async function isAdmin(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId.toString())
        .single();

    if (error) return false;
    return data.role === 'organiser';
}

async function getAllEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*');

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }
    return data;
}

async function createEvent(eventData) {
    const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

    if (error) {
        console.error('Error creating event:', error);
        return null;
    }
    return data;
}

async function getRegistrationsForEvent(eventId) {
    const { data, error } = await supabase
        .from('registrations')
        .select(`
            *,
            user:users(*)
        `)
        .eq('eventId', eventId);

    if (error) {
        console.error('Error fetching registrations:', error);
        return [];
    }
    return data;
}

async function getEvent(eventId) {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId.toString())
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching event:', error);
        return null;
    }
    return data;
}

async function updateEvent(eventId, updates) {
    const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId.toString())
        .select()
        .single();

    if (error) {
        console.error('Error updating event:', error);
        return null;
    }
    return data;
}

module.exports = {
    isAdmin,
    getAllEvents,
    createEvent,
    getRegistrationsForEvent,
    getEvent,
    updateEvent
};
