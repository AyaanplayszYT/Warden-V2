const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'warnings',
        description: 'View or manage recorded warnings for a user.',
        options: [
            {
                name: 'list',
                description: 'List warnings for a user',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'user',
                        description: 'The user to check warnings for',
                        type: 6, // USER
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
            {
                name: 'remove',
                description: 'Remove a specific warning by Case ID',
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
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand() || 'list';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to execute this command.'
            ).reply(interaction, { ephemeral: true });
        }

        if (subcommand === 'list') {
            await this.listWarnings(interaction);
        } else if (subcommand === 'clear') {
            await this.clearWarnings(interaction);
        } else if (subcommand === 'remove') {
            await this.removeWarning(interaction);
        }
    },

    async listWarnings(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user');
        const warnings = warningsDB.get(interaction.guild.id, targetUser.id);

        if (!warnings || warnings.length === 0) {
            return V2Templates.info(
                'No Warnings on Record',
                `Target **${targetUser.tag}** (\`${targetUser.id}\`) has zero recorded warnings in this server.`
            ).editReply(interaction);
        }

        const warningsPerPage = 5;
        const totalPages = Math.ceil(warnings.length / warningsPerPage);
        const pages = [];

        for (let i = 0; i < warnings.length; i += warningsPerPage) {
            const pageWarnings = warnings.slice(i, i + warningsPerPage);
            const pageIndex = Math.floor(i / warningsPerPage);

            const card = new V2Card()
                .setAccent('info')
                .setTitle(`[WARNING LOGS] ${targetUser.tag}`, `Displaying records ${i + 1}–${Math.min(i + warningsPerPage, warnings.length)} of ${warnings.length}`);

            for (const warning of pageWarnings) {
                const ts = Math.floor(new Date(warning.timestamp).getTime() / 1000);
                card.addField(
                    `Case #${warning.caseId} [${warning.type.toUpperCase()}]`,
                    `**Moderator:** ${warning.moderatorTag}\n**Reason:** ${warning.reason}\n**Date:** <t:${ts}:R>`,
                    false
                );
            }

            pages.push(card);
        }

        if (pages.length === 1) {
            return pages[0].editReply(interaction);
        }

        let currentPage = 0;

        const makeRow = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('page_first')
                .setLabel('First')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('page_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`${page + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('page_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('page_last')
                .setLabel('Last')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        );

        const currentCard = pages[0];
        currentCard.actionRows = [makeRow(0)];

        const replyMessage = await interaction.editReply({
            ...currentCard.toPayload(),
            components: [currentCard.buildContainer()]
        });

        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 60000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'page_first') currentPage = 0;
            else if (i.customId === 'page_prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'page_next') currentPage = Math.min(totalPages - 1, currentPage + 1);
            else if (i.customId === 'page_last') currentPage = totalPages - 1;

            const pageCard = pages[currentPage];
            pageCard.actionRows = [makeRow(currentPage)];

            await i.update({
                ...pageCard.toPayload(),
                components: [pageCard.buildContainer()]
            }).catch(() => {});
        });

        collector.on('end', async () => {
            const finalCard = pages[currentPage];
            finalCard.actionRows = [];
            await interaction.editReply({
                ...finalCard.toPayload(),
                components: [finalCard.buildContainer()]
            }).catch(() => {});
        });
    },

    async clearWarnings(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user');

        const success = warningsDB.clear(interaction.guild.id, targetUser.id);
        if (!success) {
            return V2Templates.info(
                'No Warnings to Clear',
                `Target **${targetUser.tag}** had no recorded warnings.`
            ).editReply(interaction);
        }

        return V2Templates.success(
            'Warnings Cleared',
            `All warning entries for **${targetUser.tag}** have been expunged from the database.`
        ).editReply(interaction);
    },

    async removeWarning(interaction) {
        await interaction.deferReply();
        const caseId = interaction.options.getInteger('case_id');

        const success = warningsDB.removeByCaseId(interaction.guild.id, caseId);
        if (!success) {
            return V2Templates.error(
                'Case Not Found',
                `Warning with Case ID \`#${caseId}\` was not found in this guild's database.`
            ).editReply(interaction);
        }

        return V2Templates.success(
            'Warning Removed',
            `Warning Case ID \`#${caseId}\` has been permanently deleted.`
        ).editReply(interaction);
    },
};
