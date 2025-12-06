const { Events, InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { EmbedTemplates } = require('../utils/embedBuilder');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                logger.warn(`Unknown command: ${interaction.commandName}`);
                return interaction.reply({
                    embeds: [EmbedTemplates.error('Unknown Command', 'This command does not exist or has been removed.')],
                    ephemeral: true
                });
            }
            
            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Error executing /${interaction.commandName}:`, error);
                
                const errorEmbed = EmbedTemplates.error(
                    'Command Error',
                    'An error occurred while executing this command. Please try again later.'
                );
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                }
            }
        }
        
        // Handle autocomplete
        else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command || !command.autocomplete) return;
            
            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                logger.error(`Error in autocomplete for /${interaction.commandName}:`, error);
            }
        }
    },
};
