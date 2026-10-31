const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UI, PremiumEmbed } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Inspect or manage recorded warnings for a member')
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List warnings for a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user to inspect').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user to clear').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a specific warning by Case ID')
                .addIntegerOption(opt => opt.setName('case_id').setDescription('Case ID to remove').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('user');
            const warnings = warningsDB.get(interaction.guild.id, targetUser.id);

            if (!warnings || warnings.length === 0) {
                return interaction.reply({
                    embeds: [UI.info('No Warnings Found', `${targetUser.tag} has zero recorded warnings in this server.`)],
                    ephemeral: true,
                });
            }

            const perPage = 5;
            const totalPages = Math.ceil(warnings.length / perPage);
            let currentPage = 0;

            const makeEmbed = (page) => {
                const slice = warnings.slice(page * perPage, (page + 1) * perPage);
                const desc = slice.map(w => {
                    const ts = Math.floor(new Date(w.timestamp).getTime() / 1000);
                    return `**Case #${w.caseId}** • \`${w.type.toUpperCase()}\` • <t:${ts}:R>\n**Moderator** • ${w.moderatorTag}\n**Reason** • ${w.reason}`;
                }).join('\n\n');

                return new PremiumEmbed()
                    .color('info')
                    .title(`Warnings • ${targetUser.tag}`)
                    .desc(desc)
                    .footer(`Page ${page + 1} of ${totalPages} • Total: ${warnings.length}`)
                    .build();
            };

            if (totalPages === 1) {
                return interaction.reply({ embeds: [makeEmbed(0)] });
            }

            const makeRow = (page) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            );

            const msg = await interaction.reply({
                embeds: [makeEmbed(0)],
                components: [makeRow(0)],
                fetchReply: true,
            });

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
                if (i.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
                await i.update({ embeds: [makeEmbed(currentPage)], components: [makeRow(currentPage)] }).catch(() => {});
            });

            collector.on('end', async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });

        } else if (subcommand === 'clear') {
            const targetUser = interaction.options.getUser('user');
            const success = warningsDB.clear(interaction.guild.id, targetUser.id);
            if (!success) {
                return interaction.reply({
                    embeds: [UI.info('No Warnings Found', `${targetUser.tag} has no recorded warnings to clear.`)],
                    ephemeral: true,
                });
            }

            return interaction.reply({
                embeds: [UI.success('Warnings Cleared', `All warnings for **${targetUser.tag}** have been cleared.`)],
            });

        } else if (subcommand === 'remove') {
            const caseId = interaction.options.getInteger('case_id');
            const success = warningsDB.removeByCaseId(interaction.guild.id, caseId);
            if (!success) {
                return interaction.reply({
                    embeds: [UI.error('Not Found', `Warning with Case ID \`#${caseId}\` was not found.`)],
                    ephemeral: true,
                });
            }

            return interaction.reply({
                embeds: [UI.success('Warning Removed', `Warning Case ID \`#${caseId}\` has been removed.`)],
            });
        }
    },
};
