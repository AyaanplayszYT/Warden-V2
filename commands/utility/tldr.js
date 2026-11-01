const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

module.exports = {
    name: 'tldr',
    description: 'TungTungSecure AI analyzes and summarizes recent channel conversation.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('tldr')
        .setDescription('TungTungSecure AI analyzes and summarizes recent channel conversation')
        .addIntegerOption(opt =>
            opt
                .setName('messages')
                .setDescription('Number of recent messages to analyze (10 - 100, default: 35)')
                .setMinValue(10)
                .setMaxValue(100)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const limit = interaction.options.getInteger('messages') || 35;

        try {
            const fetched = await interaction.channel.messages.fetch({ limit });
            const userMessages = fetched
                .filter(m => !m.author.bot && m.content && m.content.trim().length > 0)
                .reverse();

            if (userMessages.size < 3) {
                return interaction.editReply({
                    embeds: [UI.info('Insufficient Data', 'Not enough recent chat activity in this channel to generate a TL;DR summary.')],
                });
            }

            const formattedLogs = userMessages
                .map(m => `${m.author.username}: ${m.content.substring(0, 200)}`)
                .join('\n')
                .substring(0, 3000);

            const prompt = `Analyze these recent Discord chat messages from #${interaction.channel.name}.
Provide a funky, sharp executive summary in exactly these three bullet sections:
• The Topic: A hilarious, concise explanation of what was happening or being debated.
• Chief Yap Officer: Name the user who dominated the conversation or stirred the drama, and why.
• TungTung's Threat Assessment: A funny final security assessment of the server's sanity.

Chat Logs:
${formattedLogs}

Remember: Zero emojis. Keep it punchy, witty, and funky.`;

            const summary = await aiClient.generate({ prompt, temperature: 0.8 });

            const embed = UI.embed()
                .color('primary')
                .title('TungTungSecure • Channel Intel TL;DR')
                .desc(`Channel: <#${interaction.channel.id}> • Scanned: **${userMessages.size}** messages\n\n${summary}`)
                .footer(`TungTung Intelligence • Requested by ${interaction.user.tag}`);

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI TL;DR failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'TL;DR Analysis Failed',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `TungTung AI could not process channel telemetry: ${err.message}`
                    ),
                ],
            });
        }
    },
};

