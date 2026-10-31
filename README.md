# Warden - Advanced Discord Moderation & Utility System

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![Discord Components V2](https://img.shields.io/badge/Discord_Components-V2-5865F2?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A high-performance Discord administration bot rebuilt from the ground up on Discord Components V2 with zero-emoji aesthetic typography, modular layouts, and audit capabilities.**

[Architecture](#architecture) • [Installation](#installation) • [Commands](#commands) • [Configuration](#configuration)

</div>

---

## Architecture: Discord Components V2

Warden has replaced legacy embeds and emoji-heavy message layouts with **Discord Components V2** (`flags: MessageFlags.IsComponentsV2`):
- **Container Layouts (Type 17):** Modular cards styled with high-contrast accent color borders (`#5865F2` Blurple, `#ED4245` Crimson, `#57F287` Emerald Mint, `#FEE75C` Amber).
- **Text Displays (Type 10):** Clean typographic headers, markdown grids, and metadata blocks without emoji clutter.
- **Visual Separators (Type 14):** Structural divider lines and micro-spacing between sections.
- **Integrated Action Rows (Type 1):** Native interactive buttons and select menus seamlessly nested inside component cards.
- **Resilient Fallback Engine:** Automatic fallbacks ensure compatibility across all Discord client interfaces.

---

## Features

### Moderation Enforcement
- **Ban / Softban / Unban:** Permanent and temporary exclusion with message history purge options and direct message audit alerts.
- **Timeout / Mute / Unmute:** Fine-grained member timeout controls using native duration parsing (`ms`).
- **Kick:** Immediate server removal with hierarchy permission safeguards.
- **Warning Ledger:** Persistent file-backed warning system with Case IDs, audit search, pagination, and deletion.
- **Lockdown Control:** Emergency channel locking (`/lock`, `/unlock`) and rate limit adjustment (`/slowmode`).
- **Purge Engine:** Bulk deletion (1-100 messages) with multi-criteria filtering (target user, bot messages, text content).

### Telemetry & Intelligence
- **Network Status (`/ping`):** Gateway WebSocket latency, HTTP roundtrip, and real-time status metrics.
- **User Intelligence (`/userinfo`):** Account age, guild join timestamp, role hierarchy, elevated permissions, and recognition flags.
- **Server Specifications (`/serverinfo`):** Verification levels, channel counts, member demographics, and boost tiers.
- **Asset Inspection (`/avatar`, `/emojiinfo`):** High-resolution media asset extraction with format download links.
- **Role Audits (`/roleinfo`):** Role permission bits, hoist state, and member counts.

### Utility & Automation
- **Interactive Live Polls (`/poll`):** Dynamic ballots with real-time percentage indicators and anonymous voting.
- **Scheduled Reminders (`/remind`):** Persistent asynchronous reminder scheduling with DM fallbacks.
- **Message Snipe (`/snipe`):** In-memory audit tracking for recently deleted and edited messages.
- **Vanity Color Roles (`/setupcolors`):** Self-service color assignment via Discord select menus.

---

## Installation

### Prerequisites
- Node.js v18.0.0 or higher
- A registered Discord Application with Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AyaanplayszYT/Warden-V2.git
   cd Warden-V2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_client_id
   GUILD_ID=your_test_server_id # Optional: For instant guild-specific slash command registration
   ```

4. **Deploy application slash commands:**
   ```bash
   node deploy-commands.js
   ```

5. **Start the bot:**
   ```bash
   npm start
   ```

---

## Commands

### Moderation
| Command | Description | Permission Requirement |
| :--- | :--- | :--- |
| `/ban` | Ban a user with optional message deletion and DM notice | Ban Members |
| `/unban` | Revoke a guild ban by Discord User ID | Ban Members |
| `/kick` | Remove a member from the guild | Kick Members |
| `/mute` | Apply communication timeout (e.g. `10m`, `2h`, `1d`) | Moderate Members |
| `/unmute` | Remove active communication timeout | Moderate Members |
| `/warn` | Issue an official recorded warning | Moderate Members |
| `/warnings` | Inspect, clear, or remove warnings by Case ID | Moderate Members |
| `/softban` | Ban and immediately unban to clear message history | Ban Members |
| `/purge` | Bulk delete messages with user/bot/content filters | Manage Messages |
| `/slowmode` | Set channel message rate limit delay | Manage Channels |
| `/lock` | Restrict member message transmission in channel | Manage Channels |
| `/unlock` | Restore normal message permissions in channel | Manage Channels |

### Intelligence & Telemetry
| Command | Description | Access |
| :--- | :--- | :--- |
| `/userinfo` | Inspect profile metadata, permissions, and roles | Public |
| `/serverinfo` | Display guild telemetry, security tier, and metrics | Public |
| `/avatar` | View user profile image with download links | Public |
| `/roleinfo` | Display role hierarchy and assigned permissions | Public |
| `/emojiinfo` | Inspect custom emoji assets and metadata | Public |
| `/ping` | Real-time WebSocket and HTTP latency metrics | Public |

### Utility & Management
| Command | Description | Access |
| :--- | :--- | :--- |
| `/help` | Interactive directory and command documentation | Public |
| `/poll` | Launch interactive voting poll | Public |
| `/remind` | Schedule personal asynchronous reminders | Public |
| `/snipe` | Inspect deleted or edited message records | Public |
| `/modlogs` | View recent guild moderation enforcement actions | Moderate Members |
| `/spamlogs` | Inspect automated anti-spam and auto-mod detections | Moderate Members |
| `/setmodlog` | Route moderation audit records to a channel | Manage Server |
| `/setspamlog` | Route spam detections and deletions to a channel | Manage Server |
| `/setupcolors` | Deploy vanity color role selector | Administrator |

---

## Configuration

### Settings (`config/config.json`)
```json
{
  "prefix": "!",
  "ownerId": "your_user_id",
  "defaultCooldown": 3,
  "maxWarnings": 5,
  "autoModEnabled": true,
  "antiSpamEnabled": true,
  "antiSpamThreshold": 5,
  "antiSpamInterval": 5000,
  "embedFooter": "Warden | Security & Utility",
  "version": "4.0.0"
}
```

### Color Palette (`config/colors.json`)
Allows custom accent color mapping for Discord Components V2 containers and embeds.

---

## Project Structure

```
Warden-V2/
├── commands/
│   ├── moderation/      # Moderation commands (ban, kick, mute, lock, etc.)
│   └── utility/         # Utility commands (help, ping, userinfo, poll, etc.)
├── config/
│   ├── colors.json      # Theme palette and accent colors
│   ├── config.json      # General system configuration
│   └── emojis.json      # Empty placeholder mapping (emoji-free design)
├── data/
│   ├── colorRoles.json  # Vanity color role mapping
│   ├── logChannels.json # Channel routing for mod and spam logs
│   ├── purgeLogs.txt    # Audit log file for bulk deletions
│   └── reminders.json   # Persistent reminders storage
├── events/              # Gateway event listeners
├── structures/          # Base command and event definitions
├── utils/
│   ├── v2Components.js  # Discord Components V2 Engine (V2Card, V2Templates)
│   ├── embedBuilder.js  # Unified builder facade & fallback adapter
│   ├── logger.js        # Formatted console logger
│   ├── modLogs.js       # In-memory moderation log store
│   ├── spamLogs.js      # In-memory spam log store
│   └── warningsDB.js    # Persistent warnings database
├── deploy-commands.js   # Slash command deployment tool
├── index.js             # Main process entry point
└── package.json
```

---

## License

This project is licensed under the MIT License.
