const { PermissionFlagsBits } = require('discord.js');
const { WardenEmbed, EmbedTemplates, emojis } = require('../../utils/embedBuilder');
const spamLogs = require('../../utils/spamLogs');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'spamlogs',
        description: 'View recent spam detection logs and auto-moderation actions.',
        options: [],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the Moderate Members permission.')],
            });
        }

        const logs = spamLogs.getAll().slice(0, 15);

        if (logs.length === 0) {
            return interaction.editReply({
                embeds: [new WardenEmbed().setType('info').setTitle('Spam Logs').setDescription('No spam detections recorded yet. The auto-moderation system will log spam here.').build()],
            });
        }

        const embed = new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} Recent Spam Detections`)
            .setDescription('Here are the latest spam detections and auto-mod actions:')
            .build();

        for (const log of logs.slice(0, 10)) {
            embed.addFields({
                name: `${log.type.toUpperCase()} | ${log.user}`,
                value: `Channel: #${log.channel}\nContent: ${log.content ? log.content.substring(0, 50) : 'N/A'}\nTime: ${log.time}`,
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Spamlogs command used by ${interaction.user.tag}`);
    },
};
