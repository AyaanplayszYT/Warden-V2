const { Events } = require('discord.js');
const logger = require('../utils/logger');
const modLogs = require('../utils/modLogs');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');
const ignoreManager = require('../utils/ignoreManager');

let snipeCommand;
try {
    snipeCommand = require('../commands/utility/snipe');
} catch (e) {}

const IGNORED_BOT_IDS = new Set(['814100764787081217']);

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (message.partial || !message.guild || !message.author) return;

        // Skip ignored channels (or categories) or users immediately
        if (ignoreManager.isChannelIgnored(message.channel || message.channelId) || ignoreManager.isUserIgnored(message.author.id)) {
            return;
        }

        // Cache for /snipe
        if (snipeCommand && snipeCommand.addDeletedMessage && !message.author.bot) {
            snipeCommand.addDeletedMessage(message.channel.id, message);
        }

        if (message.author.bot && IGNORED_BOT_IDS.has(message.author.id)) return;

        const logEntry = {
            type: 'delete',
            user: message.author.tag,
            userId: message.author.id,
            content: message.content,
            channel: message.channel.name,
            time: new Date().toISOString(),
        };
        modLogs.add(logEntry);

        // Send to configured spam/delete log channel from memory cache
        const spamLogsChannelId = channelConfig.getSpamLog();
        if (spamLogsChannelId) {
            const spamChannel = message.guild.channels.cache.get(spamLogsChannelId);
            if (spamChannel) {
                const embed = UI.embed()
                    .color('error')
                    .title('Message Deleted')
                    .field('Author', `${message.author.tag} (\`${message.author.id}\`)`, true)
                    .field('Channel', `<#${message.channel.id}> (\`#${message.channel.name}\`)`, true)
                    .field('Content', message.content ? `\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false);

                if (message.attachments && message.attachments.size > 0) {
                    const atts = Array.from(message.attachments.values()).map((a, i) => `[File ${i + 1}: ${a.name}](${a.url})`).join('\n');
                    embed.field('Attachments', atts, false);
                }

                await spamChannel.send({ embeds: [embed.build()] }).catch(() => {});
            }
        }
    },
};
