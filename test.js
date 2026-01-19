const { getAllEvents, listRegistrationsForEvent } = require('./src/db/queries');

test('getAllEvents returns an array', async () => {
    const events = await getAllEvents();
    expect(Array.isArray(events)).toBe(true);
});

test('listRegistrationsForEvent returns an array', async () => {
    // Assuming you have at least one event in your test database or can mock this
    // For now, let's just checking if the function executes without error
    const registrations = await listRegistrationsForEvent('some-event-id');
    expect(Array.isArray(registrations)).toBe(true);
});
