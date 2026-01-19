// test-db.js - run with: node test-db.js
require('dotenv').config();
const db = require('../db');

async function test() {
  try {
    // Test user
    const user = await db.getOrCreateUser(111222333, {
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('User:', user);

    // Test event
    const event = await db.createEvent({
      title: 'Test Event',
      organiserTelegramId: 123456789,
      dateTime: '2026-01-26 14:00:00+08',
      location: 'Test Hall',
      capacity: 10
    });
    console.log('Event:', event);

    // Test bot state
    await db.setBotState(111222333, 'ASK_NAME', event.id, { email: 'test@test.com' });
    const state = await db.getBotState(111222333);
    console.log('Bot state:', state);

    // Test registration
    const reg = await db.createRegistration({
      eventId: event.id,
      userTelegramId: 111222333,
      participantName: 'Test Participant'
    });
    console.log('Registration:', reg);

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
