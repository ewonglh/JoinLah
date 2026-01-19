/**
 * Format date string to a user-friendly format
 * Input: "2026-01-20 14:30" or ISO date string
 * Output: "Mon, 20 Jan 2026 at 2:30 PM"
 */
function formatEventDate(dateStr) {
    if (!dateStr) return 'TBD';

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return original if invalid

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert to 12-hour format

        return `${dayName}, ${day} ${month} ${year} at ${hours}:${minutes} ${ampm}`;
    } catch (e) {
        return dateStr; // Return original on error
    }
}

module.exports = { formatEventDate };
