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

async function getEventsByOrganiser(organiserTelegramId) {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organiser_telegram_id', organiserTelegramId)
        .order('date_time', { ascending: false });

    if (error) {
        console.error('Error fetching events by organiser:', error);
        return [];
    }
    return data;
}

async function getAllEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date_time', { ascending: false });

    if (error) {
        console.error('Error fetching all events:', error);
        return [];
    }
    return data;
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

    if (error) {
        console.error('Error creating event:', error);
        return null;
    }
    return data;
}

async function updateEvent(eventId, updates) {
    const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

    if (error) {
        console.error('Error updating event:', error);
        return null;
    }
    return data;
}

async function getEventRegistrationCount(eventId) {
    const { count, error } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

    if (error) {
        console.error('Error getting registration count:', error);
        return 0;
    }
    return count;
}

async function listRegistrationsForEvent(eventId) {
    const { data, error } = await supabase
        .from('registrations')
        .select(`
            *,
            users!user_telegram_id(name),
            events!event_id(title)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) {
        // Fallback for old schema if users/events relations fail or if it's just a different schema
        // But the user asked to move queries.js logic here.
        console.error('Error listing registrations:', error);
        return [];
    }

    return data.map(r => ({
        ...r,
        user_name: r.users?.name,
        event_title: r.events?.title
    }));
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

    if (error) {
        console.error('Error for export:', error);
        return [];
    }
    return data;
}

// Alias for backward compatibility if needed, but updated to use the new logic
async function getRegistrationsForEvent(eventId) {
    return listRegistrationsForEvent(eventId);
}

module.exports = {
    isAdmin,
    getEventsByOrganiser,
    getAllEvents,
    createEvent,
    updateEvent,
    getEventRegistrationCount,
    listRegistrationsForEvent,
    getRegistrationsForExport,
    getRegistrationsForEvent
};
