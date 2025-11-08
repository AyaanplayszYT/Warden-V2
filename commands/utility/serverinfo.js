const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'serverinfo',
        description: 'Displays information about the current server.',
        aliases: ['si', 'server'],
        cooldown: 10,
        options: [],
    },
    async execute(context, args) {
        const guild = context.guild;
        logger.info(`Serverinfo command used in ${guild.name}`);
        const infoEmbed = new EmbedBuilder()
            .setColor(colors.info || '#5865F2')
            .setTitle(`🏠 Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '📺 Channels', value: `${guild.channels.cache.size}`, inline: true }
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
