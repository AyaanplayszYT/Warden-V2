const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        let modLogChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            modLogChannelId = logChannels.modLog;
        } catch (e) {}

        const guild = newChannel.guild || (newChannel.parent && newChannel.parent.guild);
        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                const card = new V2Card()
                    .setAccent('warning')
                    .setTitle('[AUDIT LOG] Channel Updated')
                    .addField('Channel Identifier', `\`${newChannel.id}\``, true)
                    .addField('Name (Before)', `#${oldChannel.name}`, true)
                    .addField('Name (After)', `#${newChannel.name}`, true)
                    .setTimestamp(new Date());

                await card.send(modLogChannel);
            }
        }
        logger.info(`Channel updated: #${oldChannel.name} -> #${newChannel.name} (${newChannel.id})`);
    },
};
