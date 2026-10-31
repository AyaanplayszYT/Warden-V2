const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const stickerManager = require('../../utils/stickerManager');

const PAGE_SIZE = 25;

module.exports = {
    name: 'stickers',
    description: 'Browse all custom stickers and emojis available to use.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('stickers')
        .setDescription('Browse all custom stickers and emojis available to use')
        .addIntegerOption(option =>
            option
                .setName('page')
                .setDescription('Directory page number')
                .setMinValue(1)
                .setRequired(false)
        ),

    async execute(interaction) {
        const stickers = stickerManager.getAll();
        const total = stickers.length;

        if (total === 0) {
            return interaction.reply({
                embeds: [UI.info('No Stickers Found', 'No custom stickers are currently installed.')],
                ephemeral: true,
            });
        }

        const totalPages = Math.ceil(total / PAGE_SIZE);
        const page = Math.min(interaction.options.getInteger('page') || 1, totalPages);
        const start = (page - 1) * PAGE_SIZE;
        const currentList = stickers.slice(start, start + PAGE_SIZE);

        const embed = UI.embed()
            .color('primary')
            .title('Custom Stickers & Emojis')
            .desc(
                `Total Stickers: **${total}** • Page **${page}** of **${totalPages}**\n\n` +
                '**How to Use Anywhere:**\n' +
                '• Slash command: `/sticker name:<sticker_name>`\n' +
                '• Chat shortcut: Type `:name:` or `;name` in chat (e.g. `:pepe_noob:` or `;baka`)\n\n' +
                '**Available in this page:**\n' +
                currentList.map(s => `• \`${s.id}\` (${s.isAnimated ? 'Animated GIF' : 'PNG'})`).join('\n')
            )
            .footer(`Use /stickers page:${page < totalPages ? page + 1 : 1} to view more`);

        return interaction.reply({ embeds: [embed.build()] });
    },
};

