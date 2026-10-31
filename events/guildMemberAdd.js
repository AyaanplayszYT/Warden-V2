const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');
const { welcomeChannelId, autoRoleId } = require('../config/config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        logger.info(`Member joined: ${member.user.tag} (${member.id}) in ${member.guild.name}`);

        // Auto-role assignment
        if (autoRoleId) {
            member.roles.add(autoRoleId).then(() => {
                logger.info(`Auto-role assigned to ${member.user.tag}`);
            }).catch(err => {
                logger.error(`Failed to assign auto-role to ${member.user.tag}:`, err);
            });
        }

        // Welcome message with Discord Components V2
        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                const card = new V2Card()
                    .setAccent('success')
                    .setTitle('[GATEWAY] New Member Joined', `Welcome to ${member.guild.name}`)
                    .setDescription(`Welcome to the server, <@${member.id}>! You are member **#${member.guild.memberCount}**.`)
                    .addField('Account Identifier', `${member.user.tag} (\`${member.id}\`)`, true)
                    .addField('Registration Date', `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, true)
                    .setFooter(`Guild Access • Total Members: ${member.guild.memberCount}`)
                    .setTimestamp(new Date());

                await card.send(channel);
            }
        }
    },
};
