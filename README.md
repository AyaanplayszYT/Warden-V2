# 🛡️ Warden V2 - Discord Moderation Bot

<div align="center">

![Warden Logo](https://img.shields.io/badge/Warden-V2-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A powerful, modern Discord moderation bot with comprehensive logging, moderation commands, and utility features.**

[Features](#-features) • [Installation](#-installation) • [Commands](#-commands) • [Configuration](#%EF%B8%8F-configuration) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🛡️ Moderation
- **Ban/Unban** - Ban users with optional message deletion and DM notifications
- **Kick** - Remove users from the server with logging
- **Mute/Unmute** - Timeout users for configurable durations
- **Warn** - Issue warnings with persistent storage and auto-escalation
- **Softban** - Ban and immediately unban to clear messages
- **Purge** - Bulk delete messages with powerful filters (by user, content, bots, attachments)
- **Slowmode** - Set channel slowmode with easy duration parsing
- **Lock/Unlock** - Lock channels during emergencies

### 📋 Comprehensive Logging
- **Mod Logs** - Track all moderation actions (bans, kicks, mutes, warns)
- **Spam Logs** - Monitor message edits and deletions
- **Channel Logs** - Track channel creates, updates, and deletions
- **Member Logs** - Join/leave tracking with account age detection

### 🔧 Utility Commands
- **Help** - Interactive help menu with category navigation
- **Userinfo** - Detailed user information with badges and permissions
- **Serverinfo** - Comprehensive server statistics
- **Avatar** - View user avatars with download options
- **Roleinfo** - Detailed role information and permissions
- **Emojiinfo** - Custom emoji details with download links
- **Poll** - Create interactive polls with voting
- **Remind** - Set personal reminders
- **Snipe** - Retrieve deleted/edited messages

### 🔐 Security
- **Permission-based Commands** - All moderation commands require proper permissions
- **Role Hierarchy** - Cannot moderate users with equal or higher roles
- **DM Notifications** - Users are notified when moderated (configurable)
- **Confirmation Dialogs** - Important actions require confirmation

---

## 📦 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/AyaanplayszYT/Warden-V2.git
   cd Warden-V2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_bot_client_id
   GUILD_ID=your_test_server_id  # Optional: for guild-specific deployment
   ```

4. **Deploy slash commands**
   ```bash
   node deploy-commands.js
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

6. **Configure in Discord**
   - Use `/setmodlog` in your mod log channel
   - Use `/setspamlog` in your spam log channel
   - Use `/help` to see all available commands

---

## 📋 Commands

### 🛡️ Moderation Commands
> These commands require specific permissions and can only be used by moderators.

| Command | Description | Permission |
|---------|-------------|------------|
| `/ban` | Ban a user from the server | Ban Members |
| `/unban` | Unban a user by ID | Ban Members |
| `/kick` | Kick a user from the server | Kick Members |
| `/mute` | Timeout a user for a duration | Moderate Members |
| `/unmute` | Remove timeout from a user | Moderate Members |
| `/warn` | Issue a warning to a user | Moderate Members |
| `/warnings` | View/manage user warnings | Moderate Members |
| `/softban` | Ban + unban to delete messages | Ban Members |
| `/purge` | Bulk delete messages | Manage Messages |
| `/slowmode` | Set channel slowmode | Manage Channels |
| `/lock` | Lock a channel | Manage Channels |
| `/unlock` | Unlock a channel | Manage Channels |

### ℹ️ Information Commands
| Command | Description |
|---------|-------------|
| `/userinfo` | Display user information |
| `/serverinfo` | Display server statistics |
| `/avatar` | View a user's avatar |
| `/roleinfo` | Display role information |
| `/emojiinfo` | Display emoji information |

### 🔧 Utility Commands
| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/ping` | Check bot latency |
| `/poll` | Create an interactive poll |
| `/remind` | Set a reminder |
| `/snipe` | View deleted/edited messages |
| `/modlogs` | View moderation history |
| `/spamlogs` | View spam log history |

### ⚙️ Configuration Commands
> Administrator permissions required.

| Command | Description |
|---------|-------------|
| `/setmodlog` | Set the mod log channel |
| `/setspamlog` | Set the spam log channel |
| `/setupcolors` | Configure color roles |

---

## ⚙️ Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your bot's token | ✅ |
| `CLIENT_ID` | Your bot's application ID | ✅ |
| `GUILD_ID` | Test server ID (for instant deployment) | ❌ |

### Config Files

**`config/config.json`**
```json
{
    "prefix": "!",
    "ownerId": "your_user_id",
    "maxWarnings": 5,
    "autoModEnabled": true
}
```

**`config/colors.json`** - Customize embed colors
**`config/emojis.json`** - Customize bot emojis

---

## 📁 Project Structure

```
Warden-V2/
├── commands/
│   ├── moderation/     # Moderation commands (ban, kick, mute, etc.)
│   └── utility/        # Utility commands (help, ping, userinfo, etc.)
├── config/
│   ├── colors.json     # Color configurations
│   ├── config.json     # Bot settings
│   └── emojis.json     # Emoji configurations
├── data/
│   ├── logChannels.json    # Saved log channel IDs
│   ├── warnings.json       # User warnings database
│   └── reminders.json      # User reminders
├── events/             # Discord event handlers
├── structures/         # Base classes
├── utils/
│   ├── embedBuilder.js     # Embed utilities
│   ├── logger.js           # Console logger
│   ├── modLogs.js          # Mod logging utility
│   ├── spamLogs.js         # Spam logging utility
│   └── warningsDB.js       # Warnings database
├── deploy-commands.js  # Command deployment script
├── index.js            # Bot entry point
└── package.json
```

---

## 🐛 Known Issues & Fixes

- **Warnings bugs** - Fixed with new JSON database system
- **Bot message logging** - Configure ignored bot IDs in `events/messageDelete.js`
- **Image logging** - Deleted messages with attachments are now logged with image URLs

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

If you encounter any issues or have suggestions, please:
- Open an [Issue](https://github.com/AyaanplayszYT/Warden-V2/issues)
- Contact on Discord: **AyaanplayszYT**

---

<div align="center">

**Made with ❤️ by [AyaanplayszYT](https://github.com/AyaanplayszYT)**

⭐ Star this repo if you find it useful!

</div>
