const { Scenes } = require('telegraf');

// Import step handlers from separate modules
const { showDashboard, handleDashboardAction } = require('./steps/dashboard');
const {
    getEventName,
    handleCalendarNavigation,
    handleTimePicker,
    getEventLocation,
    getEventDescription,
    getEventCapacityAndFinalize
} = require('./steps/createEvent');
const {
    handlePreviewSelection,
    handlePreviewActions,
    handleEditInput
} = require('./steps/previewEvent');
const { handleRemindStats } = require('./steps/remindStats');

/**
 * Organiser Scene - Main wizard for event organisers
 * 
 * Step Map:
 * - Step 0: Dashboard (showDashboard)
 * - Step 1: Dashboard Action Handler (handleDashboardAction)
 * - Step 2: Create Event - Get Name (getEventName)
 * - Step 3: Create Event - Calendar Navigation (handleCalendarNavigation)
 * - Step 4: Create Event - Time Picker (handleTimePicker)
 * - Step 5: Create Event - Get Location (getEventLocation)
 * - Step 6: Create Event - Get Description (getEventDescription)
 * - Step 7: Create Event - Get Capacity & Finalize (getEventCapacityAndFinalize)
 * - Step 8: Preview Event Selection Handler (handlePreviewSelection)
 * - Step 9: Preview Actions (handlePreviewActions)
 * - Step 10: Handle Edit Input (handleEditInput)
 * - Step 11: Remind/Stats Handler (handleRemindStats)
 */
const organiserScene = new Scenes.WizardScene(
    'ORGANISER_SCENE',
    showDashboard,                    // Step 0
    handleDashboardAction,            // Step 1
    getEventName,                     // Step 2
    handleCalendarNavigation,         // Step 3
    handleTimePicker,                 // Step 4
    getEventLocation,                 // Step 5
    getEventDescription,              // Step 6
    getEventCapacityAndFinalize,      // Step 7
    handlePreviewSelection,           // Step 8
    handlePreviewActions,             // Step 9
    handleEditInput,                  // Step 10
    handleRemindStats                 // Step 11
);

module.exports = organiserScene;
