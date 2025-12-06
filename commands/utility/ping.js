const { WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'ping',
        description: 'Check the bot\'s latency and response time.',
        options: [],
    },

    async execute(interaction) {
        const sent = await interaction.deferReply({ fetchReply: true });
        
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = Math.round(interaction.client.ws.ping);

        // Determine status based on latency
        const getStatus = (ms) => {
            if (ms < 100) return { emoji: '🟢', text: 'Excellent' };
            if (ms < 200) return { emoji: '🟡', text: 'Good' };
            if (ms < 400) return { emoji: '🟠', text: 'Fair' };
            return { emoji: '🔴', text: 'Poor' };
        };

        const roundtripStatus = getStatus(roundtripLatency);
        const wsStatus = getStatus(wsLatency);

        // Create a visual latency bar
        const createBar = (ms) => {
            const maxBars = 10;
            const filledBars = Math.min(Math.round((1 - ms / 500) * maxBars), maxBars);
            const emptyBars = maxBars - Math.max(filledBars, 0);
            return '█'.repeat(Math.max(filledBars, 1)) + '░'.repeat(Math.max(emptyBars, 0));
        };

        const embed = new WardenEmbed()
            .setType('primary')
            .setTitle(`${emojis.ping} Pong!`)
            .setDescription('Here are the current latency metrics:')
            .addField(
                `${emojis.reply} Roundtrip Latency`,
                `\`${roundtripLatency}ms\` ${roundtripStatus.emoji} ${roundtripStatus.text}\n${createBar(roundtripLatency)}`,
                true
            )
            .addField(
                `${emojis.stats} WebSocket Latency`,
                `\`${wsLatency}ms\` ${wsStatus.emoji} ${wsStatus.text}\n${createBar(wsLatency)}`,
                true
            )
            .addField(
                `${emojis.info} Connection Status`,
                `${wsLatency < 200 ? '✅ Connected and responsive' : '⚠️ Some latency detected'}`,
                false
            )
            .build();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Ping command used by ${interaction.user.tag} - Roundtrip: ${roundtripLatency}ms, WS: ${wsLatency}ms`);
    },
};
