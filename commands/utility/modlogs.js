const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
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
    name: 'modlogs',
    description: 'View recent moderation actions and server audit statistics.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('View recent moderation actions and server audit statistics')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addIntegerOption(option =>
            option
                .setName('limit')
                .setDescription('Number of actions to inspect (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Filter logs by a specific user')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [UI.error('Permission Denied', 'You lack the Moderate Members permission.')],
                ephemeral: true,
            });
        }

        const limit = interaction.options.getInteger('limit') || 10;
        const filterUser = interaction.options.getUser('user');

        const allWarnings = warningsDB.getAllForGuild(interaction.guild.id);

        let filtered = allWarnings;
        if (filterUser) {
            filtered = filtered.filter(w => w.userId === filterUser.id);
        }

        if (filtered.length === 0) {
            return interaction.reply({
                embeds: [
                    UI.info(
                        'No Audit Logs Found',
                        filterUser
                            ? `No moderation actions recorded for **${filterUser.tag}** (\`${filterUser.id}\`).`
                            : 'No moderation records found in this server\'s audit database.'
                    ),
                ],
                ephemeral: true,
            });
        }

        const logsToShow = filtered.slice(0, limit);
        const embed = UI.embed()
            .color('primary')
            .title(filterUser ? `Moderation Logs: ${filterUser.tag}` : 'Server Moderation Logs')
            .desc(`Displaying ${logsToShow.length} of ${filtered.length} total logged action(s).`);

        logsToShow.forEach(log => {
            const badge = getTypeBadge(log.type);
            const ts = Math.floor(new Date(log.timestamp).getTime() / 1000);
            embed.field(
                `Case #${log.caseId} ${badge}`,
                `Target: <@${log.userId}> • Moderator: ${log.moderatorTag}\nReason: ${log.reason}\nDate: <t:${ts}:R>`,
                false
            );
        });

        await interaction.reply({ embeds: [embed.build()] });
        logger.info(`Modlogs viewed by ${interaction.user.tag} (count: ${logsToShow.length})`);
    },
};
