const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'warnings',
        description: 'View warnings for a user or manage warning cases.',
        options: [
            {
                name: 'view',
                description: 'View all warnings for a user',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'user',
                        description: 'The user to view warnings for',
                        type: 6, // USER
                        required: true,
                    },
                ],
            },
            {
                name: 'remove',
                description: 'Remove a specific warning by case ID',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'case_id',
                        description: 'The case ID to remove',
                        type: 4, // INTEGER
                        required: true,
                    },
                ],
            },
            {
                name: 'clear',
                description: 'Clear all warnings for a user',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'user',
                        description: 'The user to clear warnings for',
                        type: 6, // USER
                        required: true,
                    },
                ],
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Moderate Members** permission to use this command.')],
                ephemeral: true,
            });
        }

        switch (subcommand) {
            case 'view':
                await this.viewWarnings(interaction);
                break;
            case 'remove':
                await this.removeWarning(interaction);
                break;
            case 'clear':
                await this.clearWarnings(interaction);
                break;
        }
    },

    async viewWarnings(interaction) {
        const targetUser = interaction.options.getUser('user');
        const warnings = warningsDB.get(interaction.guild.id, targetUser.id);

        if (warnings.length === 0) {
            return interaction.reply({
                embeds: [EmbedTemplates.info('No Warnings', `**${targetUser.tag}** has no warnings in this server.`)],
            });
        }

        // Create paginated embeds (5 warnings per page)
        const warningsPerPage = 5;
        const pages = [];

        for (let i = 0; i < warnings.length; i += warningsPerPage) {
            const pageWarnings = warnings.slice(i, i + warningsPerPage);
            
            const embed = new WardenEmbed()
                .setType('info')
                .setTitle(`${emojis.logs} Warnings for ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Showing ${i + 1}-${Math.min(i + warningsPerPage, warnings.length)} of ${warnings.length} warnings`)
                .build();

            for (const warning of pageWarnings) {
                const date = new Date(warning.timestamp);
                embed.addFields({
                    name: `Case #${warning.caseId} | ${warning.type.toUpperCase()}`,
                    value: `**Moderator:** ${warning.moderatorTag}\n**Reason:** ${warning.reason}\n**Date:** <t:${Math.floor(date.getTime() / 1000)}:R>`,
                    inline: false,
                });
            }

            pages.push(embed);
        }

        if (pages.length === 1) {
            return interaction.reply({ embeds: [pages[0]] });
        }

        // Pagination
        let currentPage = 0;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('page')
                .setLabel(`1/${pages.length}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pages.length <= 1)
        );

        const message = await interaction.reply({
            embeds: [pages[0]],
            components: [row],
            fetchReply: true,
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 120000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }

            row.components[0].setDisabled(currentPage === 0);
            row.components[1].setLabel(`${currentPage + 1}/${pages.length}`);
            row.components[2].setDisabled(currentPage >= pages.length - 1);

            await i.update({ embeds: [pages[currentPage]], components: [row] });
        });

        collector.on('end', () => {
            row.components.forEach(c => c.setDisabled(true));
            message.edit({ components: [row] }).catch(() => {});
        });
    },

    async removeWarning(interaction) {
        const caseId = interaction.options.getInteger('case_id');
        
        const warning = warningsDB.getByCase(interaction.guild.id, caseId);
        if (!warning) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Case Not Found', `No warning with case ID **#${caseId}** was found.`)],
                ephemeral: true,
            });
        }

        const removed = warningsDB.removeByCase(interaction.guild.id, caseId);
        if (removed) {
            const embed = EmbedTemplates.success(
                'Warning Removed',
                `Successfully removed warning case **#${caseId}** from <@${warning.userId}>.`
            );
            logger.info(`${interaction.user.tag} removed warning case #${caseId} in ${interaction.guild.name}`);
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Removal Failed', 'Failed to remove the warning.')],
                ephemeral: true,
            });
        }
    },

    async clearWarnings(interaction) {
        const targetUser = interaction.options.getUser('user');
        const currentCount = warningsDB.count(interaction.guild.id, targetUser.id);

        if (currentCount === 0) {
            return interaction.reply({
                embeds: [EmbedTemplates.info('No Warnings', `**${targetUser.tag}** has no warnings to clear.`)],
                ephemeral: true,
            });
        }

        // Confirmation dialog
        const confirmEmbed = new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} Confirm Clear Warnings`)
            .setDescription(`Are you sure you want to clear all **${currentCount}** warning(s) for **${targetUser.tag}**?\n\nThis action cannot be undone.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .build();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('clear_confirm')
                .setLabel('Clear All Warnings')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('clear_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        const message = await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            fetchReply: true,
        });

        try {
            const buttonInteraction = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 30000,
            });

            if (buttonInteraction.customId === 'clear_cancel') {
                const cancelEmbed = EmbedTemplates.info('Cancelled', 'Warning clear action has been cancelled.');
                return buttonInteraction.update({ embeds: [cancelEmbed], components: [] });
            }

            const clearedCount = warningsDB.clear(interaction.guild.id, targetUser.id);
            const successEmbed = EmbedTemplates.success(
                'Warnings Cleared',
                `Successfully cleared **${clearedCount}** warning(s) from **${targetUser.tag}**.`
            );

            logger.info(`${interaction.user.tag} cleared ${clearedCount} warnings for ${targetUser.tag} in ${interaction.guild.name}`);
            return buttonInteraction.update({ embeds: [successEmbed], components: [] });

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const timeoutEmbed = EmbedTemplates.error('Timed Out', 'Confirmation timed out. No warnings were cleared.');
                return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
            throw error;
        }
    },
};
