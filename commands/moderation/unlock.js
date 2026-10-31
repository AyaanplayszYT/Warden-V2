const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'unlock',
        description: 'Unlock a text channel to restore member messaging permissions.',
        options: [
            {
                name: 'channel',
                description: 'The channel to unlock (defaults to current channel)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'reason',
                description: 'Reason for unlocking the channel',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageChannels,
    },

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Manage Channels` permission to execute this command.'
            ).reply(interaction, { ephemeral: true });
        }

        const everyoneRole = interaction.guild.roles.everyone;
        const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

        if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
            return V2Templates.warning(
                'Channel Not Locked',
                `Channel <#${channel.id}> is not currently locked.`
            ).reply(interaction, { ephemeral: true });
        }

        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
            }, { reason: `[Warden Channel Unlock] By ${interaction.user.tag}: ${reason}` });

            const card = new V2Card()
                .setAccent('success')
                .setTitle('[CHANNEL UNLOCKED] Access Restored')
                .setDescription(`Channel <#${channel.id}> has been unlocked. Member messaging permissions are restored.`)
                .addField('Enforcing Moderator', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField('Reason', reason, true)
                .setTimestamp(new Date());

            await card.reply(interaction);

            if (channel.id !== interaction.channel.id) {
                const noticeCard = new V2Card()
                    .setAccent('success')
                    .setTitle('[LOCKDOWN LIFTED] Channel Restored')
                    .setDescription('Normal operations have resumed. Members may now send messages.')
                    .addField('Reason', reason, false)
                    .setFooter('Warden Security Enforcement');
                await noticeCard.send(channel).catch(() => {});
            }

            logger.info(`${interaction.user.tag} unlocked channel #${channel.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during unlock command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'Failed to update channel permission overrides.'
            ).reply(interaction, { ephemeral: true });
        }
    },
};
