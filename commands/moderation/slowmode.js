const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set message rate limiting for a channel')
        .addStringOption(opt =>
            opt.setName('seconds')
                .setDescription('Delay (e.g. 0 to disable, 5s, 10s, 1m, 1h)')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to configure (defaults to current)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the slowmode change')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const input = interaction.options.getString('seconds').trim();
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

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
            return interaction.reply({
                embeds: [UI.error('Invalid Rate Limit', 'Slowmode delay must be between `0` (disabled) and `21600` seconds (6 hours). Example: `0`, `5s`, `10m`.')],
                ephemeral: true,
            });
        }

        await channel.setRateLimitPerUser(seconds, `${interaction.user.tag}: ${reason}`);

        const embed = UI.success(
            seconds === 0 ? 'Slowmode Disabled' : 'Slowmode Set',
            seconds === 0
                ? `Slowmode removed in ${channel}. Members can send messages without delay.`
                : `Slowmode in ${channel} set to **${seconds}s** (${ms(seconds * 1000, { long: true })}).\n**Moderator** • ${interaction.user.tag}`
        );

        await interaction.reply({ embeds: [embed] });
        logger.info(`${interaction.user.tag} set slowmode to ${seconds}s in #${channel.name}`);
    },
};
