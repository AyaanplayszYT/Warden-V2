const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const spamLogs = require('../../utils/spamLogs');
const logger = require('../../utils/logger');

module.exports = {
    name: 'spamlogs',
    description: 'View recent automated spam detections and rate-limit triggers.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('spamlogs')
        .setDescription('View recent automated spam detections and rate-limit triggers')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [UI.error('Permission Denied', 'You lack the Moderate Members permission.')],
                ephemeral: true,
            });
        }

        const logs = spamLogs.getAll().slice(0, 10);

        if (logs.length === 0) {
            return interaction.reply({
                embeds: [UI.info('No Incidents', 'The automated spam filter has not recorded any recent violations.')],
                ephemeral: true,
            });
        }

        const embed = UI.embed()
            .color('warning')
            .title('Automated Spam Detections')
            .desc(`Displaying ${logs.length} most recent trigger events:`);

        for (const log of logs) {
            const typeStr = log.type ? log.type.toUpperCase() : 'SPAM';
            embed.field(
                `[${typeStr}] ${log.user}`,
                `Channel: #${log.channel} • Time: ${log.time}\nSnippet: \`${log.content ? log.content.substring(0, 80) : 'None'}\``,
                false
            );
        }

        await interaction.reply({ embeds: [embed.build()] });
        logger.info(`Spamlogs accessed by ${interaction.user.tag}`);
    },
};
