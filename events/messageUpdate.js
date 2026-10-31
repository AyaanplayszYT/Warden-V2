const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');
const fs = require('fs');
const path = require('path');

let snipeCommand;
try {
    snipeCommand = require('../commands/utility/snipe');
} catch (e) {}

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (oldMessage.partial || !oldMessage.guild || !oldMessage.author) return;
        if (oldMessage.content === newMessage.content) return;

        // Cache for /snipe
        if (snipeCommand && snipeCommand.addEditedMessage && !oldMessage.author.bot) {
            snipeCommand.addEditedMessage(oldMessage.channel.id, oldMessage, newMessage);
        }

        const botIdsToIgnore = ['814100764787081217'];
        if (oldMessage.author.bot && botIdsToIgnore.includes(oldMessage.author.id)) return;

        let spamLogsChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            spamLogsChannelId = logChannels.spamLog;
        } catch (e) {}

        if (spamLogsChannelId) {
            const spamChannel = oldMessage.guild.channels.cache.get(spamLogsChannelId);
            if (spamChannel) {
                const card = new V2Card()
                    .setAccent('warning')
                    .setTitle('[AUDIT LOG] Message Edited')
                    .addField('Author', `${oldMessage.author.tag} (\`${oldMessage.author.id}\`)`, true)
                    .addField('Channel', `<#${oldMessage.channel.id}> (\`#${oldMessage.channel.name}\`)`, true)
                    .addField('Jump to Message', `[Message Link](${newMessage.url})`, true)
                    .addField('Original Content', oldMessage.content ? `\`\`\`\n${oldMessage.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false)
                    .addField('Revised Content', newMessage.content ? `\`\`\`\n${newMessage.content.substring(0, 1000)}\n\`\`\`` : '*No text content*', false)
                    .setTimestamp(new Date());

                await card.send(spamChannel);
            }
        }
    },
};
