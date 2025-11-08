const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        let modLogChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            modLogChannelId = logChannels.modLog;
        } catch (e) {}
        let guild = channel.guild || (channel.parent && channel.parent.guild);
        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Channel Created')
                .addFields(
                    { name: 'Name', value: channel.name, inline: true },
                    { name: 'Type', value: channel.type, inline: true },
                    { name: 'ID', value: channel.id, inline: true }
                )
                .setTimestamp();
            if (modLogChannel) {
                modLogChannel.send({ embeds: [embed] });
            } else {
                logger.warn('Mod log channel not found for channel create event.');
            }
        }
        logger.info(`Channel created: ${channel.name} (${channel.id})`);
    },
};
