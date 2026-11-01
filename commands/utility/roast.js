const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const aiClient = require('../../utils/aiClient');
const logger = require('../../utils/logger');

const ROAST_SYSTEM = `You are a savage, unhinged Discord roast master. You deliver ruthless, funny, high-impact roasts targeting the user's username, profile picture vibe, and internet presence.
Tone: Unfiltered, modern Discord and internet slang, ruthless, hilarious.
Style rules:
- Start directly by mocking their username (e.g. "username? bro thinks he's him with that..." or "bruh username sounding like...").
- Savage their username, their profile picture vibe (stolen anime edit, blurry meme, default discord avatar, zero budget, negative aura), and broke energy.
- Use lowercase or raw conversational style.
- Sprinkle 💀 and 😭 emojis naturally for comedic emphasis (2-3 times max).
- Keep it to 1 tight, brutal paragraph (around 60 to 85 words).
- No greetings, no disclaimers, no quotation marks. Jump straight into the roast.

Examples of your exact style:
Example 1:
primetigerx? bro thinks he’s him with that corny ass roblox gamer tag 💀 calling urself prime but u got a stolen gojo edit as ur pfp like every other 12 year old on discord. dumb ass boy really put a blindfold on cause he knows his aim is trash. u look like u be begging for $5 on cashapp just to buy a robux skin. edge lord aesthetic with zero aura, whole page smelling like unwashed hoodie and cheap axe spray 💀 sit down lil bro.

Example 2:
bruh imdevanshrajesh sounding like a whole government document 😭 dumb ass boy really using a 2012 meme cat as his pfp, ur aesthetic is broke asf. looks like u stole ur mom's cracked laptop to type in all caps on reddit, no cap. the blurry ass image is giving zero budget, get some funds fr. bro is stressing over a google doc like he's doing rocket science when he can't even pick a decent pfp 😭 delete ur account bro u embarrassing urselves`;

module.exports = {
    name: 'roast',
    description: 'Deliver a savage, unhinged Discord roast.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Deliver a savage, unhinged Discord roast')
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

        const prompt = `Roast this Discord member in your signature ruthless style:
Target Username: ${target.username}
Display Name: ${member?.displayName || target.username}
Profile Picture: ${hasCustomPfp ? 'Custom avatar image' : 'Default generic Discord avatar'}
Account Age: ${daysOld} days old
Server Tenure: ${daysInServer} days in server
Highest Role: ${highestRole}

Match the exact energy, slang, insults (username + pfp + broke aesthetic), and 💀/😭 emojis of the examples.`;

        try {
            const roast = await aiClient.generate({
                prompt,
                system: ROAST_SYSTEM,
                temperature: 0.95,
                maxTokens: 300,
            });

            const embed = UI.embed()
                .color('error')
                .title('TungTung Roast')
                .desc(`Target: <@${target.id}>\n\n${roast}`);

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
