# Stride - Discord Focus & Habit Bot 🎯

Stride is a Discord bot designed to boost productivity through Pomodoro-style focus sessions and habit tracking. It helps eliminate distractions by temporarily locking you out of configured channels during focus time and supports building consistent habits with a robust tracking system.

## Features ✨

- - **Customizable Focus Sessions**: Set focus sessions from 1-60 minutes (default: 25 minutes)
- - **Channel Locking**: Automatically locks you out of specified channels during focus time
- - **Personal Configuration**: Each user can configure their own set of channels to lock
- - **Session Management**: Start, stop, and check the status of your focus sessions
- - **Automatic Notifications**: Get notified when your focus session ends
- - **Guild-Specific Settings**: Different channel configurations per Discord server
- - **Habit Tracking**: Create, log, edit, and track habits with streaks, reminders, and leaderboards
- - **Motivational Feedback**: Receive celebratory messages for habit milestones and streaks
- - **Server-Wide Leaderboards**: Compare habit progress with others in your server

## Commands 🤖

### Focus Commands

#### `/focus-config`

Configure which channels to lock during your focus sessions.

**Subcommands:**

- - `add` - Add up to 5 channels to your lock list
- - `remove` - Remove a specific channel from your lock list
- - `list` - View all your currently configured channels
- - `clear` - Remove all channels from your lock list

**Example:**

```
/focus-config add channel1:#general channel2:#random
```

#### `/focus-start`

Begin a new focus session.

**Options:**

- - `minutes` (optional) - Length of session in minutes (default: 25)

**Example:**

```
/focus-start minutes:45
```

#### `/focus-status`

Check the remaining time on your active focus session.

#### `/focus-stop`

Cancel your current focus session and unlock all channels immediately.

#### `/focus-test`

Test command to verify the bot is working properly.

### Habit Commands

#### `/habit-create`

Create a new habit to track.

**Options:**

- - `name` (required) - Name of the habit (must be unique, e.g., "Exercise")
- - `description` (optional) - Brief description of the habit
- - `frequency` (optional) - How often to do the habit (daily, weekly, custom; default: daily)
- - `target` (optional) - Daily/weekly target count (default: 1)
- - `emoji` (optional) - Emoji to represent the habit (default: ✅)

**Example:**

```
/habit-create name:Exercise description:Daily workout target:1 emoji:💪
```

#### `/habit-delete`

Delete a habit from your tracker.

**Options:**

- - `habit` (required) - Name of the habit to delete (supports autocomplete)

**Example:**

```
/habit-delete habit:Exercise
```

#### `/habit-edit`

Edit a habit's details or completion entries.

**Options:**

- - `habit` (required) - Name of the habit to edit (supports autocomplete)
- - `action` (required) - Choose to edit details, a completion entry, or delete a completion
- - `date` (optional) - Date of completion to edit/delete (YYYY-MM-DD)

**Example:**

```
/habit-edit habit:Exercise action:details
```

#### `/habit-log`

Log the completion of a habit.

**Options:**

- - `habit` (required) - Name of the habit to log (supports autocomplete)
- - `count` (optional) - Number of times completed (default: 1)
- - `date` (optional) - Date to log for (YYYY-MM-DD, default: today)
- - `notes` (optional) - Notes about the completion

**Example:**

```
/habit-log habit:Exercise count:2 date:2025-06-03 notes:Felt great!
```

#### `/habit-reminder`

Send reminders to users who haven't completed their daily habits.

**Options:**

- - `type` (optional) - Reminder tone (gentle, motivational, summary; default: gentle)
- - `public` (optional) - Send in channel (true) or DM (false, default)

**Example:**

```
/habit-reminder type:motivational public:false
```

#### `/habit-status`

View detailed status of a specific habit, including streaks and a visual calendar.

**Options:**

- - `habit` (required) - Name of the habit to view (supports autocomplete)
- - `days` (optional) - Number of recent days to show (1–30, default: 7)

**Example:**

```
/habit-status habit:Exercise days:7
```

#### `/habit-leaderboard`

View a server-wide leaderboard for habit statistics.

**Options:**

- - `category` (optional) - Leaderboard category (streak, longest, completions, habits; default: streak)
- - `limit` (optional) - Number of users to show (5–25, default: 10)

**Example:**

```
/habit-leaderboard category:completions limit:10
```

#### `/habit-list`

List all your habits or view someone else's.

**Options:**

- - `user` (optional) - Select a user to view their habits (default: you)
- - `detailed` (optional) - Show detailed view with progress bars (default: false)

**Example:**

```
/habit-list user:@friend detailed:true
```

## Setup & Installation 🛠️

### Prerequisites

- - Node.js (v16.9.0 or higher)
- - A Discord Bot Token
- - Discord Server with appropriate permissions

### Installation Steps

1.  1. **Clone the repository**
1.
1.      ```bash
1.      git clone <your-repo-url>
1.      cd stride-discord-bot
1.      ```
1.
1.  2. **Install dependencies**
1.
1.      ```bash
1.      npm install
1.      ```
1.
1.  3. **Environment Configuration** Create a `.env` file in the root directory:
1.
1.      ```env
1.      DISCORD_TOKEN=your_bot_token_here
1.      CLIENT_ID=your_bot_client_id_here
1.      GUILD_ID=your_server_id_here
1.      ```
1.
1.  4. **Deploy Commands**
1.
1.      ```bash
1.      node deploy-commands.js
1.      ```
1.
1.  5. **Start the Bot**
1.
1.      ```bash
1.      node index.js
1.      ```
1.

