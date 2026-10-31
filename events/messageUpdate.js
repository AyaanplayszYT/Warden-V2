const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');
const ignoreManager = require('../utils/ignoreManager');

let snipeCommand;
try {
    snipeCommand = require('../commands/utility/snipe');
} catch (e) {}

const IGNORED_BOT_IDS = new Set(['814100764787081217']);

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (oldMessage.partial || !oldMessage.guild || !oldMessage.author) return;
        if (oldMessage.content === newMessage.content) return;

        // Skip ignored channels or users immediately
        if (ignoreManager.isChannelIgnored(oldMessage.channel.id) || ignoreManager.isUserIgnored(oldMessage.author.id)) {
            return;
        }

        // Cache for /snipe
        if (snipeCommand && snipeCommand.addEditedMessage && !oldMessage.author.bot) {
            snipeCommand.addEditedMessage(oldMessage.channel.id, oldMessage, newMessage);
        }

        if (oldMessage.author.bot && IGNORED_BOT_IDS.has(oldMessage.author.id)) return;

        // Send to configured spam/edit log channel from memory cache
        const spamLogsChannelId = channelConfig.getSpamLog();
        if (spamLogsChannelId) {
            const spamChannel = oldMessage.guild.channels.cache.get(spamLogsChannelId);
            if (spamChannel) {
                const embed = UI.embed()
                    .color('warning')
                    .title('Message Edited')
                    .field('Author', `${oldMessage.author.tag} (\`${oldMessage.author.id}\`)`, true)
                    .field('Channel', `<#${oldMessage.channel.id}> (\`#${oldMessage.channel.name}\`)`, true)
                    .field('Jump to Message', `[Message Link](${newMessage.url})`, true)
                    .field('Original Content', oldMessage.content ? `\`\`\`\n${oldMessage.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false)
                    .field('Revised Content', newMessage.content ? `\`\`\`\n${newMessage.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false);

                await spamChannel.send({ embeds: [embed.build()] }).catch(() => {});
            }
        }
    },
};
