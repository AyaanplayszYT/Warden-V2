const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { WardenEmbed, EmbedTemplates, colors, emojis } = require('../../utils/embedBuilder');

module.exports = {
    name: 'emojiinfo',
    description: 'Display information about a custom emoji',
    usage: 'emojiinfo <emoji>',
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('emojiinfo')
        .setDescription('Display information about a custom emoji')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The custom emoji to get information about')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const emojiInput = interaction.options?.getString('emoji') || interaction.args?.[0];
        
        if (!emojiInput) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('No Emoji', 'Please provide a custom emoji.')],
                ephemeral: true
            });
        }

        // Parse emoji from input
        const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
        const match = emojiInput.match(emojiRegex);
        
        if (!match) {
            // Try to find emoji by name in the guild
            const emojiByName = interaction.guild.emojis.cache.find(
                e => e.name.toLowerCase() === emojiInput.toLowerCase()
            );
            
            if (!emojiByName) {
                return interaction.reply({
                    embeds: [EmbedTemplates.error(
                        'Invalid emoji! Please provide a valid custom emoji.\n\n' +
                        '**Examples:**\n' +
                        '• `:emoji_name:` (from this server)\n' +
                        '• `<:emoji_name:123456789>`\n' +
                        '• `<a:animated_emoji:123456789>`'
                    )],
                    ephemeral: true
                });
            }
            
            return sendEmojiInfo(interaction, emojiByName);
        }

        const [, animated, name, id] = match;
        
        // Try to get emoji from cache first
        let emoji = client.emojis.cache.get(id);
        
        // If not in cache, create a partial emoji object
        if (!emoji) {
            const isAnimated = !!animated;
            const extension = isAnimated ? 'gif' : 'png';
            const emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${extension}?size=4096`;
            
            // Create a pseudo-emoji object for external emojis
            emoji = {
                id,
                name,
                animated: isAnimated,
                url: emojiUrl,
                identifier: `${isAnimated ? 'a:' : ''}${name}:${id}`,
                toString: () => `<${isAnimated ? 'a' : ''}:${name}:${id}>`,
                createdTimestamp: (BigInt(id) >> 22n) + 1420070400000n,
                external: true
            };
        }

        return sendEmojiInfo(interaction, emoji);
    }
};

async function sendEmojiInfo(interaction, emoji) {
    const isAnimated = emoji.animated;
    const extension = isAnimated ? 'gif' : 'png';
    
    const emojiUrl = emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=4096`;
    const createdTimestamp = emoji.createdTimestamp 
        ? Math.floor(Number(emoji.createdTimestamp) / 1000)
        : Math.floor((Number(BigInt(emoji.id) >> 22n) + 1420070400000) / 1000);

    const embed = new WardenEmbed()
        .setColor(colors.primary)
        .setAuthor({ 
            name: 'Emoji Information',
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTitle(`:${emoji.name}:`)
        .setThumbnail(emojiUrl)
        .addFields(
            {
                name: '📋 General',
                value: [
                    `${emojis.id} **ID:** \`${emoji.id}\``,
                    `📝 **Name:** \`${emoji.name}\``,
                    `🎞️ **Animated:** ${isAnimated ? emojis.success : emojis.error}`,
                    `📅 **Created:** <t:${createdTimestamp}:R>`
                ].join('\n'),
                inline: true
            }
        );

    // Add guild info if emoji is from a guild
    if (emoji.guild) {
        embed.addFields({
            name: '🏠 Server',
            value: [
                `**Name:** ${emoji.guild.name}`,
                `**ID:** \`${emoji.guild.id}\``
            ].join('\n'),
            inline: true
        });

        // Add usage info
        if (emoji.roles?.cache?.size > 0) {
            embed.addFields({
                name: '🔒 Restricted To',
                value: emoji.roles.cache.map(r => r.toString()).join(', '),
                inline: false
            });
        }
    } else if (emoji.external) {
        embed.addFields({
            name: '🌐 External Emoji',
            value: 'This emoji is from another server',
            inline: true
        });
    }

    // Add usage
    embed.addFields({
        name: '💬 Usage',
        value: `\`<${isAnimated ? 'a' : ''}:${emoji.name}:${emoji.id}>\``,
        inline: false
    });

    // Create download buttons
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(`Download ${extension.toUpperCase()}`)
            .setStyle(ButtonStyle.Link)
            .setURL(emojiUrl)
            .setEmoji('📥')
    );

    // Add PNG option for animated emojis
    if (isAnimated) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Download PNG (Still)')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://cdn.discordapp.com/emojis/${emoji.id}.png?size=4096`)
                .setEmoji('🖼️')
        );
    }

    embed.setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    }).setTimestamp();

    return interaction.reply({ embeds: [embed], components: [row] });
}
