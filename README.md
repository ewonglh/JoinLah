# JoinLah Bot 🇸🇬

JoinLah is a feature-rich Telegram bot designed to streamline community event organisation and registration. It provides a seamless experience for both event organisers and participants, handling everything from event creation to participant management and reminders.

## ✨ Features

### For Participants
- **Easy Registration**: Sign up for events instantly using deep links.
- **Profile Management**: Set up your profile once (Name, Phone) and register for future events with a single tap.
- **Event Details**: View comprehensive event information including Date, Time, Location, Capacity, and the Host.
- **On-Behalf Registration**: Register friends or family members easily.

### For Organisers
- **Interactive Dashboard**: Manage all your events from a central menu.
- **Wizard-Style Creation**: Create professional event listings step-by-step (Name, Calendar Date, Time Picker, Location, Photo, Capacity).
- **Registration Management**: View real-time attendee lists and statistics.
- **Broadcasting**: Send reminders to all registered participants.
- **Channel Publishing**: Publish beautifully formatted event cards to your channel/group.
- **Data Export**: Export participant lists to Excel (`.xlsx`) for offline management.

## 🤖 Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot or access the main menu. |
| `/profile` | View or edit your user profile. |
| `/organiser` | Access the Organiser Dashboard (if authorized). |
| `/becomeorganiser` | Register yourself as an event organiser. |
| `/export` | (Organiser Only) Download participant list for an event. |
| `/help` | Show available commands and help text. |

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- A [Supabase](https://supabase.com/) project (for Database)
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ewonglh/JoinLah.git
   cd JoinLah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy `.env.sample` to `.env` and fill in your credentials:
   ```bash
   cp .env.sample .env
   ```
   
   **`.env` file:**
   ```env
   # Telegram
   BOT_TOKEN=your_telegram_bot_token

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

4. **Run the Bot**
   ```bash
   npm run start
   ```

### Database Schema
The bot requires the following Supabase tables:
- `users`: Stores user profiles.
- `events`: Stores event details.
- `registrations`: Links users to events.
- `bot_state`: (Optional) For managing complex conversation states.

## 🛠️ Deployment
This project is ready for deployment on platforms like [Render](https://render.com/).
- It includes a lightweight HTTP server to satisfy port binding requirements.
- Uses `render.yaml` for infrastructure-as-code configuration.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open source.