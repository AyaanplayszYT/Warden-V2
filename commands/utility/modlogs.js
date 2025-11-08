const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const modLogs = require('../../utils/modLogs');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'modlogs',
        description: 'Shows recent moderation logs (bans, kicks, mutes, deletes).',
        aliases: [],
        cooldown: 10,
        options: [],
    },
    async execute(context, args) {
        const logs = modLogs.getAll().slice(0, 10);
        if (logs.length === 0) {
            if (context.channel?.send) return context.channel.send('No moderation logs yet.');
            if (context.isChatInputCommand) return context.reply({ content: 'No moderation logs yet.', ephemeral: true });
            return;
        }
        let desc = logs.map(log => `**${log.type.toUpperCase()}** | ${log.user} (${log.userId}) | #${log.channel} | ${log.content ? log.content.substring(0, 50) : ''} | ${log.time}`).join('\n');
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🛡️ Recent Moderation Logs')
            .setDescription('Here are the latest moderation actions:\n\n' + desc)
            .setFooter({ text: 'Powered by Warden | Made By Mistiz911' })
            .setTimestamp();
        logger.info(`Modlogs command used by ${(context.author?.tag || context.user?.tag)}`);
        if (context.channel?.send) {
            await context.channel.send({ embeds: [embed] });
        } else if (context.isChatInputCommand) {
            await context.reply({ embeds: [embed] });
        }
    },
};
