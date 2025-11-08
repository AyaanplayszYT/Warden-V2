const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        let modLogChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
            modLogChannelId = logChannels.modLog;
        } catch (e) {}
        let guild = newChannel.guild || (newChannel.parent && newChannel.parent.guild);
        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('Channel Updated')
                .addFields(
                    { name: 'Name Before', value: oldChannel.name, inline: true },
                    { name: 'Name After', value: newChannel.name, inline: true },
                    { name: 'ID', value: newChannel.id, inline: true }
                )
                .setTimestamp();
            if (modLogChannel) {
                modLogChannel.send({ embeds: [embed] });
            } else {
                logger.warn('Mod log channel not found for channel update event.');
            }
        }
        logger.info(`Channel updated: ${oldChannel.name} -> ${newChannel.name} (${newChannel.id})`);
    },
};
