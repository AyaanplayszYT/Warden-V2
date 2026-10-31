const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'setspamlog',
        description: 'Configure or disable the automated spam and deletion logging channel.',
        options: [
            {
                name: 'channel',
                description: 'The target channel for spam detection records (defaults to current)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'disable',
                description: 'Disable spam log routing',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageGuild,
    },

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Manage Server` permission to configure audit log channels.'
            ).reply(interaction, { ephemeral: true });
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

            const card = new V2Card()
                .setAccent('warning')
                .setTitle('[LOG CONFIGURATION] Spam Logs Disabled')
                .setDescription('Automatic spam, edit, and deletion logging has been deactivated.')
                .addField('Configured By', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .setTimestamp(new Date());

            return card.reply(interaction);
        }

        logChannels.spamLog = channel.id;
        fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

        const card = new V2Card()
            .setAccent('success')
            .setTitle('[LOG CONFIGURATION] Spam Log Channel Assigned')
            .setDescription(`Automated spam detections and message deletion audits will now be routed to <#${channel.id}>.`)
            .addField('Assigned Channel', `<#${channel.id}> (\`${channel.id}\`)`, true)
            .addField('Configured By', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
            .setTimestamp(new Date());

        await card.reply(interaction);
        logger.info(`${interaction.user.tag} assigned spam log channel to #${channel.name}`);
    },
};
