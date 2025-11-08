const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const spamLogs = require('../../utils/spamLogs');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'spamlogs',
        description: 'Shows recent spam logs (detected spam, auto-mutes, etc).',
        aliases: [],
        cooldown: 10,
        options: [],
    },
    async execute(context, args) {
        const logs = spamLogs.getAll().slice(0, 10);
        if (logs.length === 0) {
            if (context.channel?.send) return context.channel.send('No spam logs yet.');
            if (context.isChatInputCommand) return context.reply({ content: 'No spam logs yet.', ephemeral: true });
            return;
        }
        let desc = logs.map(log => `**${log.type.toUpperCase()}** | ${log.user} (${log.userId}) | #${log.channel} | ${log.content ? log.content.substring(0, 50) : ''} | ${log.time}`).join('\n');
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🚨 Recent Spam Logs')
            .setDescription('Here are the latest spam detections and actions:\n\n' + desc)
            .setFooter({ text: 'Powered by Warden | Made By Mistiz911' })
            .setTimestamp();
        logger.info(`Spamlogs command used by ${(context.author?.tag || context.user?.tag)}`);
        if (context.channel?.send) {
            await context.channel.send({ embeds: [embed] });
        } else if (context.isChatInputCommand) {
            await context.reply({ embeds: [embed] });
        }
    },
};
