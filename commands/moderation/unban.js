const { PermissionFlagsBits } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'unban',
        description: 'Unban a user from the server.',
        options: [
            {
                name: 'user_id',
                description: 'The ID of the user to unban',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the unban',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.BanMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Validate user ID format
        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid User ID', 'Please provide a valid Discord user ID (17-19 digit number).')],
            });
        }

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Ban Members** permission to use this command.')],
            });
        }

        // Check if user is actually banned
        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Not Banned', 'This user is not banned from this server.')],
            });
        }

        try {
            // Unban the user
            await interaction.guild.members.unban(userId, `Unbanned by ${interaction.user.tag} | ${reason}`);

            // Log to warnings database
            const warning = warningsDB.add(interaction.guild.id, userId, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'unban',
            });

            // Create success embed
            const successEmbed = EmbedTemplates.modAction({
                action: 'unban',
                target: ban.user,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
            });

            // Log to mod log channel
            await logToModChannel(interaction.guild, successEmbed);

            await interaction.editReply({
                embeds: [successEmbed],
            });

            logger.info(`${interaction.user.tag} unbanned ${ban.user.tag} from ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during unban command:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Unban Failed', 'An error occurred while trying to unban this user.')],
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
