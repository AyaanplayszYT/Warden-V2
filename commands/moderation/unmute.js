const { PermissionFlagsBits } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'unmute',
        description: 'Remove timeout from a user.',
        options: [
            {
                name: 'user',
                description: 'The user to unmute',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the unmute',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Fetch the member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Moderate Members** permission to use this command.')],
            });
        }

        if (!targetMember) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('User Not Found', 'This user is not in the server.')],
            });
        }

        // Check if user is actually muted
        if (!targetMember.isCommunicationDisabled()) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Not Muted', `**${targetUser.tag}** is not currently muted.`)],
            });
        }

        if (!targetMember.moderatable) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Cannot Unmute', 'I cannot unmute this user. They may have a higher role than me.')],
            });
        }

        try {
            // Remove timeout
            await targetMember.timeout(null, `Unmuted by ${interaction.user.tag} | ${reason}`);

            // Log to warnings database
            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'unmute',
            });

            // Create success embed
            const successEmbed = EmbedTemplates.modAction({
                action: 'unmute',
                target: targetUser,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
            });

            // Log to mod log channel
            await logToModChannel(interaction.guild, successEmbed);

            await interaction.editReply({
                embeds: [successEmbed],
            });

            logger.info(`${interaction.user.tag} unmuted ${targetUser.tag} in ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during unmute command:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Unmute Failed', 'An error occurred while trying to unmute this user.')],
            });
        }
    },
};

async function logToModChannel(guild, embed) {
    try {
        const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
        if (logChannels.modLog) {
            const modLogChannel = guild.channels.cache.get(logChannels.modLog);
            if (modLogChannel) {
                await modLogChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        logger.warn('Could not log to mod channel:', error);
    }
}
