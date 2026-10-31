const { PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

function getTypeBadge(type) {
    const badges = {
        ban: '[BAN]',
        kick: '[KICK]',
        mute: '[TIMEOUT]',
        warn: '[WARN]',
        unban: '[UNBAN]',
        unmute: '[UNMUTE]',
        softban: '[SOFTBAN]',
    };
    return badges[type?.toLowerCase()] || `[${type?.toUpperCase() || 'ACTION'}]`;
}

module.exports = {
    data: {
        name: 'modlogs',
        description: 'View recent moderation actions and server audit statistics.',
        options: [
            {
                name: 'limit',
                description: 'Number of actions to inspect (default: 10)',
                type: 4, // INTEGER
                required: false,
                min_value: 1,
                max_value: 50,
            },
            {
                name: 'user',
                description: 'Filter logs by a specific user account',
                type: 6, // USER
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to inspect moderation logs.'
            ).reply(interaction, { ephemeral: true });
        }

        const limit = interaction.options.getInteger('limit') || 10;
        const filterUser = interaction.options.getUser('user');

        const allWarnings = warningsDB.getAllForGuild(interaction.guild.id);

        let filtered = allWarnings;
        if (filterUser) {
            filtered = filtered.filter(w => w.userId === filterUser.id);
        }

        if (filtered.length === 0) {
            return V2Templates.info(
                'No Audit Logs Found',
                filterUser
                    ? `No moderation actions recorded for **${filterUser.tag}** (\`${filterUser.id}\`).`
                    : 'No moderation records found in this server\'s audit database.'
            ).reply(interaction);
        }

        const logsToShow = filtered.slice(0, limit);
        const card = new V2Card()
            .setAccent('primary')
            .setTitle(
                filterUser ? `[MODERATION LOGS] ${filterUser.tag}` : '[SERVER AUDIT LOGS] Recent Actions',
                `Displaying ${logsToShow.length} of ${filtered.length} total logged incident(s).`
            );

        logsToShow.forEach(log => {
            const badge = getTypeBadge(log.type);
            const ts = Math.floor(new Date(log.timestamp).getTime() / 1000);
            card.addField(
                `Case #${log.caseId} ${badge}`,
                `**Target:** <@${log.userId}>\n**Moderator:** ${log.moderatorTag}\n**Reason:** ${log.reason}\n**Date:** <t:${ts}:R>`,
                false
            );
        });

        card.setFooter(`Guild Audit Registry • Requested by ${interaction.user.tag}`);
        await card.reply(interaction);

        logger.info(`Modlogs viewed by ${interaction.user.tag} (count: ${logsToShow.length})`);
    },
};
