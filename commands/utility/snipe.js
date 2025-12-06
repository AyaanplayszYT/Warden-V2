const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { WardenEmbed, EmbedTemplates, colors, emojis } = require('../../utils/embedBuilder');

// Store for deleted and edited messages
const snipeCache = new Map();
const editSnipeCache = new Map();

// Max messages to store per channel
const MAX_SNIPES = 10;

module.exports = {
    name: 'snipe',
    description: 'Retrieve recently deleted or edited messages',
    usage: 'snipe [number]',
    category: 'utility',
    snipeCache,
    editSnipeCache,
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Retrieve recently deleted or edited messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleted')
                .setDescription('Snipe a deleted message')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Which deleted message to show (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edited')
                .setDescription('Snipe an edited message')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Which edited message to show (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear snipe cache for this channel')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options?.getSubcommand() || 'deleted';
        const number = interaction.options?.getInteger('number') || 1;
        const channelId = interaction.channel.id;

        // Handle clear subcommand
        if (subcommand === 'clear') {
            snipeCache.delete(channelId);
            editSnipeCache.delete(channelId);
            
            return interaction.reply({
                embeds: [EmbedTemplates.success('Cache Cleared', 'Snipe cache cleared for this channel!')],
                ephemeral: true
            });
        }

        // Get appropriate cache
        const cache = subcommand === 'deleted' ? snipeCache : editSnipeCache;
        const channelSnipes = cache.get(channelId);

        if (!channelSnipes || channelSnipes.length === 0) {
            return interaction.reply({
                embeds: [EmbedTemplates.warning(
                    'No Messages',
                    `No ${subcommand} messages to snipe in this channel!\n\n*Messages are only cached while the bot is running.*`
                )],
                ephemeral: true
            });
        }

        const index = Math.min(number - 1, channelSnipes.length - 1);
        const snipe = channelSnipes[index];

        if (!snipe) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Not Found', `There is no ${subcommand} message #${number}.`)],
                ephemeral: true
            });
        }

        const embed = new WardenEmbed()
            .setColor(subcommand === 'deleted' ? colors.error : colors.warning)
            .setAuthor({ 
                name: snipe.author.tag,
                iconURL: snipe.author.displayAvatarURL({ dynamic: true })
            });

        if (subcommand === 'deleted') {
            embed.setTitle(`${emojis.delete || '🗑️'} Deleted Message`)
                .setDescription(snipe.content || '*No text content*');
        } else {
            embed.setTitle(`${emojis.edit || '✏️'} Edited Message`)
                .addFields(
                    {
                        name: '📝 Before',
                        value: snipe.oldContent?.substring(0, 1024) || '*No text content*',
                        inline: false
                    },
                    {
                        name: '📝 After',
                        value: snipe.newContent?.substring(0, 1024) || '*No text content*',
                        inline: false
                    }
                );
        }

        // Add attachments if any
        if (snipe.attachments?.length > 0) {
            embed.addFields({
                name: '📎 Attachments',
                value: snipe.attachments.map((a, i) => `[Attachment ${i + 1}](${a})`).join('\n'),
                inline: false
            });
            
            // Set first image as thumbnail if it's an image
            const firstImage = snipe.attachments.find(a => 
                a.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
            );
            if (firstImage) {
                embed.setImage(firstImage);
            }
        }

        // Add stickers if any
        if (snipe.stickers?.length > 0) {
            embed.addFields({
                name: '🏷️ Stickers',
                value: snipe.stickers.join(', '),
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Message ${index + 1}/${channelSnipes.length} • ${subcommand === 'deleted' ? 'Deleted' : 'Edited'} ${getTimeAgo(snipe.timestamp)}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        }).setTimestamp(snipe.timestamp);

        // Create navigation buttons if there are multiple snipes
        const components = [];
        if (channelSnipes.length > 1) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`snipe_prev_${subcommand}_${index}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
                    .setDisabled(index === 0),
                new ButtonBuilder()
                    .setCustomId(`snipe_next_${subcommand}_${index}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➡️')
                    .setDisabled(index === channelSnipes.length - 1),
                new ButtonBuilder()
                    .setCustomId('snipe_delete')
                    .setLabel('Dismiss')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );
            components.push(row);
        }

        const reply = await interaction.reply({ 
            embeds: [embed], 
            components,
            fetchReply: true 
        });

        // Handle button interactions
        if (channelSnipes.length > 1) {
            const collector = reply.createMessageComponentCollector({ 
                time: 120000 
            });

            let currentIndex = index;

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: 'Only the command user can navigate.', 
                        ephemeral: true 
                    });
                }

                if (i.customId === 'snipe_delete') {
                    await reply.delete().catch(() => {});
                    collector.stop();
                    return;
                }

                if (i.customId.startsWith('snipe_prev')) {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else if (i.customId.startsWith('snipe_next')) {
                    currentIndex = Math.min(channelSnipes.length - 1, currentIndex + 1);
                }

                const newSnipe = channelSnipes[currentIndex];
                const newEmbed = new WardenEmbed()
                    .setColor(subcommand === 'deleted' ? colors.error : colors.warning)
                    .setAuthor({ 
                        name: newSnipe.author.tag,
                        iconURL: newSnipe.author.displayAvatarURL({ dynamic: true })
                    });

                if (subcommand === 'deleted') {
                    newEmbed.setTitle(`${emojis.delete || '🗑️'} Deleted Message`)
                        .setDescription(newSnipe.content || '*No text content*');
                } else {
                    newEmbed.setTitle(`${emojis.edit || '✏️'} Edited Message`)
                        .addFields(
                            {
                                name: '📝 Before',
                                value: newSnipe.oldContent?.substring(0, 1024) || '*No text content*',
                                inline: false
                            },
                            {
                                name: '📝 After',
                                value: newSnipe.newContent?.substring(0, 1024) || '*No text content*',
                                inline: false
                            }
                        );
                }

                if (newSnipe.attachments?.length > 0) {
                    newEmbed.addFields({
                        name: '📎 Attachments',
                        value: newSnipe.attachments.map((a, idx) => `[Attachment ${idx + 1}](${a})`).join('\n'),
                        inline: false
                    });
                    
                    const firstImage = newSnipe.attachments.find(a => 
                        a.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
                    );
                    if (firstImage) {
                        newEmbed.setImage(firstImage);
                    }
                }

                newEmbed.setFooter({ 
                    text: `Message ${currentIndex + 1}/${channelSnipes.length} • ${subcommand === 'deleted' ? 'Deleted' : 'Edited'} ${getTimeAgo(newSnipe.timestamp)}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                }).setTimestamp(newSnipe.timestamp);

                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`snipe_prev_${subcommand}_${currentIndex}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                        .setDisabled(currentIndex === 0),
                    new ButtonBuilder()
                        .setCustomId(`snipe_next_${subcommand}_${currentIndex}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('➡️')
                        .setDisabled(currentIndex === channelSnipes.length - 1),
                    new ButtonBuilder()
                        .setCustomId('snipe_delete')
                        .setLabel('Dismiss')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await i.update({ embeds: [newEmbed], components: [newRow] });
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    try {
                        const disabledRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('snipe_prev_disabled')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⬅️')
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('snipe_next_disabled')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('➡️')
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('snipe_delete_disabled')
                                .setLabel('Expired')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        );
                        await reply.edit({ components: [disabledRow] });
                    } catch {}
                }
            });
        }
    },

    // Helper method to add deleted message to cache
    addDeletedMessage(channelId, message) {
        if (!snipeCache.has(channelId)) {
            snipeCache.set(channelId, []);
        }
        
        const snipes = snipeCache.get(channelId);
        snipes.unshift({
            content: message.content,
            author: {
                tag: message.author.tag,
                displayAvatarURL: (options) => message.author.displayAvatarURL(options)
            },
            attachments: message.attachments.map(a => a.url),
            stickers: message.stickers.map(s => s.name),
            timestamp: new Date()
        });

        // Keep only last MAX_SNIPES messages
        if (snipes.length > MAX_SNIPES) {
            snipes.pop();
        }
    },

    // Helper method to add edited message to cache
    addEditedMessage(channelId, oldMessage, newMessage) {
        if (!editSnipeCache.has(channelId)) {
            editSnipeCache.set(channelId, []);
        }
        
        const snipes = editSnipeCache.get(channelId);
        snipes.unshift({
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            author: {
                tag: oldMessage.author.tag,
                displayAvatarURL: (options) => oldMessage.author.displayAvatarURL(options)
            },
            attachments: newMessage.attachments.map(a => a.url),
            timestamp: new Date()
        });

        // Keep only last MAX_SNIPES messages
        if (snipes.length > MAX_SNIPES) {
            snipes.pop();
        }
    }
};

function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}
