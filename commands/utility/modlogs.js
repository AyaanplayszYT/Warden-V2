const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { WardenEmbed, EmbedTemplates, emojis, colors } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

function getTypeEmoji(type) {
    const typeEmojis = {
        ban: '🔨',
        kick: '👢',
        mute: '🔇',
        warn: '⚠️',
        unban: '🔓',
        unmute: '🔊',
        softban: '🔨',
        timeout: '⏰',
    };
    return typeEmojis[type?.toLowerCase()] || '📋';
}

module.exports = {
    data: {
        name: 'modlogs',
        description: 'View recent moderation actions and statistics.',
        options: [
            {
                name: 'limit',
                description: 'Number of recent actions to show (default: 10)',
                type: 4,
                required: false,
                min_value: 1,
                max_value: 50,
            },
            {
                name: 'user',
                description: 'Filter logs by a specific user',
                type: 6,
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the Moderate Members permission.')],
            });
        }

        const limit = interaction.options.getInteger('limit') || 10;
        const targetUser = interaction.options.getUser('user');

        let allActions = [];
        
        try {
            if (targetUser) {
                allActions = warningsDB.get(interaction.guild.id, targetUser.id);
            } else {
                const guildWarnings = warningsDB.warnings[interaction.guild.id] || {};
                for (const oderId in guildWarnings) {
                    allActions.push(...guildWarnings[oderId].map(w => ({ ...w, oderId })));
                }
                allActions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            }
        } catch (error) {
            logger.error('Error fetching mod logs:', error);
        }

        if (allActions.length === 0) {
            const noLogsEmbed = new WardenEmbed()
                .setType('info')
                .setTitle('Moderation Logs')
                .setDescription(
                    targetUser 
                        ? `No moderation actions recorded for **${targetUser.tag}**.`
                        : 'No moderation actions recorded yet.'
                )
                .build();
            
            return interaction.editReply({ embeds: [noLogsEmbed] });
        }

        const pages = [];
        const actionsPerPage = 5;
        const limitedActions = allActions.slice(0, limit);

        for (let i = 0; i < limitedActions.length; i += actionsPerPage) {
            const pageActions = limitedActions.slice(i, i + actionsPerPage);
            
            const embed = new WardenEmbed()
                .setType('primary')
                .setTitle('Moderation Logs')
                .setDescription(
                    targetUser 
                        ? `Showing actions for **${targetUser.tag}**`
                        : `Showing ${limitedActions.length} recent moderation actions`
                );

            pageActions.forEach(action => {
                const timestamp = action.timestamp ? Math.floor(new Date(action.timestamp).getTime() / 1000) : 0;
                const typeEmoji = getTypeEmoji(action.type);
                
                embed.addField(
                    `${typeEmoji} Case #${action.caseId || '?'} - ${(action.type || 'unknown').toUpperCase()}`,
                    [
                        `**User:** <@${action.userId || action.oderId || 'Unknown'}>`,
                        `**Moderator:** ${action.moderatorTag || 'Unknown'}`,
                        `**Reason:** ${action.reason || 'No reason provided'}`,
                        timestamp ? `**When:** <t:${timestamp}:R>` : ''
                    ].filter(Boolean).join('\n'),
                    false
                );
            });

            embed.setFooter(`Page ${pages.length + 1} - ${allActions.length} total actions`);
            pages.push(embed.build());
        }

        if (pages.length === 1) {
            return interaction.editReply({ embeds: [pages[0]] });
        }

        let currentPage = 0;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('modlogs_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('modlogs_page')
                .setLabel(`Page 1/${pages.length}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('modlogs_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pages.length <= 1)
        );

        const message = await interaction.editReply({
            embeds: [pages[0]],
            components: [row],
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 120000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'modlogs_prev') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'modlogs_next') {
                currentPage = Math.min(pages.length - 1, currentPage + 1);
            }

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('modlogs_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('modlogs_page')
                    .setLabel(`Page ${currentPage + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('modlogs_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === pages.length - 1)
            );

            await i.update({ embeds: [pages[currentPage]], components: [newRow] });
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('modlogs_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('modlogs_page')
                    .setLabel(`Page ${currentPage + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('modlogs_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await message.edit({ components: [disabledRow] }).catch(() => {});
        });

        logger.info(`Modlogs command used by ${interaction.user.tag}`);
    },
};
