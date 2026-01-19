const supabase = require('./client');

async function getOrCreateUser(telegramId, profile) {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', telegramId.toString())
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user:', error);
        return null;
    }

    if (!user) {
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                id: telegramId.toString(),
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                username: profile.username || '',
                role: 'user',
                profileComplete: false
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating user:', createError);
            return null;
        }
        return newUser;
    }
    return user;
}

async function updateUserProfile(userId, data) {
    const { data: updatedUser, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId.toString())
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
