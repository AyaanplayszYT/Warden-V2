const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

module.exports = {
    name: 'roast',
    description: 'Deliver a short, ruthless, hard-hitting roast.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Deliver a short, ruthless, hard-hitting roast')
        .addUserOption(opt =>
            opt
                .setName('target')
                .setDescription('The user to roast (defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('target') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        const daysOld = Math.floor((Date.now() - target.createdTimestamp) / (1000 * 60 * 60 * 24));
        const daysInServer = member?.joinedTimestamp
            ? Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))
            : 'Unknown';
        const highestRole = member?.roles.highest?.name || 'None';
        const hasCustomPfp = Boolean(target.avatar);

        const prompt = `You are a ruthless, brutally tough roast master. Deliver a devastating, hard-hitting burn targeting this Discord member.
Target Details:
• Username: ${target.username}
• Display Name: ${member?.displayName || target.username}
• Profile Picture: ${hasCustomPfp ? 'Custom avatar image' : 'Default generic Discord avatar'}
• Account Age: ${daysOld} days old
• Server Tenure: ${daysInServer} days in server
• Highest Role: ${highestRole}

Rules:
• Make it brutally tough, hard, and ruthless. Attack their username, generic pfp, low-effort persona, or server presence.
• Keep it SHORT: strictly 1 to 2 sharp sentences (maximum 40 words total).
• No greetings, no filler ("Oh look", "Well well"), no quotes. Just the raw burn.
• STRICT: Zero emojis.`;

        try {
            const roast = await aiClient.generate({ prompt, temperature: 0.95 });

            const embed = UI.embed()
                .color('error')
                .desc(`**${target.tag}**\n\n> ${roast}`);

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI Roast failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'Roast Engine Error',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `Roast generation failed: ${err.message}`
                    ),
                ],
            });
        }
    },
};
