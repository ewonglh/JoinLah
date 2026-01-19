## Setup
1. npm install
2. Copy .env.example → .env
3. Set SUPABASE_DB_URL (from Member B)
4. npm test  (runs test-db.js)

## Usage
const db = require('./db');
const user = await db.getOrCreateUser(msg.from.id, profile);
await db.setBotState(userId, 'ASK_NAME', eventId);

## Database Functions (`db/index.js`)

### Member A (Bot Flow)
getOrCreateUser(telegramUserId, profile) → User row
getBotState(telegramUserId) → State row or null
setBotState(userId, state, eventId, tempData) → Updated state
clearBotState(telegramUserId) → void
createRegistration({eventId, userId, participantName, ...}) → Registration row
getEvent(eventId) → Event row


### Member C (Staff Commands)
listRegistrationsForEvent(eventId) → Array[registrations]


### Testing
createEvent({title, organiserId, dateTime, ...}) → Event row


**Example usage:**
```javascript
// Signup flow (Member A)
const user = await db.getOrCreateUser(msg.from.id, {name: 'Alice'});
await db.setBotState(userId, 'ASK_NAME', eventId);

// Staff roster (Member C)  
const roster = await db.listRegistrationsForEvent(eventId);
Test: node db/test-db.js