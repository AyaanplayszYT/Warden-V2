const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

function getLoveScore(id1, id2) {
    try {
        const n1 = BigInt(id1);
        const n2 = BigInt(id2);
        // Generates an affectionate synergy score between 62% and 99%
        const seed = (n1 * 17n + n2 * 31n) % 38n;
        return 62 + Number(seed);
    } catch (e) {
        return Math.floor(Math.random() * 30) + 70;
    }
}

function makeProgressBar(percent) {
    const totalBars = 10;
    const filled = Math.round((percent / 100) * totalBars);
    return `[${'■'.repeat(filled)}${'□'.repeat(totalBars - filled)}]`;
}

module.exports = {
    name: 'ship',
    description: 'Evaluate romantic chemistry and affection between two members.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Evaluate romantic chemistry and affection between two members')
        .addUserOption(opt =>
            opt
                .setName('first_user')
                .setDescription('First member')
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt
                .setName('second_user')
                .setDescription('Second member')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const user1 = interaction.options.getUser('first_user');
        const user2 = interaction.options.getUser('second_user');

        if (user1.id === user2.id) {
            return interaction.editReply({
                embeds: [
                    UI.info(
                        'Self-Love',
                        'A perfect 100% self-love score. Unmatched inner peace.'
                    ),
                ],
            });
        }

        const score = getLoveScore(user1.id, user2.id);
        const bar = makeProgressBar(score);

        const prompt = `Write an affectionate, deeply heartwarming, and sweet romantic ship evaluation for two Discord members.
Member 1: ${user1.username}
Member 2: ${user2.username}
Love Synergy: ${score}%

Format using strictly these concise bullet points:
• Duo: An adorable fused couple moniker
• Connection: Why their personalities complement each other and their wholesome chemistry
• Forecast: A sweet, lovable prediction of their future together

Rules:
• Keep it genuinely loving, warm, and sweet (not sarcastic).
• Keep it minimal and concise (under 80 words total).
• STRICT: Zero emojis.`;

        try {
            const analysis = await aiClient.generate({ prompt, temperature: 0.8 });

            const embed = UI.embed()
                .color('primary')
                .title('Affinity Matrix')
                .desc(
                    `<@${user1.id}> + <@${user2.id}>\n` +
                    `Synergy: **${score}%** \`${bar}\`\n\n` +
                    `${analysis}`
                );

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI Ship calculation failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'Compatibility Sensor Failure',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `Affinity analysis failed: ${err.message}`
                    ),
                ],
            });
        }
    },
};
