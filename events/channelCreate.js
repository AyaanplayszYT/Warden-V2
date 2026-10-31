const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');

module.exports = {
    name: Events.ChannelCreate,
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
                    .setAccent('success')
                    .setTitle('[AUDIT LOG] Channel Created')
                    .addField('Channel Name', `#${channel.name}`, true)
                    .addField('Channel Type', String(channel.type), true)
                    .addField('Identifier', `\`${channel.id}\``, true)
                    .setTimestamp(new Date());

                await card.send(modLogChannel);
            }
        }
        logger.info(`Channel created: #${channel.name} (${channel.id})`);
    },
};
