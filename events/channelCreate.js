const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');
const ignoreManager = require('../utils/ignoreManager');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        // Skip ignored channels (or ignored categories)
        if (ignoreManager.isChannelIgnored(channel)) {
            return;
        }

        const modLogChannelId = channelConfig.getModLog();
        const guild = channel.guild || (channel.parent && channel.parent.guild);

        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                const embed = UI.embed()
                    .color('success')
                    .title('Channel Created')
                    .field('Channel Name', `#${channel.name}`, true)
                    .field('Channel Type', String(channel.type), true)
                    .field('Identifier', `\`${channel.id}\``, true);

                await modLogChannel.send({ embeds: [embed.build()] }).catch(() => {});
            }
        }
    },
};
