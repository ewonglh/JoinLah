const { showDashboard, handleDashboardAction } = require('./dashboard');
const {
    getEventName,
    handleCalendarNavigation,
    handleTimePicker,
    getEventLocation,
    getEventDescription,
    getEventPhoto,
    getEventCapacityAndFinalize
} = require('./createEvent');
const {
    handlePreviewSelection,
    handlePreviewActions,
    handleEditInput
} = require('./previewEvent');
const { handleRemindStats } = require('./remindStats');

module.exports = {
    // Dashboard steps
    showDashboard,
    handleDashboardAction,

    // Create event steps
    getEventName,
    handleCalendarNavigation,
    handleTimePicker,
    getEventLocation,
    getEventDescription,
    getEventPhoto,
    getEventCapacityAndFinalize,

    // Preview event steps
    handlePreviewSelection,
    handlePreviewActions,
    handleEditInput,

    // Remind/Stats step
    handleRemindStats
};
