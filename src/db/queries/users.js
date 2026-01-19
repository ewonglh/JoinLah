const supabase = require('../client');

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
