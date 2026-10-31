const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages from the current channel')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Filter by user')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('bots_only')
                .setDescription('Filter to bots only')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('contains')
                .setDescription('Filter by keyword')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const botsOnly = interaction.options.getBoolean('bots_only') || false;
        const contains = interaction.options.getString('contains');

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

        let filtered = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

        if (targetUser) filtered = filtered.filter(m => m.author.id === targetUser.id);
        if (botsOnly) filtered = filtered.filter(m => m.author.bot);
        if (contains) filtered = filtered.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));

        const toDelete = Array.from(filtered.values()).slice(0, amount);

        if (toDelete.length === 0) {
            return interaction.editReply({
                embeds: [UI.warning('No Messages', 'No messages matched your filter criteria (or all matching messages are older than 14 days).')],
            });
        }

        try {
            const deleted = await channel.bulkDelete(toDelete, true);
            const count = deleted.size;

            const embed = UI.success(
                'Purge Complete',
                `Successfully deleted **${count}** message(s) in ${channel}.\n**Moderator** • ${interaction.user.tag}`
            );

            await interaction.editReply({ embeds: [embed] });
            logger.info(`${interaction.user.tag} purged ${count} messages in #${channel.name}`);

        } catch (error) {
            logger.error('Error during purge:', error);
            return interaction.editReply({
                embeds: [UI.error('Purge Failed', 'An error occurred while bulk deleting messages.')],
            });
        }
    },
};
