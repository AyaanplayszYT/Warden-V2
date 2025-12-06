const fs = require('fs');
const path = require('path');
const { REST, Routes, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Error: DISCORD_TOKEN is not set in .env file');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('❌ Error: CLIENT_ID is not set in .env file');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

console.log('📦 Loading commands...\n');

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    
    // Skip if not a directory
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    console.log(`📁 ${folder.toUpperCase()} (${commandFiles.length} commands)`);
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            // Clear require cache to get fresh data
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('data' in command && command.data.name) {
                // Build the command object for Discord API
                const commandData = {
                    name: command.data.name,
                    description: command.data.description || 'No description provided',
                    options: command.data.options || [],
                    dm_permission: false, // Disable DM usage for all commands
                };

                // Add default member permissions if specified
                if (command.data.default_member_permissions) {
                    // Convert BigInt to string for JSON serialization
                    commandData.default_member_permissions = command.data.default_member_permissions.toString();
                }

                commands.push(commandData);
                console.log(`   ✅ /${command.data.name}`);
            } else {
                console.log(`   ⚠️  ${file} - Missing 'data' property`);
            }
        } catch (error) {
            console.log(`   ❌ ${file} - Error: ${error.message}`);
        }
    }
    console.log('');
}

console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log('🚀 Started refreshing application (/) commands...\n');
        
        if (process.env.GUILD_ID) {
            // Guild-specific deployment (instant, good for testing)
            console.log(`📍 Deploying to guild: ${process.env.GUILD_ID}`);
            
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            
            console.log(`\n✅ Successfully deployed ${data.length} guild commands!`);
            console.log('\n💡 Tip: Remove GUILD_ID from .env to deploy globally (takes up to 1 hour)');
        } else {
            // Global deployment (takes up to 1 hour to propagate)
            console.log('🌍 Deploying globally (this may take up to 1 hour to propagate)');
            
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            
            console.log(`\n✅ Successfully deployed ${data.length} global commands!`);
        }

        // Display command summary
        console.log('\n📋 Deployed Commands:');
        console.log('─'.repeat(50));
        
        const modCommands = commands.filter(c => c.default_member_permissions);
        const utilCommands = commands.filter(c => !c.default_member_permissions);
        
        console.log(`\n🛡️  Moderation Commands (${modCommands.length}):`);
        modCommands.forEach(c => console.log(`   /${c.name}`));
        
        console.log(`\n🔧 Utility Commands (${utilCommands.length}):`);
        utilCommands.forEach(c => console.log(`   /${c.name}`));
        
        console.log('\n' + '─'.repeat(50));
        console.log('✨ Deployment complete!\n');
        
    } catch (error) {
        console.error('\n❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.error('\n⚠️  The bot is missing access. Make sure the bot is in the server and has proper permissions.');
        } else if (error.code === 50035) {
            console.error('\n⚠️  Invalid Form Body. Check your command structure.');
            console.error('Details:', JSON.stringify(error.errors, null, 2));
        } else if (error.code === 'ENOTFOUND') {
            console.error('\n⚠️  Network error. Check your internet connection.');
        }
        
        process.exit(1);
    }
})();
