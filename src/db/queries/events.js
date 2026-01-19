const supabase = require('../client');

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

async function getEvent(eventId) {
    const { data, error } = await supabase
        .from('events')
        .select(`
            *,
            organiser:users!organiser_telegram_id (
                name,
                telegram_username
            )
        `)
        .eq('id', eventId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

async function getAllEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date_time', { ascending: false });

    if (error) throw error;
    return data;
}

module.exports = {
    createEvent,
    getEventsByOrganiser,
    getAllEvents, // Exported
    updateEvent,
    getEvent
};
