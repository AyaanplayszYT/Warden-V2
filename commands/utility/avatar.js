const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('View and download user avatar')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to view (defaults to self)')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('server_avatar')
                .setDescription('View guild avatar if present')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const wantServer = interaction.options.getBoolean('server_avatar') || false;
        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        let avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 2048 });
        let typeName = 'Global Avatar';

        if (wantServer && member && member.avatar) {
            avatarURL = member.displayAvatarURL({ dynamic: true, size: 2048 });
            typeName = 'Server Avatar';
        }

        const embed = new PremiumEmbed()
            .title(`${targetUser.tag} • ${typeName}`)
            .image(avatarURL)
            .build();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Direct Link')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        logger.info(`Avatar fetched for ${targetUser.tag} by ${interaction.user.tag}`);
    },
};
