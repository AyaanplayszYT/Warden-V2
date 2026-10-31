const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const channelConfig = require('../../utils/channelConfig');
const logger = require('../../utils/logger');

module.exports = {
    name: 'setmodlog',
    description: 'Configure or disable the moderation audit logging channel.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('setmodlog')
        .setDescription('Configure or disable the moderation audit logging channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The target channel for moderation audit records')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('disable')
                .setDescription('Disable moderation audit logging')
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

        if (disable) {
            await channelConfig.setModLog('');

            return interaction.reply({
                embeds: [UI.warning('Logging Disabled', 'Moderation audit logging has been deactivated.')],
                ephemeral: true,
            });
        }

        await channelConfig.setModLog(channel.id);

        await interaction.reply({
            embeds: [
                UI.embed()
                    .color('success')
                    .title('Audit Channel Configured')
                    .desc(`Moderation audit logs will now be dispatched to <#${channel.id}>.`)
                    .field('Channel', `<#${channel.id}> (\`${channel.id}\`)`, true)
                    .field('Configured By', `<@${interaction.user.id}>`, true)
                    .build(),
            ],
            ephemeral: true,
        });

        logger.info(`${interaction.user.tag} set mod log channel to #${channel.name}`);
    },
};
