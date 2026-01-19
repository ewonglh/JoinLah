const path = require('path');
// Try to load .env from the root of the project
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('./queries');

async function test() {
  console.log('Testing DB queries...');
  try {
    const organiserId = 123456789;
    const participantId = 111222333;

    // 1. Test createEvent
    console.log('\n--- Testing createEvent ---');
    const event = await db.createEvent({
      title: 'Automated Test Event',
      organiserTelegramId: organiserId,
      dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      location: 'Test Location',
      capacity: 50,
      description: 'This is a test event created by the test script.',
      image_url: 'test_image_id'
    });
    console.log('✅ Event Created:', event.title, '(ID:', event.id, ')');

    // 2. Test getEventsByOrganiser
    console.log('\n--- Testing getEventsByOrganiser ---');
    const events = await db.getEventsByOrganiser(organiserId);
    console.log('✅ Events found:', events.length);
    if (events.length === 0) throw new Error('No events found for organiser');

    // 3. Test updateEvent
    console.log('\n--- Testing updateEvent ---');
    const updatedEvent = await db.updateEvent(event.id, {
      title: 'Updated Test Event Title',
      capacity: 100
    });
    console.log('✅ Event Updated:', updatedEvent.title, '(Capacity:', updatedEvent.capacity, ')');

    // 4. Test User & Registration
    console.log('\n--- Testing User Creation & Registration ---');
    await db.getOrCreateUser(participantId, {
      name: 'Test Participant',
      username: 'test_user'
    });

    const reg = await db.createRegistration({
      eventId: event.id,
      userTelegramId: participantId,
      participantName: 'Test Participant',
      participantAge: 25
    });
    console.log('✅ Registration Created for:', reg.participant_name);

    // 5. Test getEventRegistrationCount
    console.log('\n--- Testing getEventRegistrationCount ---');
    const count = await db.getEventRegistrationCount(event.id);
    console.log('✅ Registration Count:', count);
    if (count !== 1) throw new Error('Count mismatch');

    // 6. Test getRegistrationsForExport
    console.log('\n--- Testing getRegistrationsForExport ---');
    const regsForExport = await db.getRegistrationsForExport(event.id);
    console.log('✅ Registrations found for export:', regsForExport.length);
    console.log('Sample data:', regsForExport[0]);

    // 7. Cleanup (Optional, but good for repeatable tests)
    // console.log('\n--- Cleanup ---');
    // await db.supabase.from('registrations').delete().eq('event_id', event.id);
    // await db.supabase.from('events').delete().eq('id', event.id);
    // console.log('✅ Cleanup complete');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

test();
