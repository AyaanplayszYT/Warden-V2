const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'setmodlog',
        description: 'Configure or disable the moderation audit logging channel.',
        options: [
            {
                name: 'channel',
                description: 'The target channel for moderation audit records (defaults to current)',
                type: 7, // CHANNEL
                required: false,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            },
            {
                name: 'disable',
                description: 'Disable moderation log routing',
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
            logChannels.modLog = '';
            fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

            const card = new V2Card()
                .setAccent('warning')
                .setTitle('[LOG CONFIGURATION] Moderation Logs Disabled')
                .setDescription('Automatic moderation audit logging has been deactivated.')
                .addField('Configured By', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .setTimestamp(new Date());

            return card.reply(interaction);
        }

        logChannels.modLog = channel.id;
        fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

        const card = new V2Card()
            .setAccent('success')
            .setTitle('[LOG CONFIGURATION] Moderation Log Channel Assigned')
            .setDescription(`Official moderation audit records will now be routed to <#${channel.id}>.`)
            .addField('Assigned Channel', `<#${channel.id}> (\`${channel.id}\`)`, true)
            .addField('Configured By', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
            .setTimestamp(new Date());

        await card.reply(interaction);
        logger.info(`${interaction.user.tag} assigned mod log channel to #${channel.name}`);
    },
};
