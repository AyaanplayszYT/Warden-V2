const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const stickerManager = require('../../utils/stickerManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'sticker',
    description: 'Send a custom sticker anywhere in this server.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('sticker')
        .setDescription('Send a custom sticker anywhere in this server')
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

    async execute(interaction, client) {
        const query = interaction.options.getString('name');
        const customMessage = interaction.options.getString('message') || '';

        const sticker = stickerManager.get(query);
        if (!sticker) {
            return interaction.reply({
                embeds: [UI.error('Sticker Not Found', `No custom sticker matched \`${query}\`. Use \`/stickers\` to see all available stickers.`)],
                ephemeral: true,
            });
        }

        const success = await stickerManager.sendAsUser({
            channel: interaction.channel,
            user: interaction.user,
            member: interaction.member,
            sticker,
            client,
            content: customMessage,
        });

        if (!success) {
            return interaction.reply({
                embeds: [UI.error('Delivery Failed', 'Unable to send sticker in this channel. Check bot permissions.')],
                ephemeral: true,
            });
        }

        return interaction.reply({
            embeds: [UI.success('Sticker Sent', `Delivered **${sticker.id}** to <#${interaction.channel.id}>.`)],
            ephemeral: true,
        });
    },
};
