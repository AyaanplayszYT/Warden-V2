const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'unlock',
        description: 'Unlock a channel to allow members to send messages again.',
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
        await interaction.deferReply();

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Manage Channels** permission to use this command.')],
            });
        }

        // Check if not locked
        const everyoneRole = interaction.guild.roles.everyone;
        const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
        
        if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.warning('Not Locked', `${channel} is not currently locked.`)],
            });
        }

        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null, // Reset to default
            }, { reason: `Unlocked by ${interaction.user.tag} | ${reason}` });

            const embed = new WardenEmbed()
                .setType('success')
                .setTitle(`${emojis.unlock} Channel Unlocked`)
                .setDescription(`${channel} has been unlocked. Members can send messages again.`)
                .addField(`${emojis.moderator} Unlocked By`, interaction.user.tag, true)
                .addField(`${emojis.edit} Reason`, reason, true)
                .build();

            await interaction.editReply({ embeds: [embed] });

            // Also send a message in the unlocked channel
            await channel.send({
                embeds: [
                    new WardenEmbed()
                        .setType('success')
                        .setTitle(`${emojis.unlock} Channel Unlocked`)
                        .setDescription('This channel has been unlocked by a moderator.')
                        .build()
                ]
            });

            logger.info(`${interaction.user.tag} unlocked #${channel.name} in ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error unlocking channel:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Unlock Failed', 'An error occurred while unlocking the channel.')],
            });
        }
    },
};
