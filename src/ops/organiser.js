const { Scenes } = require('telegraf');

// Import step handlers from separate modules
const { showDashboard, handleDashboardAction } = require('./steps/dashboard');
const {
    getEventName,
    handleCalendarNavigation,
    handleTimePicker,
    getEventLocation,
    getEventDescription,
    getEventPhoto,
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
 * - Step 7: Create Event - Get Photo (getEventPhoto)
 * - Step 8: Create Event - Get Capacity & Finalize (getEventCapacityAndFinalize)
 * - Step 9: Preview Event Selection Handler (handlePreviewSelection)
 * - Step 10: Preview Actions (handlePreviewActions)
 * - Step 11: Handle Edit Input (handleEditInput)
 * - Step 12: Remind/Stats Handler (handleRemindStats)
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
    getEventPhoto,                    // Step 7
    getEventCapacityAndFinalize,      // Step 8
    handlePreviewSelection,           // Step 9
    handlePreviewActions,             // Step 10
    handleEditInput,                  // Step 11
    handleRemindStats                 // Step 12
);

module.exports = organiserScene;
