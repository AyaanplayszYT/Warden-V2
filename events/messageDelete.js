const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const modLogs = require('../utils/modLogs');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
    // Ignore logs for bots by user ID (cricket guru: 814100764787081217)
    const botIdsToIgnore = ['814100764787081217'];
    const authorIsIgnoredBot = message.author && message.author.bot && botIdsToIgnore.includes(message.author.id);
    if (!message.partial && message.guild && !authorIsIgnoredBot) {
            const logEntry = {
                type: 'delete',
                user: message.author ? message.author.tag : 'Unknown',
                userId: message.author ? message.author.id : 'Unknown',
                content: message.content,
                channel: message.channel.name,
                time: new Date().toISOString(),
            };
            modLogs.add(logEntry);
            logger.info(`Message deleted by ${logEntry.user} in #${logEntry.channel}: ${logEntry.content}`);
            // Send to spam logs channel from persistent file
            let spamLogsChannelId = '';
            try {
                const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
                spamLogsChannelId = logChannels.spamLog;
            } catch (e) {}
            if (spamLogsChannelId) {
                const spamChannel = message.guild.channels.cache.get(spamLogsChannelId);
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Message Deleted')
                    .addFields(
                        { name: 'User', value: `${logEntry.user} (${logEntry.userId})`, inline: true },
                        { name: 'Channel', value: `#${logEntry.channel}`, inline: true },
                        { name: 'Content', value: logEntry.content ? logEntry.content.substring(0, 1024) : 'None' }
                    )
                    .setTimestamp();
                // Add attachment info if present
                const allAttachments = [];
                const imageUrls = [];
                function isImage(att) {
                    if (att.contentType && att.contentType.startsWith('image/')) return true;
                    // fallback: check file extension
                    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.url);
                }
                if (message.attachments && message.attachments.size > 0) {
                    message.attachments.forEach(att => {
                        if (isImage(att)) {
                            imageUrls.push(att.url);
                        } else {
                            allAttachments.push(`[${att.name}](${att.url})`);
                        }
                    });
                }
                if (allAttachments.length > 0) {
                    embed.addFields({ name: 'Attachments', value: allAttachments.join('\n') });
                }
                if (imageUrls.length > 0) {
                    embed.setImage(imageUrls[0]);
                }
                if (spamChannel) {
                    spamChannel.send({ embeds: [embed] });
                }
            }
        }
    },
};
