const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const stickerManager = require('../../utils/stickerManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'sticker',
    description: 'Send a custom sticker directly in chat.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('sticker')
        .setDescription('Send a custom sticker directly in chat')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the sticker to send')
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Optional text message to send with the sticker')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = stickerManager.search(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const query = interaction.options.getString('name');
        const customMessage = interaction.options.getString('message');

        const sticker = stickerManager.get(query);
        if (!sticker) {
            return interaction.reply({
                embeds: [UI.error('Sticker Not Found', `No custom sticker matched \`${query}\`. Use \`/stickers\` to see all available stickers.`)],
                ephemeral: true,
            });
        }

        try {
            await interaction.reply({
                content: customMessage || undefined,
                files: [sticker.path],
            });
            logger.info(`${interaction.user.tag} sent sticker ${sticker.id}`);
        } catch (err) {
            logger.error(`Failed to send sticker ${sticker.id}:`, err);
            return interaction.reply({
                embeds: [UI.error('Failed to Send', 'Could not send the sticker attachment. Check bot permissions.')],
                ephemeral: true,
            });
        }
    },
};
