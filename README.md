# Warden Discord Moderation Bot

Warden is a modern Discord moderation bot with robust logging, moderation commands, and utility features. All log channels and settings are managed via slash commands no config file editing required.

IF there is any issues or bugs please add me in discord AyaanplayszYT

## FIXES
- Warnings bugs
- Does not log other bots edited or deleted messaqges 
  can be set in events/messageDelete.js. Lines 10 and 11

      // Ignore logs for bots by user ID (cricket guru: 814100764787081217)
    const botIdsToIgnore = ['814100764787081217'];
- deleted messages contaning images are now logged aswell
- When the bot is pinged it gives a cool msg lol

More Stuff coming soon!

## Features
- Moderation: Ban, Kick, Mute, Warn (with DM notification)
- Logging: Mod logs (bans, kicks, mutes, warns, channel changes), Spam logs (message deletes/edits)
- Utility: Ping, Userinfo, Serverinfo, Avatar
- Fun: Joke
- Welcome/Leave messages and auto-role assignment
- All commands work as both prefix and slash commands
- All log channels set via `/setmodlog` and `/setspamlog`
- LATEST: Members Cannot use @everyone or @here

## Setup
1. Clone the repo and install dependencies:
    ```bash
    npm install
    ```
2. Create a `.env` file with your bot token and IDs:
    ```env
    DISCORD_TOKEN=your_bot_token
    CLIENT_ID=your_bot_application_id
    GUILD_ID=your_guild_id
    ```
3. Run the deploy script to register slash commands:
    ```bash
    node deploy-commands.js
    ```
4. Start the bot:
    ```bash
    npm start
    ```
5. In Discord, use `/setmodlog` and `/setspamlog` in the channels you want logs sent to.
6. Use `/help` to see all available commands.

## Usage
- Moderation actions are logged in the mod log channel.
- Spam actions (message deletes/edits) are logged in the spam log channel.
- Warned users receive a DM with details.

## Contributing
Pull requests and suggestions are welcome!

## License
MIT
    ```
    DISCORD_TOKEN=YOUR_BOT_TOKEN
    ```
    -   (Optional) Modify `config/config.json` to change the bot's prefix or set your user ID as the owner.

### Running the Bot

Once you've completed the setup, you can start the bot with:

```bash
npm start
```

Your bot should now be online and ready to respond to commands in any server it has been invited to.

## Bot Structure

The project is organized into several key directories:

-   `/commands`: Contains all the command files, sorted into categories.
-   `/events`: Contains handlers for Discord gateway events (e.g., `ready`, `messageCreate`).
-   `/structures`: Base classes for commands and events.
-   `/utils`: Helper functions and utilities like embed builders and loggers.
-   `/config`: JSON configuration files for settings, colors, and emojis.
-   `index.js`: The main entry point of the application.
