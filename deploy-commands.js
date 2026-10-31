const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('[ERROR] DISCORD_TOKEN is not defined in .env');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('[ERROR] CLIENT_ID is not defined in .env');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

console.log('[DEPLOY] Loading command specifications...\n');

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

            if ('data' in command && command.data.name) {
                const commandData = {
                    name: command.data.name,
                    description: command.data.description || 'No description provided',
                    options: command.data.options || [],
                    dm_permission: false,
                };

                if (command.data.default_member_permissions) {
                    commandData.default_member_permissions = command.data.default_member_permissions.toString();
                }

                commands.push(commandData);
                console.log(`   + /${command.data.name}`);
            } else {
                console.log(`   [WARN] ${file} - Missing required 'data' property`);
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
        console.log('[REST] Synchronizing application slash commands with Discord API...\n');

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

        console.log('\n[REGISTRY SUMMARY]');
        console.log('─'.repeat(50));

        const modCommands = commands.filter(c => c.default_member_permissions);
        const utilCommands = commands.filter(c => !c.default_member_permissions);

        console.log(`Moderation Commands (${modCommands.length}):`);
        modCommands.forEach(c => console.log(`   /${c.name}`));

        console.log(`\nUtility & Intelligence Commands (${utilCommands.length}):`);
        utilCommands.forEach(c => console.log(`   /${c.name}`));

        console.log('─'.repeat(50));
        console.log('[COMPLETE] Deployment process finished successfully.\n');

    } catch (error) {
        console.error('[ERROR] Command deployment failed:', error);
        process.exit(1);
    }
})();
