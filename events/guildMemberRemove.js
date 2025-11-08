const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { welcomeChannelId } = require('../config/config.json');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        logger.info(`Member left: ${member.user.tag} (${member.id}) in guild ${member.guild.name}`);
        // Leave message
        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                channel.send(`${member.user.tag} has left the server. Goodbye! 👋`);
            }
        }
    },
};
