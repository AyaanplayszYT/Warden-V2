const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { welcomeChannelId, autoRoleId } = require('../config/config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        logger.info(`New member joined: ${member.user.tag} (${member.id}) in guild ${member.guild.name}`);
        // Auto-role assignment
        if (autoRoleId) {
            member.roles.add(autoRoleId).then(() => {
                logger.info(`Auto-role assigned to ${member.user.tag}`);
            }).catch(err => {
                logger.error(`Failed to assign auto-role to ${member.user.tag}:`, err);
            });
        }
        // Welcome message
        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                channel.send(`Welcome to the server, <@${member.id}>! 🎉`);
            }
        }
    },
};
