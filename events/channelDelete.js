const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel, client) {
        let modLogChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            modLogChannelId = logChannels.modLog;
        } catch (e) {}

        const guild = channel.guild || (channel.parent && channel.parent.guild);
        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                const card = new V2Card()
                    .setAccent('error')
                    .setTitle('[AUDIT LOG] Channel Deleted')
                    .addField('Channel Name', `#${channel.name || 'Unknown'}`, true)
                    .addField('Channel Type', String(channel.type || 'Unknown'), true)
                    .addField('Identifier', `\`${channel.id || 'Unknown'}\``, true)
                    .setTimestamp(new Date());

                await card.send(modLogChannel);
            }
        }
        logger.info(`Channel deleted: #${channel.name || 'Unknown'} (${channel.id || 'Unknown'})`);
    },
};
