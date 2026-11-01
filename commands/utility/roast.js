const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

const STYLES = {
    cyber: {
        name: 'Cyber Security Audit',
        instruction: 'Roast them as if TungTungSecure scanned their digital footprint, firewall weaknesses, and life choices.',
    },
    savage: {
        name: 'Savage Reality Check',
        instruction: 'Hit them with a brutally witty, clever roast that questions their existence in this Discord server.',
    },
    brainrot: {
        name: 'Funky Internet Brainrot',
        instruction: 'Use satirical modern internet slang, skibidi-level nonsense, and chaotic yap accusations.',
    },
    gentle: {
        name: 'Playful Tease',
        instruction: 'A lighthearted, funky tease suitable for friends without hurting feelings.',
    },
};

module.exports = {
    name: 'roast',
    description: 'Unleash a funky TungTungSecure AI roast upon a target.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Unleash a funky TungTungSecure AI roast upon a target')
        .addUserOption(opt =>
            opt
                .setName('target')
                .setDescription('The user to roast (defaults to you)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt
                .setName('style')
                .setDescription('The roasting flavor')
                .setRequired(false)
                .addChoices(
                    { name: 'Cyber Security Audit', value: 'cyber' },
                    { name: 'Savage Reality Check', value: 'savage' },
                    { name: 'Funky Internet Brainrot', value: 'brainrot' },
                    { name: 'Playful Tease', value: 'gentle' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('target') || interaction.user;
        const styleKey = interaction.options.getString('style') || 'cyber';
        const style = STYLES[styleKey] || STYLES.cyber;

        const member = interaction.guild.members.cache.get(target.id);
        const createdDate = target.createdAt.toISOString().split('T')[0];
        const joinedDate = member ? member.joinedAt?.toISOString().split('T')[0] : 'Unknown';
        const highestRole = member?.roles.highest?.name || 'None';

        const prompt = `Perform a funky roast on this Discord member.
Target Username: ${target.username}
Display Name: ${member?.displayName || target.username}
Account Created: ${createdDate}
Joined Server: ${joinedDate}
Highest Role: ${highestRole}
Roast Style: ${style.name} (${style.instruction})

Remember: Zero emojis. Keep it under 150 words. Be witty, creative, and undeniably funky.`;

        try {
            const roast = await aiClient.generate({ prompt, temperature: 0.9 });

            const embed = UI.embed()
                .color('warning')
                .title('TungTungSecure • Roast Protocol')
                .desc(`Target: <@${target.id}> (\`${target.tag}\`) • Style: **${style.name}**\n\n${roast}`)
                .footer(`Roast delivered by TungTungSecure • Requested by ${interaction.user.tag}`);

            return interaction.editReply({ embeds: [embed.build()] });
        } catch (err) {
            logger.error('AI Roast failed:', err);
            return interaction.editReply({
                embeds: [
                    UI.error(
                        'Roast Engine Malfunction',
                        err.message.includes('OPENROUTER_API_KEY')
                            ? 'OpenRouter API key is not configured in .env (add `OPENROUTER_API_KEY=your_key`).'
                            : `TungTung AI roast engine encountered an error: ${err.message}`
                    ),
                ],
            });
        }
    },
};
