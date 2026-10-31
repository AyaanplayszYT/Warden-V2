const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel to restore message permissions')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to unlock (defaults to current)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for unlocking')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const everyone = interaction.guild.roles.everyone;
        const perms = channel.permissionOverwrites.cache.get(everyone.id);

        if (!perms || !perms.deny.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                embeds: [UI.warning('Not Locked', `${channel} is not currently locked.`)],
                ephemeral: true,
            });
        }

        await channel.permissionOverwrites.edit(everyone, {
            SendMessages: null,
        }, { reason: `${interaction.user.tag}: ${reason}` });

        const embed = UI.success(
            'Channel Unlocked',
            `${channel} has been unlocked.\n**Moderator** • ${interaction.user.tag}\n**Reason** • ${reason}`
        );

        await interaction.reply({ embeds: [embed] });
        logger.info(`${interaction.user.tag} unlocked #${channel.name}`);
    },
};
