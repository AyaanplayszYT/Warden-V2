const { Events } = require('discord.js');
const logger = require('../utils/logger');
const modLogs = require('../utils/modLogs');
const { V2Card } = require('../utils/v2Components');
const fs = require('fs');
const path = require('path');

let snipeCommand;
try {
    snipeCommand = require('../commands/utility/snipe');
} catch (e) {}

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (message.partial || !message.guild || !message.author) return;

        // Cache for /snipe
        if (snipeCommand && snipeCommand.addDeletedMessage && !message.author.bot) {
            snipeCommand.addDeletedMessage(message.channel.id, message);
        }

        const botIdsToIgnore = ['814100764787081217'];
        if (message.author.bot && botIdsToIgnore.includes(message.author.id)) return;

        const logEntry = {
            type: 'delete',
            user: message.author.tag,
            userId: message.author.id,
            content: message.content,
            channel: message.channel.name,
            time: new Date().toISOString(),
        };
        modLogs.add(logEntry);

        logger.info(`Message deleted by ${logEntry.user} in #${logEntry.channel}`);

        let spamLogsChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            spamLogsChannelId = logChannels.spamLog;
        } catch (e) {}

        if (spamLogsChannelId) {
            const spamChannel = message.guild.channels.cache.get(spamLogsChannelId);
            if (spamChannel) {
                const card = new V2Card()
                    .setAccent('error')
                    .setTitle('[AUDIT LOG] Message Deleted')
                    .addField('Author', `${message.author.tag} (\`${message.author.id}\`)`, true)
                    .addField('Channel', `<#${message.channel.id}> (\`#${message.channel.name}\`)`, true)
                    .addField('Content', message.content ? `\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false)
                    .setTimestamp(new Date());

                if (message.attachments && message.attachments.size > 0) {
                    const atts = Array.from(message.attachments.values()).map((a, i) => `[File ${i + 1}: ${a.name}](${a.url})`).join('\n');
                    card.addField('Attachments', atts, false);
                }

                await card.send(spamChannel);
            }
        }
    },
};
