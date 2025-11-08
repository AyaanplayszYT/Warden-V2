const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ChannelDelete,
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
                .setColor('#FF0000')
                .setTitle('Channel Deleted')
                .addFields(
                    { name: 'Name', value: typeof channel.name === 'string' ? channel.name : 'Unknown', inline: true },
                    { name: 'Type', value: typeof channel.type === 'string' ? channel.type : String(channel.type ?? 'Unknown'), inline: true },
                    { name: 'ID', value: typeof channel.id === 'string' ? channel.id : 'Unknown', inline: true }
                )
                .setTimestamp();
            if (modLogChannel) {
                modLogChannel.send({ embeds: [embed] });
            } else {
                logger.warn('Mod log channel not found for channel delete event.');
            }
        }
        logger.info(`Channel deleted: ${channel.name} (${channel.id})`);
    },
};
