const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
    data: {
        name: 'slowmode',
        description: 'Configure message rate limiting (slowmode) for a channel.',
        options: [
            {
                name: 'seconds',
                description: 'Slowmode delay (e.g. 0 to disable, 5, 10, 30, 60, or 5m, 1h)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'channel',
                description: 'The target channel (defaults to current)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'reason',
                description: 'Reason for adjusting slowmode',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageChannels,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const input = interaction.options.getString('seconds').trim();
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Manage Channels` permission to execute this command.'
            ).editReply(interaction);
        }

        let seconds;
        if (/^\d+$/.test(input)) {
            seconds = parseInt(input, 10);
        } else {
            const parsedMs = ms(input);
            if (parsedMs !== undefined) {
                seconds = Math.round(parsedMs / 1000);
            }
        }

        if (seconds === undefined || isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return V2Templates.error(
                'Invalid Rate Limit',
                'Slowmode delay must be between `0` (disabled) and `21600` seconds (6 hours). Example values: `0`, `5s`, `10m`, `1h`.'
            ).editReply(interaction);
        }

        try {
            await channel.setRateLimitPerUser(seconds, `[Warden Slowmode] By ${interaction.user.tag}: ${reason}`);

            const card = new V2Card()
                .setAccent(seconds === 0 ? 'success' : 'primary')
                .setTitle(seconds === 0 ? '[SLOWMODE DISABLED] Normal Flow' : '[SLOWMODE UPDATED] Rate Limit Active')
                .setDescription(
                    seconds === 0
                        ? `Slowmode has been removed from <#${channel.id}>. Members may send messages without delay.`
                        : `Slowmode for <#${channel.id}> has been set to **${seconds} second(s)** (${ms(seconds * 1000, { long: true })}).`
                )
                .addField('Enforcing Moderator', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField('Channel', `<#${channel.id}>`, true)
                .addField('Reason', reason, false)
                .setTimestamp(new Date());

            await card.editReply(interaction);

            logger.info(`${interaction.user.tag} set slowmode to ${seconds}s in #${channel.name}`);

        } catch (error) {
            logger.error('Error during slowmode command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'Failed to update channel rate limit settings.'
            ).editReply(interaction);
        }
    },
};