### Bot Permissions Required

Your bot needs the following permissions in your Discord server:

- - Send Messages
- - Use Slash Commands
- - Manage Channels (to modify channel permissions for focus sessions)
- - View Channels
- - Send Messages in Threads
- - Manage Messages (optional, for public habit reminders)

## How It Works 🔧

### Focus Sessions

1.  1. **Configuration Phase**: Users configure channels to lock during focus sessions using `/focus-config add`
1.  2. **Focus Session**: When a user starts a session with `/focus-start`, the bot:\* \* Temporarily removes their permission to send messages in configured channels
1.      * *   Starts a timer for the specified duration
1.      * *   Stores original permissions for restoration
1.  3. **Session End**: When the timer expires or the user stops the session:\* \* Original channel permissions are restored
1.      * *   User receives a completion notification via DM

### Habit Tracking

- - **Habit Creation**: Users create habits with unique names using `/habit-create`
- - **Logging Completions**: Log habit completions with `/habit-log`, tracking streaks and totals
- - **Reminders**: Send reminders for uncompleted habits with `/habit-reminder`
- - **Status & Analytics**: View detailed habit stats, including visual calendars, with `/habit-status`
- - **Community Engagement**: Compare progress via `/habit-leaderboard` or view others' habits with `/habit-list`
- - **Management**: Edit or delete habits and completions with `/habit-edit` and `/habit-delete`

## File Structure 📁

```
stride-discord-bot/
├── commands/
│   ├── focus/
│   │   ├── focusConfig.js    # Channel configuration commands
│   │   ├── focusStart.js     # Start focus session
│   │   ├── focusStatus.js    # Check session status
│   │   ├── focusStop.js      # Stop focus session
│   │   └── focusTest.js      # Test functionality
│   └── habit/
│       ├── habitCreate.js    # Create a new habit
│       ├── habitDelete.js    # Delete a habit
│       ├── habitEdit.js      # Edit habit details or completions
│       ├── habitLog.js       # Log habit completions
│       ├── habitReminder.js  # Send habit reminders
│       ├── habitStatus.js    # View habit status
│       ├── habitLeaderboard.js # Display habit leaderboard
│       └── habitList.js      # List user habits
├── events/
│   ├── interactionCreate.js  # Handle slash command interactions
│   └── ready.js             # Bot ready event
├── utils/
│   ├── channelLocker.js     # Channel permission management
│   ├── pomodoroManager.js   # Focus session management
│   ├── userConfig.js        # User configuration storage for focus
│   └── habitManager.js      # Habit data management
├── data/
│   ├── userConfig.json      # User focus settings (auto-generated)
│   └── habits.json          # User habit data (auto-generated)
├── deploy-commands.js       # Deploy slash commands
├── index.js                # Main bot file
└── package.json
```

## Configuration Storage 💾

### Focus Settings

User focus configurations are stored locally in `data/userConfig.json`. Each user's settings are stored per guild using the format `{userId}-{guildId}`.

**Example:**

```json
{
  "123456789-987654321": {
    "channels": ["channel_id_1", "channel_id_2"]
  }
}
```

### Habit Settings

Habit data is stored locally in `data/habits.json`. Each habit is identified by its unique name per user per guild.

**Example:**

```json
{
  "987654321": {
    "123456789": [
      {
        "name": "Exercise",
        "emoji": "💪",
        "description": "Daily workout",
        "frequency": "daily",
        "target": 1,
        "streak": 5,
        "longestStreak": 10,
        "totalCompletions": 15,
        "lastCompleted": "2025-06-03",
        "createdAt": "2025-01-01",
        "completions": [
          {
            "date": "2025-06-03",
            "count": 2,
            "notes": "Felt great!",
            "timestamp": "2025-06-03T10:00:00Z"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting 🔍

### Common Issues

**Bot doesn't respond to commands:**

- - Ensure the bot has been invited with proper permissions
- - Check that slash commands have been deployed with `node deploy-commands.js`
- - Verify the bot is online and the token is correct

**Channel locking doesn't work:**

- - Bot needs "Manage Channels" permission
- - Bot's role must be higher than the user's highest role
- - Ensure channels are configured with `/focus-config add`

**Habit commands fail:**

- - Ensure habit names are unique for the user in the server
- - Verify the `data/habits.json` file exists and is writable
- - Check for duplicate habit names when creating or editing

**Commands fail with errors:**

- - Check console logs for detailed error messages
- - Ensure all environment variables are set correctly
- - Verify the guild ID matches your Discord server

### Logs & Debugging

The bot provides comprehensive console logging. Monitor the console output for:

- - Command execution status
- - Permission changes for focus sessions
- - Habit creation, logging, and updates
- - Error messages and stack traces
- - Session and habit management events

## Contributing 🤝

1. 1. Fork the repository
1. 2. Create a feature branch (`git checkout -b feature/amazing-feature`)
1. 3. Commit your changes (`git commit -m 'Add amazing feature'`)
1. 4. Push to the branch (`git push origin feature/amazing-feature`)
1. 5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Support 💬

If you encounter any issues or have questions:

- - Check the troubleshooting section above
- - Review console logs for error details
- - Open an issue on the GitHub repository

---

**Happy Focusing & Habit Building! 🎯**

Stay productive with Stride - your personal focus and habit companion on Discord.
