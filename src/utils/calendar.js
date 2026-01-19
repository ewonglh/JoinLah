const { Markup } = require('telegraf');

/**
 * Generates a calendar inline keyboard for a given month and year
 * @param {number} year - The year to display
 * @param {number} month - The month to display (0-11)
 * @returns {object} Telegraf inline keyboard markup
 */
function generateCalendar(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const buttons = [];

    // Header with month and year
    buttons.push([
        Markup.button.callback('<<', `cal_year_prev_${year}_${month}`),
        Markup.button.callback('<', `cal_month_prev_${year}_${month}`),
        Markup.button.callback(`${monthNames[month]} ${year}`, 'cal_ignore'),
        Markup.button.callback('>', `cal_month_next_${year}_${month}`),
        Markup.button.callback('>>', `cal_year_next_${year}_${month}`)
    ]);

    // Day of week headers
    buttons.push([
        Markup.button.callback('Su', 'cal_ignore'),
        Markup.button.callback('Mo', 'cal_ignore'),
        Markup.button.callback('Tu', 'cal_ignore'),
        Markup.button.callback('We', 'cal_ignore'),
        Markup.button.callback('Th', 'cal_ignore'),
        Markup.button.callback('Fr', 'cal_ignore'),
        Markup.button.callback('Sa', 'cal_ignore')
    ]);

    // Calendar days
    let week = [];

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) {
        week.push(Markup.button.callback(' ', 'cal_ignore'));
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        week.push(Markup.button.callback(day.toString(), `cal_day_${year}_${month}_${day}`));

        if (week.length === 7) {
            buttons.push(week);
            week = [];
        }
    }

    // Fill remaining cells
    if (week.length > 0) {
        while (week.length < 7) {
            week.push(Markup.button.callback(' ', 'cal_ignore'));
        }
        buttons.push(week);
    }

    // Cancel button
    buttons.push([Markup.button.callback('❌ Cancel', 'cal_cancel')]);

    return Markup.inlineKeyboard(buttons);
}

/**
 * Parses calendar callback data
 * @param {string} data - Callback data from button press
 * @returns {object|null} Parsed calendar action or null if invalid
 */
function parseCalendarCallback(data) {
    if (!data.startsWith('cal_')) return null;

    if (data === 'cal_ignore') {
        return { action: 'ignore' };
    }

    if (data === 'cal_cancel') {
        return { action: 'cancel' };
    }

    const parts = data.split('_');

    if (parts[1] === 'day') {
        return {
            action: 'select',
            year: parseInt(parts[2]),
            month: parseInt(parts[3]),
            day: parseInt(parts[4])
        };
    }

    if (parts[1] === 'month') {
        const year = parseInt(parts[3]);
        let month = parseInt(parts[4]);

        if (parts[2] === 'prev') {
            month--;
            if (month < 0) {
                month = 11;
                return { action: 'navigate', year: year - 1, month };
            }
        } else if (parts[2] === 'next') {
            month++;
            if (month > 11) {
                month = 0;
                return { action: 'navigate', year: year + 1, month };
            }
        }

        return { action: 'navigate', year, month };
    }

    if (parts[1] === 'year') {
        const year = parseInt(parts[3]);
        const month = parseInt(parts[4]);

        if (parts[2] === 'prev') {
            return { action: 'navigate', year: year - 1, month };
        } else if (parts[2] === 'next') {
            return { action: 'navigate', year: year + 1, month };
        }
    }

    return null;
}

module.exports = {
    generateCalendar,
    parseCalendarCallback
};
