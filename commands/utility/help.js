const { EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');
const { prefix } = require('../../config/config.json');

module.exports = {
    data: {
        name: 'help',
        description: 'Shows all available commands and their usage.',
        aliases: ['commands'],
        cooldown: 5,
        options: [],
    },
    async execute(context, args) {
        // Group commands by category
        const commands = context.client.commands;
        const categories = {
            Moderation: [],
            Utility: [],
            Fun: []
        };
        commands.forEach(cmd => {
            if (cmd.data && typeof cmd.execute === 'function') {
                if (["ban","kick","mute","warn"].includes(cmd.data.name)) {
                    categories.Moderation.push(cmd);
                } else if (["ping","serverinfo","userinfo","help","modlogs","spamlogs","setmodlog","setspamlog","purge"].includes(cmd.data.name)) {
                    categories.Utility.push(cmd);
                } else if (["joke","avatar"].includes(cmd.data.name)) {
                    categories.Fun.push(cmd);
                }
            }
        });
        let helpText = '';
        Object.entries(categories).forEach(([cat, cmds]) => {
            if (cmds.length > 0) {
                helpText += `__**${cat} Commands**__\n`;
                cmds.forEach(cmd => {
                    helpText += `• **/${cmd.data.name}** - ${cmd.data.description}\n`;
                });
                helpText += '\n';
            }
        });
        if (!helpText) helpText = 'No commands available.';
        const helpEmbed = new EmbedBuilder()
                .setColor('#7F7FD5') // Gradient-like color
                .setTitle('📖 Warden Bot Commands')
                .setDescription('Welcome to **Warden**! Here are all the commands you can use:\n\n' + helpText.trim())
                .setThumbnail('https://cdn.discordapp.com/icons/1176892275536695296/warden.png')
                .setFooter({ text: 'Use /command or !command | Made By Mistiz911' })
                .setTimestamp();
        logger.info(`Help command used by ${(context.author?.tag || context.user?.tag)}`);
        if (context.channel?.send) {
            await context.channel.send({ embeds: [helpEmbed] });
        } else if (context.isChatInputCommand) {
            // For interactions, use followUp to send as a new message, not a reply
            if (context.followUp) {
                await context.followUp({ embeds: [helpEmbed] });
            } else {
                await context.reply({ embeds: [helpEmbed] });
            }
        }
    },
};
