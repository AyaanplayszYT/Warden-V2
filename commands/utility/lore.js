const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

const GENRES = {
    mythic: {
        name: 'Ancient Digital Mythos',
        instruction: 'Write it like a sacred ancient mythological chronicle, speaking of cosmic prophecies and legendary feats.',
    },
    cyberpunk: {
        name: 'Neon Cyberpunk Dystopia',
        instruction: 'Write it like a shadowy corporate intelligence file from a neon dystopian hacker underground.',
    },
    conspiracy: {
        name: 'Unhinged Classified Files',
        instruction: 'Write it like an ultra-classified, paranoiac TungTung conspiracy report with ridiculous theories.',
    },
    anime: {
        name: 'Shonen Anime Arc',
        instruction: 'Write it like a high-stakes dramatic anime protagonist origin with power levels and tournament arcs.',
    },
};

module.exports = {
    name: 'lore',
    description: 'Generate funky server mythology and legendary backstory about a subject.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('lore')
        .setDescription('Generate funky server mythology and legendary backstory about a subject')
        .addStringOption(opt =>
            opt
                .setName('subject')
                .setDescription('The member, inside joke, or topic to generate lore for')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt
                .setName('genre')
                .setDescription('The narrative style')
                .setRequired(false)
                .addChoices(
                    { name: 'Ancient Digital Mythos', value: 'mythic' },
                    { name: 'Neon Cyberpunk Dystopia', value: 'cyberpunk' },
                    { name: 'Unhinged Classified Files', value: 'conspiracy' },
                    { name: 'Shonen Anime Arc', value: 'anime' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const subject = interaction.options.getString('subject');
        const genreKey = interaction.options.getString('genre') || 'conspiracy';
        const genre = GENRES[genreKey] || GENRES.conspiracy;

        const prompt = `Fabricate an epic, funky piece of server mythology about: "${subject}".
Genre: ${genre.name} (${genre.instruction})
Guild Context: Server name is "${interaction.guild.name}".
Write as TungTungSecure AI unearthing a classified archive record.
Include hilarious deeds, exaggerated accomplishments, and a funky final warning.
Remember: Zero emojis. Keep it under 200 words. Be cinematic, satirical, and funky.`;

        try {
            const lore = await aiClient.generate({ prompt, temperature: 0.9 });

            const embed = UI.embed()
                .color('primary')
                .title('TungTungSecure • Classified Lore Registry')
                .desc(`Subject: **${subject}** • Dossier Style: **${genre.name}**\n\n${lore}`)
                .footer(`Declassified by TungTungSecure • Requested by ${interaction.user.tag}`);

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI Lore generation failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'Archive Retrieval Failed',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `TungTung archive mainframe reported an error: ${err.message}`
                    ),
                ],
            });
        }
    },
};

