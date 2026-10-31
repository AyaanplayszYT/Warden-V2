const { parseEmoji, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'emojiinfo',
        description: 'Inspect technical metadata, dimensions, and source for a custom emoji.',
        options: [
            {
                name: 'emoji',
                description: 'The custom emoji to inspect',
                type: 3, // STRING
                required: true,
            },
        ],
    },

    async execute(interaction) {
        const emojiInput = interaction.options.getString('emoji').trim();
        const parsed = parseEmoji(emojiInput);

        if (!parsed || !parsed.id) {
            return V2Templates.error(
                'Invalid Emoji',
                'Please supply a custom Discord emoji (e.g. `<:name:1234567890>`). Standard Unicode emojis do not have guild asset metadata.'
            ).reply(interaction, { ephemeral: true });
        }

        const extension = parsed.animated ? 'gif' : 'png';
        const emojiURL = `https://cdn.discordapp.com/emojis/${parsed.id}.${extension}?size=4096`;

        const guildEmoji = interaction.guild.emojis.cache.get(parsed.id);

        const card = new V2Card()
            .setAccent('primary')
            .setTitle(`[EMOJI METADATA] :${parsed.name}:`, `Identifier: \`${parsed.id}\``)
            .addField('Raw Format Code', `\`<${parsed.animated ? 'a' : ''}:${parsed.name}:${parsed.id}>\``, false)
            .addField('Animation State', parsed.animated ? 'Animated GIF' : 'Static PNG', true)
            .addField('Origin Guild', guildEmoji ? 'Local (This Server)' : 'External Server', true);

        if (guildEmoji) {
            const author = guildEmoji.author || await guildEmoji.fetchAuthor().catch(() => null);
            if (author) {
                card.addField('Uploaded By', `${author.tag} (\`${author.id}\`)`, true);
            }
            card.addField('Created Date', `<t:${Math.floor(guildEmoji.createdTimestamp / 1000)}:F>`, true);
            card.addField('Requires Colons', guildEmoji.requiresColons ? 'Yes' : 'No', true);
            card.addField('Managed by Integration', guildEmoji.managed ? 'Yes' : 'No', true);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Full Resolution Image')
                .setStyle(ButtonStyle.Link)
                .setURL(emojiURL)
        );

        card.addActionRow(row);
        card.setFooter(`Requested by ${interaction.user.tag}`);

        await card.reply(interaction);
        logger.info(`Emojiinfo fetched for ${parsed.name} (${parsed.id}) by ${interaction.user.tag}`);
    },
};
