const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { WardenEmbed, EmbedTemplates, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'setspamlog',
        description: 'Set or remove the spam/message log channel.',
        options: [
            {
                name: 'channel',
                description: 'The channel to use for spam logs (leave empty to use current channel)',
                type: 7,
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'disable',
                description: 'Disable the spam log channel',
                type: 5,
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageGuild,
    },

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the Manage Server permission.')],
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const disable = interaction.options.getBoolean('disable') || false;

        const filePath = path.join(__dirname, '../../data/logChannels.json');
        let logChannels = { modLog: '', spamLog: '' };
        try {
            logChannels = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {}

        if (disable) {
            logChannels.spamLog = '';
            fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));
            return interaction.reply({
                embeds: [EmbedTemplates.success('Spam Log Disabled', 'Message/spam logging has been disabled.')],
            });
        }

        logChannels.spamLog = channel.id;
        fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

        const embed = new WardenEmbed()
            .setType('success')
            .setTitle(`${emojis.success} Spam Log Channel Set`)
            .setDescription(`Message edits, deletions, and spam detections will now be logged to ${channel}.`)
            .addField('Channel', `${channel}`, true)
            .addField('Set By', interaction.user.tag, true)
            .build();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Spam log channel set to ${channel.name} by ${interaction.user.tag}`);
    },
};
