const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        const modLogChannelId = channelConfig.getModLog();
        const guild = newChannel.guild || (newChannel.parent && newChannel.parent.guild);

        if (modLogChannelId && guild) {
            const modLogChannel = guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                const embed = UI.embed()
                    .color('warning')
                    .title('Channel Updated')
                    .field('Channel Identifier', `\`${newChannel.id}\``, true)
                    .field('Name (Before)', `#${oldChannel.name}`, true)
                    .field('Name (After)', `#${newChannel.name}`, true);

                await modLogChannel.send({ embeds: [embed.build()] }).catch(() => {});
            }
        }
    },
};
