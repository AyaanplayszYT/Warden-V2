const { Events, InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { UI } = require('../utils/embedBuilder');
const fs = require('fs');
const path = require('path');

let cachedColorData = null;
let lastColorRead = 0;
function getColorData() {
    const now = Date.now();
    if (!cachedColorData || now - lastColorRead > 60000) {
        lastColorRead = now;
        try {
            const dataPath = path.join(__dirname, '../data/colorRoles.json');
            if (fs.existsSync(dataPath)) {
                cachedColorData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            }
        } catch (e) {
            cachedColorData = null;
        }
    }
    return cachedColorData;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle Chat Input Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`Unknown command: /${interaction.commandName}`);
                return interaction.reply({
                    embeds: [UI.error('Command Not Found', 'This command is not registered or has been removed.')],
                    ephemeral: true,
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Error executing /${interaction.commandName}:`, error);

                const errorEmbed = UI.error(
                    'Execution Error',
                    'An error occurred while processing this command. Please verify bot permissions and try again.'
                );

                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }
                } catch (e) {}
            }
        }

        // Handle Autocomplete
        else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                logger.error(`Error in autocomplete for /${interaction.commandName}:`, error);
            }
        }

        // Handle String Select Menus (Color Roles)
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'color_role_select') {
                const selected = interaction.values[0];
                const member = interaction.member;

                const colorData = getColorData();

                if (!colorData || !colorData.roles) {
                    return interaction.reply({
                        embeds: [UI.error('Configuration Error', 'Color configuration data was not found.')],
                        ephemeral: true,
                    });
                }

                const roleNames = colorData.roles.map(r => r.name);
                const rolesToRemove = member.roles.cache.filter(r => roleNames.includes(r.name));

                try {
                    if (rolesToRemove.size > 0) {
                        await member.roles.remove(rolesToRemove);
                    }

                    if (selected === 'none') {
                        return interaction.reply({
                            embeds: [UI.info('Color Removed', 'Your vanity color role has been removed.')],
                            ephemeral: true,
                        });
                    }

                    const targetRole = interaction.guild.roles.cache.find(r => r.name === selected);
                    if (!targetRole) {
                        return interaction.reply({
                            embeds: [UI.error('Role Missing', `The role \`${selected}\` does not exist on this server.`)],
                            ephemeral: true,
                        });
                    }

                    await member.roles.add(targetRole);
                    return interaction.reply({
                        embeds: [UI.success('Color Updated', `Your display color role is now **${selected}**.`)],
                        ephemeral: true,
                    });

                } catch (err) {
                    logger.error(`Failed to assign color role to ${interaction.user.tag}:`, err);
                    return interaction.reply({
                        embeds: [UI.error('Hierarchy Error', 'Failed to assign role. Ensure the bot role is positioned higher than color roles.')],
                        ephemeral: true,
                    });
                }
            }
        }
    },
};
