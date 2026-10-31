const { SlashCommandBuilder, parseEmoji, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { UI, PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emojiinfo')
        .setDescription('Inspect specifications for a custom emoji')
        .addStringOption(opt =>
            opt.setName('emoji')
                .setDescription('The custom emoji to inspect')
                .setRequired(true)
        ),

    async execute(interaction) {
        const input = interaction.options.getString('emoji').trim();
        const parsed = parseEmoji(input);

        if (!parsed || !parsed.id) {
            return interaction.reply({
                embeds: [UI.error('Invalid Emoji', 'Please provide a custom Discord emoji (e.g. `<:name:1234567890>`). Standard Unicode emojis do not have guild asset metadata.')],
                ephemeral: true,
            });
        }

        const ext = parsed.animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${parsed.id}.${ext}?size=2048`;

        const embed = new PremiumEmbed()
            .title(`:${parsed.name}:`)
            .thumbnail(url)
            .field('Metadata', `**ID** • \`${parsed.id}\`\n**Animated** • ${parsed.animated ? 'Yes' : 'No'}\n**Format** • \`<${parsed.animated ? 'a' : ''}:${parsed.name}:${parsed.id}>\``, false)
            .build();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Image')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        logger.info(`Emojiinfo checked for ${parsed.name} by ${interaction.user.tag}`);
    },
};
