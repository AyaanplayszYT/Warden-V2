const { PermissionFlagsBits } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'unmute',
        description: 'Remove timeout communication restrictions from a user.',
        options: [
            {
                name: 'user',
                description: 'The user to unmute',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for removing timeout',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to execute this command.'
            ).reply(interaction, { ephemeral: true });
        }

        if (!targetMember) {
            return V2Templates.error(
                'Member Not Found',
                `Target **${targetUser.tag}** (\`${targetUser.id}\`) is not currently present in this server.`
            ).reply(interaction, { ephemeral: true });
        }

        if (!targetMember.communicationDisabledUntilTimestamp || targetMember.communicationDisabledUntilTimestamp <= Date.now()) {
            return V2Templates.warning(
                'Not Timed Out',
                `Target **${targetUser.tag}** has no active timeout restrictions.`
            ).reply(interaction, { ephemeral: true });
        }

        try {
            await targetMember.timeout(null, `[Warden Unmute] By ${interaction.user.tag}: ${reason}`);

            const card = V2Templates.modAction({
                action: 'unmute',
                target: targetUser,
                moderator: interaction.user,
                reason,
            });

            await logToModChannel(interaction.guild, card);
            await card.reply(interaction);

            logger.info(`${interaction.user.tag} unmuted ${targetUser.tag}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during unmute command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An unexpected error occurred while attempting to remove timeout.'
            ).reply(interaction, { ephemeral: true });
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
