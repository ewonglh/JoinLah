const supabase = require('./client');

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

    if (error) {
        console.error('Error in getOrCreateUser:', error);
        return null;
    }
    return data;
}

async function updateUserProfile(telegramUserId, data) {
    // Avoid updating PK or immutable fields if they are passed in 'data'
    const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
            ...data,
            updated_at: new Date()
        })
        .eq('telegram_user_id', telegramUserId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user profile:', error);
        return null;
    }
    return updatedUser;
}

module.exports = {
    getOrCreateUser,
    updateUserProfile
};
