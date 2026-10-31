const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { V2Card } = require('../utils/v2Components');
const { welcomeChannelId } = require('../config/config.json');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        logger.info(`Member left: ${member.user.tag} (${member.id}) from ${member.guild.name}`);

        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                const card = new V2Card()
                    .setAccent('error')
                    .setTitle('[GATEWAY] Member Departure')
                    .setDescription(`**${member.user.tag}** has departed from **${member.guild.name}**.`)
                    .addField('Account Identifier', `${member.user.tag} (\`${member.id}\`)`, true)
                    .addField('Server Membership Count', `${member.guild.memberCount} remaining`, true)
                    .setFooter(`Guild Access • Total Members: ${member.guild.memberCount}`)
                    .setTimestamp(new Date());

                await card.send(channel);
            }
        }
    },
};
