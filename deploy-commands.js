const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

if (!process.env.DISCORD_TOKEN) {
    console.error('[ERROR] DISCORD_TOKEN is not defined in .env');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('[ERROR] CLIENT_ID is not defined in .env');
    process.exit(1);
}

const commands = [];
const commandsPath = path.resolve(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

console.log('[DEPLOY] Loading application commands...\n');

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    console.log(`[CATEGORY] ${folder.toUpperCase()} (${commandFiles.length} commands)`);

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if ('data' in command) {
                const commandJSON = typeof command.data.toJSON === 'function'
                    ? command.data.toJSON()
                    : command.data;

                commands.push(commandJSON);
                console.log(`   + /${commandJSON.name}`);
            } else {
                console.log(`   [WARN] ${file} - Missing required 'data' export`);
            }
        } catch (error) {
            console.log(`   [FAIL] ${file} - Error: ${error.message}`);
        }
    }
    console.log('');
}

console.log(`[STATUS] Total commands indexed: ${commands.length}\n`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('[REST] Synchronizing slash commands with Discord API...\n');

        if (process.env.GUILD_ID) {
            console.log(`[REST] Deploying to target guild: ${process.env.GUILD_ID}`);
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`[SUCCESS] Deployed ${data.length} commands to guild.`);
        } else {
            console.log('[REST] Deploying globally across all Discord guilds...');
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`[SUCCESS] Deployed ${data.length} global commands.`);
        }

        console.log('\n[COMPLETE] Deployment process finished successfully.\n');

    } catch (error) {
        console.error('[ERROR] Command deployment failed:', error);
        process.exit(1);
    }
})();
