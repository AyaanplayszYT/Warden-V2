const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Ready. Authenticated as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} server(s)`);
        logger.info(`Loaded ${client.commands.size} command(s) with Discord Components V2 Engine`);

        // Initialize reminders
        try {
            const remindCommand = require('../commands/utility/remind');
            if (remindCommand.initReminders) {
                remindCommand.initReminders(client);
            }
        } catch (error) {
            logger.warn('Could not initialize reminders:', error.message);
        }

        // Status messages to rotate (clean, emoji-free)
        const statuses = [
            { name: '/help | Discord Components V2', type: ActivityType.Watching },
            { name: `${client.guilds.cache.size} servers | Warden Guard`, type: ActivityType.Watching },
            { name: 'for rule violations', type: ActivityType.Watching },
            { name: '/ban /kick /mute /warnings', type: ActivityType.Listening },
        ];

        let statusIndex = 0;

        const setPresence = async () => {
            try {
                await client.user.setPresence({
                    status: 'online',
                    activities: [statuses[statusIndex]]
                });
                statusIndex = (statusIndex + 1) % statuses.length;
            } catch (err) {
                logger.error('Failed to set presence:', err);
            }
        };

        setPresence();
        setInterval(setPresence, 30000);
    },
};
