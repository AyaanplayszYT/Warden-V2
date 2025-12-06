const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
    data: {
        name: 'slowmode',
        description: 'Set the slowmode for a channel.',
        options: [
            {
                name: 'duration',
                description: 'Slowmode duration (e.g., 5s, 30s, 1m, 5m, 1h) or "off" to disable',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'channel',
                description: 'The channel to set slowmode for (defaults to current channel)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'reason',
                description: 'Reason for changing slowmode',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageChannels,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const durationStr = interaction.options.getString('duration');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Manage Channels** permission to use this command.')],
            });
        }

        // Check if channel is text-based
        if (!channel.isTextBased() || channel.isVoiceBased()) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Channel', 'Slowmode can only be set for text channels.')],
            });
        }

        // Parse duration
        let duration = 0;
        if (durationStr.toLowerCase() === 'off' || durationStr === '0') {
            duration = 0;
        } else {
            duration = ms(durationStr);
            if (!duration || isNaN(duration)) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.error('Invalid Duration', 'Please provide a valid duration (e.g., `5s`, `30s`, `1m`, `5m`, `1h`) or `off` to disable.')],
                });
            }
            // Convert to seconds
            duration = Math.floor(duration / 1000);
        }

        // Check max slowmode (6 hours = 21600 seconds)
        if (duration > 21600) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Duration Too Long', 'The maximum slowmode duration is 6 hours.')],
            });
        }

        try {
            await channel.setRateLimitPerUser(duration, `Set by ${interaction.user.tag} | ${reason}`);

            const formatDuration = (seconds) => {
                if (seconds === 0) return 'Disabled';
                if (seconds < 60) return `${seconds} second${seconds > 1 ? 's' : ''}`;
                if (seconds < 3600) return `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) > 1 ? 's' : ''}`;
                return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''}`;
            };

            const embed = new WardenEmbed()
                .setType(duration === 0 ? 'success' : 'info')
                .setTitle(`${emojis.clock} Slowmode ${duration === 0 ? 'Disabled' : 'Updated'}`)
                .addField(`${emojis.channel} Channel`, `${channel}`, true)
                .addField(`${emojis.clock} Duration`, formatDuration(duration), true)
                .addField(`${emojis.moderator} Set By`, interaction.user.tag, true)
                .addField(`${emojis.edit} Reason`, reason, false)
                .build();

            await interaction.editReply({ embeds: [embed] });
            logger.info(`${interaction.user.tag} set slowmode in #${channel.name} to ${formatDuration(duration)}`);

        } catch (error) {
            logger.error('Error setting slowmode:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Slowmode Failed', 'An error occurred while setting slowmode.')],
            });
        }
    },
};
