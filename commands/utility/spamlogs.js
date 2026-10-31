const { PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const spamLogs = require('../../utils/spamLogs');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'spamlogs',
        description: 'View recent automated spam detections and rate-limit triggers.',
        options: [],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to view spam detection logs.'
            ).editReply(interaction);
        }

        const logs = spamLogs.getAll().slice(0, 15);

        if (logs.length === 0) {
            return V2Templates.info(
                'No Spam Incidents Recorded',
                'The automated anti-spam filter has not detected any rate limit or mass-mention violations in recent memory.'
            ).editReply(interaction);
        }

        const card = new V2Card()
            .setAccent('warning')
            .setTitle('[SPAM LOGS] Automated Anti-Spam Detections', 'Recent messages intercepted by the heuristic filter.')
            .setDescription(`Displaying **${Math.min(logs.length, 10)}** most recent trigger events:`);

        for (const log of logs.slice(0, 10)) {
            card.addField(
                `[INTERCEPT] ${log.type ? log.type.toUpperCase() : 'SPAM'} — ${log.user}`,
                `**Channel:** #${log.channel}\n**Snippet:** \`${log.content ? log.content.substring(0, 80) : 'None'}\`\n**Timestamp:** ${log.time}`,
                false
            );
        }

        card.setFooter(`Anti-Spam Engine • Requested by ${interaction.user.tag}`);
        await card.editReply(interaction);

        logger.info(`Spamlogs accessed by ${interaction.user.tag}`);
    },
};
