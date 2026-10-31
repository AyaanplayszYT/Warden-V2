const { Events, InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { V2Templates } = require('../utils/v2Components');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle Chat Input Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`Unknown command invocation attempt: /${interaction.commandName}`);
                return V2Templates.error(
                    'Command Not Found',
                    'The requested command is not registered or has been removed from this bot.'
                ).reply(interaction, { ephemeral: true });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Error executing /${interaction.commandName}:`, error);

                const errorCard = V2Templates.error(
                    'Internal Command Error',
                    'An unexpected exception occurred while processing this command. Please notify an administrator.'
                );

                if (interaction.replied || interaction.deferred) {
                    await errorCard.followUp(interaction, { ephemeral: true }).catch(() => {});
                } else {
                    await errorCard.reply(interaction, { ephemeral: true }).catch(() => {});
                }
            }
        }

        // Handle Autocomplete
        else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                logger.error(`Error during autocomplete for /${interaction.commandName}:`, error);
            }
        }

        // Handle Global String Select Menus (e.g., Color Roles)
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'color_role_select') {
                const selected = interaction.values[0];
                const member = interaction.member;

                const dataPath = path.join(__dirname, '../data/colorRoles.json');
                let colorData = null;
                try {
                    if (fs.existsSync(dataPath)) {
                        colorData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                    }
                } catch (e) {}

                if (!colorData || !colorData.roles) {
                    return interaction.reply({
                        content: 'Color configuration data not found.',
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
                        return V2Templates.info(
                            'Color Removed',
                            'All vanity color roles have been stripped from your profile.'
                        ).reply(interaction, { ephemeral: true });
                    }

                    const targetRole = interaction.guild.roles.cache.find(r => r.name === selected);
                    if (!targetRole) {
                        return V2Templates.error(
                            'Role Not Found',
                            `Role \`${selected}\` could not be found on this server.`
                        ).reply(interaction, { ephemeral: true });
                    }

                    await member.roles.add(targetRole);
                    return V2Templates.success(
                        'Color Updated',
                        `Your display color role has been updated to **${selected}**.`
                    ).reply(interaction, { ephemeral: true });

                } catch (err) {
                    logger.error(`Failed to assign color role to ${interaction.user.tag}:`, err);
                    return V2Templates.error(
                        'Assignment Failed',
                        'Failed to modify your server roles. Please check bot hierarchy permissions.'
                    ).reply(interaction, { ephemeral: true });
                }
            }
        }
    },
};
