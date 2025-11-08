const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');
module.exports = {
    data: {
        name: 'ping',
        description: 'Checks the bot\'s latency.',
        aliases: ['latency'],
        cooldown: 5,
        options: [],
    },
    async execute(context, args) {
        if (context.isChatInputCommand) {
            const apiLatency = Math.round(context.client.ws.ping);
            logger.info(`Ping command used by ${context.user.tag}`);
                const embed = new EmbedBuilder()
                    .setColor(colors.info || '#5865F2')
                    .setTitle('🏓 Pong!')
                    .setDescription(`Latency: **${apiLatency}ms**`)
                    .setFooter({ text: 'Powered by Warden' })
                    .setTimestamp();
                await context.reply({ embeds: [embed] });
        } else {
            const sent = await context.reply('Pinging...');
            const latency = sent.createdTimestamp - context.createdTimestamp;
            const apiLatency = Math.round(context.client.ws.ping);
            logger.info(`Ping command used by ${context.author.tag}`);
            sent.edit(`Pong! Latency is ${latency}ms. API Latency is ${apiLatency}ms.`);
        }
    },
};
