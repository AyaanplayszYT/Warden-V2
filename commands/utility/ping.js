const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and gateway connection'),

    async execute(interaction) {
        const getEmbed = (inter) => {
            const roundtrip = Math.max(1, Date.now() - inter.createdTimestamp);
            const ws = Math.max(1, Math.round(inter.client.ws.ping));

            const quality = ws < 100 ? 'Optimal' : ws < 250 ? 'Good' : 'Elevated';
            const color = ws < 100 ? 'success' : ws < 250 ? 'primary' : 'warning';

            return new PremiumEmbed()
                .color(color)
                .title('Latency Telemetry')
                .desc(`**Gateway** • \`${ws}ms\` (${quality})\n**Execution** • \`${roundtrip}ms\`\n**Status** • Connected`)
                .build();
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_ping')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({
            embeds: [getEmbed(interaction)],
            components: [row],
            fetchReply: true,
        });

        logger.info(`Ping used by ${interaction.user.tag}`);

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id && i.customId === 'refresh_ping',
            time: 60000,
        });

        collector.on('collect', async i => {
            await i.update({ embeds: [getEmbed(i)] }).catch(() => {});
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(() => {});
        });
    },
};
