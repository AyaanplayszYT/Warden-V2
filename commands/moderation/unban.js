const { PermissionFlagsBits } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'unban',
        description: 'Revoke a guild ban by User ID.',
        options: [
            {
                name: 'user_id',
                description: 'The Discord ID of the user to unban',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for revoking the ban',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.BanMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.options.getString('user_id').trim();
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Ban Members` permission to execute this command.'
            ).editReply(interaction);
        }

        if (!/^\d{17,20}$/.test(userId)) {
            return V2Templates.error(
                'Invalid User ID',
                'The provided user ID format is invalid. Discord IDs must be numeric (17-20 digits).'
            ).editReply(interaction);
        }

        try {
            const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
            if (!banEntry) {
                return V2Templates.error(
                    'Ban Record Not Found',
                    `No active ban record exists for User ID \`${userId}\` in this guild.`
                ).editReply(interaction);
            }

            const targetUser = banEntry.user;
            await interaction.guild.bans.remove(userId, `[Warden Unban] By ${interaction.user.tag}: ${reason}`);

            const card = V2Templates.modAction({
                action: 'unban',
                target: targetUser,
                moderator: interaction.user,
                reason,
            });

            await logToModChannel(interaction.guild, card);
            await card.editReply(interaction);

            logger.info(`${interaction.user.tag} unbanned ${targetUser.tag} (${userId}). Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during unban command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An unexpected error occurred while attempting to revoke the ban.'
            ).editReply(interaction);
        }
    },
};

async function logToModChannel(guild, card) {
    try {
        const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
        if (logChannels.modLog) {
            const modLogChannel = guild.channels.cache.get(logChannels.modLog);
            if (modLogChannel) {
                await card.send(modLogChannel);
            }
        }
    } catch (error) {
        logger.warn('Could not dispatch log to mod channel:', error);
    }
}
