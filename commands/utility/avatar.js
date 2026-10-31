const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { V2Card } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'avatar',
        description: 'View and download user avatar in high resolution formats.',
        options: [
            {
                name: 'user',
                description: 'The user whose avatar you wish to view (defaults to self)',
                type: 6, // USER
                required: false,
            },
            {
                name: 'server_avatar',
                description: 'View server-specific avatar if present',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const wantServerAvatar = interaction.options.getBoolean('server_avatar') || false;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        let avatarURL;
        let avatarType = 'Global Account Avatar';

        if (wantServerAvatar && member && member.avatar) {
            avatarURL = member.displayAvatarURL({ dynamic: true, size: 4096 });
            avatarType = 'Guild Profile Avatar';
        } else {
            avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });
        }

        const pngURL = avatarURL.replace(/\.(webp|gif|jpg|jpeg)(\?.*)?$/i, '.png');
        const jpgURL = avatarURL.replace(/\.(webp|gif|png|jpeg)(\?.*)?$/i, '.jpg');
        const webpURL = avatarURL.replace(/\.(png|gif|jpg|jpeg)(\?.*)?$/i, '.webp');

        const card = new V2Card()
            .setAccent('primary')
            .setTitle(`[AVATAR ASSET] ${targetUser.tag}`, avatarType)
            .setDescription(`**Asset Direct URL:** [View High Resolution](${avatarURL})`)
            .addField('Formats', `[PNG](${pngURL})  •  [JPG](${jpgURL})  •  [WEBP](${webpURL})`, false)
            .setFooter(`Requested by ${interaction.user.tag}`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Download PNG')
                .setStyle(ButtonStyle.Link)
                .setURL(pngURL),
            new ButtonBuilder()
                .setLabel('Download JPG')
                .setStyle(ButtonStyle.Link)
                .setURL(jpgURL),
            new ButtonBuilder()
                .setLabel('Direct Asset Link')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL)
        );

        card.addActionRow(row);
        await card.editReply(interaction);

        logger.info(`Avatar fetched for ${targetUser.tag} by ${interaction.user.tag}`);
    },
};
