const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'setspamlog',
        description: 'Set this channel as the spam log channel.',
        aliases: [],
        cooldown: 30,
        options: [],
    },
    async execute(context, args) {
        const filePath = path.join(__dirname, '../../data/logChannels.json');
        let logChannels = {};
        try {
            logChannels = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            logChannels = { modLog: '', spamLog: '' };
        }
        const currentId = context.channel?.id || context.channelId;
        if (logChannels.spamLog === currentId) {
            logChannels.spamLog = '';
            fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));
            logger.info(`Spam log channel unset by ${(context.author?.tag || context.user?.tag)}`);
            if (context.channel?.send) {
                await context.channel.send('This channel is no longer the spam log channel.');
            } else if (context.isChatInputCommand) {
                await context.reply({ content: 'This channel is no longer the spam log channel.' });
            }
        } else {
            logChannels.spamLog = currentId;
            fs.writeFileSync(filePath, JSON.stringify(logChannels, null, 2));
            logger.info(`Spam log channel set to ${logChannels.spamLog} by ${(context.author?.tag || context.user?.tag)}`);
            if (context.channel?.send) {
                await context.channel.send('This channel is now set as the spam log channel.');
            } else if (context.isChatInputCommand) {
                await context.reply({ content: 'This channel is now set as the spam log channel.' });
            }
        }
    },
};
