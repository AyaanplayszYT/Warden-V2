const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setspamlog',
    description: 'Configure or disable the automated spam and deletion logging channel.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('setspamlog')
        .setDescription('Configure or disable the automated spam and deletion logging channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The target channel for spam detection records')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('disable')
                .setDescription('Disable spam log routing')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [UI.error('Permission Denied', 'You lack the Manage Server permission.')],
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const disable = interaction.options.getBoolean('disable') || false;

        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const filePath = path.join(dataDir, 'logChannels.json');
        let logChannels = { modLog: '', spamLog: '' };
        try {
            if (fs.existsSync(filePath)) {
                logChannels = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {}

        if (disable) {
            logChannels.spamLog = '';
            fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

            return interaction.reply({
                embeds: [UI.warning('Logging Disabled', 'Automated spam, edit, and deletion logging has been deactivated.')],
                ephemeral: true,
            });
        }

        logChannels.spamLog = channel.id;
        fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));

        await interaction.reply({
            embeds: [
                UI.embed()
                    .color('success')
                    .title('Spam Log Channel Assigned')
                    .desc(`Automated spam detections and message deletion audits will now be dispatched to <#${channel.id}>.`)
                    .field('Channel', `<#${channel.id}> (\`${channel.id}\`)`, true)
                    .field('Configured By', `<@${interaction.user.id}>`, true)
                    .build(),
            ],
            ephemeral: true,
        });

        logger.info(`${interaction.user.tag} set spam log channel to #${channel.name}`);
    },
};
