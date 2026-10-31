const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'lock',
        description: 'Lock a text channel to prevent members from sending messages.',
        options: [
            {
                name: 'channel',
                description: 'The channel to lock (defaults to current channel)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'reason',
                description: 'Reason for locking the channel',
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

        if (currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
            return V2Templates.warning(
                'Channel Already Locked',
                `Channel <#${channel.id}> is already locked.`
            ).reply(interaction, { ephemeral: true });
        }

        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
            }, { reason: `[Warden Channel Lock] By ${interaction.user.tag}: ${reason}` });

            const card = new V2Card()
                .setAccent('warning')
                .setTitle('[CHANNEL LOCK] Access Restricted')
                .setDescription(`Channel <#${channel.id}> has been locked. Regular members are restricted from sending messages.`)
                .addField('Enforcing Moderator', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField('Reason', reason, true)
                .setTimestamp(new Date());

            await card.reply(interaction);

            if (channel.id !== interaction.channel.id) {
                const noticeCard = new V2Card()
                    .setAccent('warning')
                    .setTitle('[LOCKDOWN NOTICE] Channel Locked')
                    .setDescription('This channel has been placed in lockdown mode by moderation. Sending messages is temporarily disabled.')
                    .addField('Reason', reason, false)
                    .setFooter('Warden Security Enforcement');
                await noticeCard.send(channel).catch(() => {});
            }

            logger.info(`${interaction.user.tag} locked channel #${channel.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error during lock command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'Failed to update channel permission overrides.'
            ).reply(interaction, { ephemeral: true });
        }
    },
};
