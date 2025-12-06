const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'lock',
        description: 'Lock a channel to prevent members from sending messages.',
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
        await interaction.deferReply();

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Manage Channels** permission to use this command.')],
            });
        }

        // Check if already locked
        const everyoneRole = interaction.guild.roles.everyone;
        const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
        
        if (currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.warning('Already Locked', `${channel} is already locked.`)],
            });
        }

        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
            }, { reason: `Locked by ${interaction.user.tag} | ${reason}` });

            const embed = new WardenEmbed()
                .setType('warning')
                .setTitle(`${emojis.lock} Channel Locked`)
                .setDescription(`${channel} has been locked. Members can no longer send messages.`)
                .addField(`${emojis.moderator} Locked By`, interaction.user.tag, true)
                .addField(`${emojis.edit} Reason`, reason, true)
                .build();

            await interaction.editReply({ embeds: [embed] });

            // Also send a message in the locked channel
            await channel.send({
                embeds: [
                    new WardenEmbed()
                        .setType('warning')
                        .setTitle(`${emojis.lock} Channel Locked`)
                        .setDescription('This channel has been locked by a moderator.')
                        .addField(`${emojis.edit} Reason`, reason, false)
                        .build()
                ]
            });

            logger.info(`${interaction.user.tag} locked #${channel.name} in ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            logger.error('Error locking channel:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Lock Failed', 'An error occurred while locking the channel.')],
            });
        }
    },
};
