const supabase = require('../client');

async function getBotState(telegramUserId) {
    const { data, error } = await supabase
        .from('bot_states')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .single();

    // It's okay if state doesn't exist, just return null (Supabase returns error for .single() if not found, usually code PGRST116)
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

async function setBotState(telegramUserId, state, pendingEventId = null, tempData = {}) {
    const { data, error } = await supabase
        .from('bot_states')
        .upsert({
            telegram_user_id: telegramUserId,
            state,
            pending_event_id: pendingEventId,
            temp_data: tempData,
            updated_at: new Date()
        }, { onConflict: 'telegram_user_id' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function clearBotState(telegramUserId) {
    const { error } = await supabase
        .from('bot_states')
        .delete()
        .eq('telegram_user_id', telegramUserId);

    if (error) throw error;
}

module.exports = {
    getBotState,
    setBotState,
    clearBotState
};
