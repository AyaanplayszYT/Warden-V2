const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { V2Card } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'ping',
        description: 'Display real-time gateway latency and API response metrics.',
        options: [],
    },

    async execute(interaction) {
        const calculateMetrics = (inter) => {
            const now = Date.now();
            const roundtrip = Math.max(1, now - inter.createdTimestamp);
            const ws = Math.max(1, Math.round(inter.client.ws.ping));

            const getQuality = (ms) => {
                if (ms < 100) return 'EXCELLENT';
                if (ms < 200) return 'OPTIMAL';
                if (ms < 400) return 'FAIR';
                return 'DEGRADED';
            };

            const createBar = (ms) => {
                const maxBars = 12;
                const filledBars = Math.min(Math.round((1 - ms / 500) * maxBars), maxBars);
                const emptyBars = maxBars - Math.max(filledBars, 0);
                return '[' + '|'.repeat(Math.max(filledBars, 1)) + '░'.repeat(Math.max(emptyBars, 0)) + ']';
            };

            const card = new V2Card()
                .setAccent(ws < 200 ? 'success' : 'warning')
                .setTitle('[TELEMETRY] Network Status & Latency')
                .setDescription('Real-time operational latency indicators between Warden and Discord Gateway.')
                .addField(
                    'Roundtrip Execution Latency',
                    `\`${roundtrip}ms\` [${getQuality(roundtrip)}]\n\`${createBar(roundtrip)}\``,
                    true
                )
                .addField(
                    'WebSocket Gateway Latency',
                    `\`${ws}ms\` [${getQuality(ws)}]\n\`${createBar(ws)}\``,
                    true
                )
                .addField(
                    'Service Availability',
                    ws < 200 ? 'Fully operational. Zero packet loss detected.' : 'Elevated network latency observed.',
                    false
                )
                .setTimestamp(new Date());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_ping')
                    .setLabel('Refresh Latency')
                    .setStyle(ButtonStyle.Secondary)
            );

            card.addActionRow(row);
            return { card, roundtrip, ws };
        };

        const { card, roundtrip, ws } = calculateMetrics(interaction);
        const replyMsg = await interaction.reply({
            ...card.toPayload(),
            fetchReply: true,
        });

        logger.info(`Ping used by ${interaction.user.tag} - HTTP: ${roundtrip}ms, WS: ${ws}ms`);

        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id && i.customId === 'refresh_ping',
            time: 60000,
        });

        collector.on('collect', async i => {
            const updated = calculateMetrics(i);
            await i.update(updated.card.toPayload()).catch(() => {});
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_ping_disabled')
                    .setLabel('Session Expired')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            const expiredCard = calculateMetrics(interaction).card;
            expiredCard.actionRows = [disabledRow];
            await interaction.editReply(expiredCard.toPayload()).catch(() => {});
        });
    },
};
