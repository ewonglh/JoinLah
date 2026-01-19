const { Markup } = require('telegraf');

/**
 * Generates a time picker inline keyboard
 * @param {number|null} selectedHour - Currently selected hour (0-23), null if not yet selected
 * @param {number|null} selectedMinute - Currently selected minute, null if not yet selected
 * @returns {object} Telegraf inline keyboard markup
 */
function generateTimePicker(selectedHour = null, selectedMinute = null) {
    const buttons = [];

    if (selectedHour === null) {
        // Hour selection - show in rows of 6
        buttons.push([Markup.button.callback('🕐 Select Hour', 'time_ignore')]);

        for (let hour = 0; hour < 24; hour += 6) {
            const row = [];
            for (let i = 0; i < 6 && (hour + i) < 24; i++) {
                const h = hour + i;
                const label = h.toString().padStart(2, '0');
                row.push(Markup.button.callback(label, `time_hour_${h}`));
            }
            buttons.push(row);
        }
    } else if (selectedMinute === null) {
        // Minute selection
        buttons.push([
            Markup.button.callback(`Selected: ${selectedHour.toString().padStart(2, '0')}:__`, 'time_ignore')
        ]);
        buttons.push([Markup.button.callback('🕐 Select Minute', 'time_ignore')]);

        const minutes = [0, 15, 30, 45];
        const row = minutes.map(min =>
            Markup.button.callback(
                min.toString().padStart(2, '0'),
                `time_minute_${selectedHour}_${min}`
            )
        );
        buttons.push(row);

        // Allow going back to hour selection
        buttons.push([Markup.button.callback('← Back to Hour', 'time_back')]);
    } else {
        // Confirmation screen
        const timeStr = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        buttons.push([Markup.button.callback(`Selected Time: ${timeStr}`, 'time_ignore')]);
        buttons.push([
            Markup.button.callback('✅ Confirm', `time_confirm_${selectedHour}_${selectedMinute}`),
            Markup.button.callback('← Change', 'time_back')
        ]);
    }

    // Cancel button
    buttons.push([Markup.button.callback('❌ Cancel', 'time_cancel')]);

    return Markup.inlineKeyboard(buttons);
}

/**
 * Parses time picker callback data
 * @param {string} data - Callback data from button press
 * @returns {object|null} Parsed time action or null if invalid
 */
function parseTimeCallback(data) {
    if (!data.startsWith('time_')) return null;

    if (data === 'time_ignore') {
        return { action: 'ignore' };
    }

    if (data === 'time_cancel') {
        return { action: 'cancel' };
    }

    if (data === 'time_back') {
        return { action: 'back' };
    }

    const parts = data.split('_');

    if (parts[1] === 'hour') {
        return {
            action: 'hour',
            hour: parseInt(parts[2])
        };
    }

    if (parts[1] === 'minute') {
        return {
            action: 'minute',
            hour: parseInt(parts[2]),
            minute: parseInt(parts[3])
        };
    }

    if (parts[1] === 'confirm') {
        return {
            action: 'confirm',
            hour: parseInt(parts[2]),
            minute: parseInt(parts[3])
        };
    }

    return null;
}

module.exports = {
    generateTimePicker,
    parseTimeCallback
};
