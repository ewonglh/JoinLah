const supabase = require('../client');

async function getOrCreateUser(telegramUserId, profile = {}) {
    const { name, email, phone, telegram_username, is_caregiver = false, is_organiser = false } = profile;

    // First try to get existing user
    const { data: existingUser } = await supabase
        .from('users')
        .select()
        .eq('telegram_user_id', telegramUserId)
        .single();

    // If user exists, update without overwriting is_organiser
    if (existingUser) {
        const { data, error } = await supabase
            .from('users')
            .update({
                telegram_username: telegram_username || existingUser.telegram_username,
                name: name || existingUser.name,
                email: email || existingUser.email,
                phone: phone || existingUser.phone,
                updated_at: new Date()
            })
            .eq('telegram_user_id', telegramUserId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Create new user
    const { data, error } = await supabase
        .from('users')
        .insert({
            telegram_user_id: telegramUserId,
            telegram_username,
            name,
            email,
            phone,
            is_caregiver,
            is_organiser,
            updated_at: new Date()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}


async function updateUser(telegramUserId, updates) {
    const { data, error } = await supabase
        .from('users')
        .update({
            ...updates,
            updated_at: new Date()
        })
        .eq('telegram_user_id', telegramUserId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = {
    getOrCreateUser,
    updateUser
};
