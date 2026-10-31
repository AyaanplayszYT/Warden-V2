const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel, client) {
        const modLogChannelId = channelConfig.getModLog();
        const guild = channel.guild || (channel.parent && channel.parent.guild);

        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                const embed = UI.embed()
                    .color('error')
                    .title('Channel Deleted')
                    .field('Channel Name', `#${channel.name || 'Unknown'}`, true)
                    .field('Channel Type', String(channel.type || 'Unknown'), true)
                    .field('Identifier', `\`${channel.id || 'Unknown'}\``, true);

                await modLogChannel.send({ embeds: [embed.build()] }).catch(() => {});
            }
        }
    },
};
