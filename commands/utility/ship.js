const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

function getSynergyScore(id1, id2) {
    try {
        const combined = BigInt(id1) + BigInt(id2);
        return Number(combined % 101n);
    } catch (e) {
        return Math.floor(Math.random() * 100) + 1;
    }
}

function makeProgressBar(percent) {
    const totalBars = 12;
    const filled = Math.round((percent / 100) * totalBars);
    return `[${'■'.repeat(filled)}${'□'.repeat(totalBars - filled)}]`;
}

module.exports = {
    name: 'ship',
    description: 'TungTungSecure AI evaluates romantic and chaotic compatibility between two members.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('TungTungSecure AI evaluates compatibility between two members')
        .addUserOption(opt =>
            opt
                .setName('first_user')
                .setDescription('The first member')
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt
                .setName('second_user')
                .setDescription('The second member')
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
                        'Self-Obsession Detected',
                        'TungTungSecure calculates a **100%** narcissistic compatibility score with yourself. Go touch some digital grass.'
                    ),
                ],
            });
        }

        const score = getSynergyScore(user1.id, user2.id);
        const bar = makeProgressBar(score);

        const prompt = `Evaluate the relationship and compatibility of these two Discord members.
Member 1: ${user1.username}
Member 2: ${user2.username}
Calculated Synergy Score: ${score}%

Provide a funky, witty assessment featuring these bullet points:
• Duo Codename: A fused couple moniker
• Relationship Dynamic: How they act together and the chaos they bring
• TungTung Threat Assessment: Why this pairing poses a danger to server peace
• Future Forecast: A ridiculous prophecy of their future together

Remember: Zero emojis. Keep it under 180 words. Be sarcastic, funky, and entertaining.`;

        try {
            const analysis = await aiClient.generate({ prompt, temperature: 0.85 });

            const embed = UI.embed()
                .color(score > 70 ? 'success' : score > 40 ? 'warning' : 'error')
                .title('TungTungSecure • Compatibility Matrix')
                .desc(
                    `Coupling: <@${user1.id}> + <@${user2.id}>\n` +
                    `Synergy Index: **${score}%** \`${bar}\`\n\n` +
                    `${analysis}`
                )
                .footer(`TungTung Compatibility Engine • Requested by ${interaction.user.tag}`);

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI Ship calculation failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'Compatibility Sensor Failure',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `TungTung matrix calculation encountered an error: ${err.message}`
                    ),
                ],
            });
        }
    },
};
