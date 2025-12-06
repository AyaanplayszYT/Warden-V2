    const { Events, EmbedBuilder } = require('discord.js');
    const logger = require('../utils/logger');
    const fs = require('fs');
    const path = require('path');

    // Import snipe cache from snipe command
    let snipeCommand;
    try {
        snipeCommand = require('../commands/utility/snipe');
    } catch (e) {
        // Snipe command not available
    }

    module.exports = {
        name: Events.MessageUpdate,
        async execute(oldMessage, newMessage, client) {
            // Skip partial messages or non-guild messages
            if (oldMessage.partial || !oldMessage.guild || !oldMessage.author) return;
            
            // Skip if content didn't change
            if (oldMessage.content === newMessage.content) return;
            
            // Add to snipe cache
            if (snipeCommand && snipeCommand.addEditedMessage && !oldMessage.author.bot) {
                snipeCommand.addEditedMessage(oldMessage.channel.id, oldMessage, newMessage);
            }
            
            // Ignore logs for bots by user ID
            const botIdsToIgnore = ['814100764787081217'];
            const authorIsIgnoredBot = oldMessage.author.bot && botIdsToIgnore.includes(oldMessage.author.id);
            
            if (!authorIsIgnoredBot) {
                let spamLogsChannelId = '';
                try {
                    const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
                    spamLogsChannelId = logChannels.spamLog;
                } catch (e) {}
                if (spamLogsChannelId) {
                    const spamChannel = oldMessage.guild.channels.cache.get(spamLogsChannelId);
                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('Message Edited')
                        .addFields(
                            { name: 'User', value: `${oldMessage.author?.tag || 'Unknown'} (${oldMessage.author?.id || 'Unknown'})`, inline: true },
                            { name: 'Channel', value: `#${oldMessage.channel.name}`, inline: true },
                            { name: 'Before', value: oldMessage.content ? oldMessage.content.substring(0, 1024) : 'None' },
                            { name: 'After', value: newMessage.content ? newMessage.content.substring(0, 1024) : 'None' }
                        )
                        .setTimestamp();
                    // Add attachment info if present (old or new)
                    const allAttachments = [];
                    const imageUrls = [];
                    // Collect all image and non-image attachments from old and new messages
                    function isImage(att) {
                        if (att.contentType && att.contentType.startsWith('image/')) return true;
                        // fallback: check file extension
                        return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.url);
                    }
                    function collectAttachments(attachments) {
                        attachments.forEach(att => {
                            if (isImage(att)) {
                                imageUrls.push(att.url);
                            } else {
                                allAttachments.push(`[${att.name}](${att.url})`);
                            }
                        });
                    }
                    if (oldMessage.attachments && oldMessage.attachments.size > 0) {
                        collectAttachments(oldMessage.attachments);
                    }
                    if (newMessage.attachments && newMessage.attachments.size > 0) {
                        collectAttachments(newMessage.attachments);
                    }
                    if (allAttachments.length > 0) {
                        embed.addFields({ name: 'Attachments', value: allAttachments.join('\n') });
                    }
                    if (imageUrls.length > 0) {
                        // Only show the first image as embed (Discord only supports one per embed)
                        embed.setImage(imageUrls[0]);
                    }
                    if (spamChannel) {
                        spamChannel.send({ embeds: [embed] });
                    }
                }
                logger.info(`Message edited by ${oldMessage.author?.tag || 'Unknown'} in #${oldMessage.channel.name}: ${oldMessage.content} -> ${newMessage.content}`);
            }
        },
    };