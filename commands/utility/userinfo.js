const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'userinfo',
        description: 'Displays information about a user.',
        aliases: ['ui', 'whois'],
        cooldown: 5,
        options: [
            {
                name: 'user',
                description: 'The user to get info about',
                type: 6, // USER
                required: false,
            },
        ],
    },
    async execute(context, args) {
        let member;
        if (context.isChatInputCommand) {
            const user = context.options.getUser('user') || context.user;
            member = await context.guild.members.fetch(user.id);
            logger.info(`Userinfo command used by ${context.user.tag} for ${user.tag}`);
        } else {
            member = context.mentions?.members?.first() || await context.guild.members.fetch(context.author.id);
            logger.info(`Userinfo command used by ${context.author.tag}`);
        }
        const infoEmbed = new EmbedBuilder()
                .setColor(colors.info || '#5865F2')
                .setTitle(`👤 User Info: ${member.user.tag}`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '🆔 ID', value: member.id, inline: true },
                    { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                    { name: '⏰ Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '🎭 Roles', value: member.roles.cache.map(r => r.name).join(', ') || 'None', inline: false }
                )
                .setFooter({ text: 'Powered by Warden' })
                .setTimestamp();
        if (context.channel?.send) {
            await context.channel.send({ embeds: [infoEmbed] });
        } else if (context.isChatInputCommand) {
            await context.reply({ embeds: [infoEmbed] });
        }
    },
};
