const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		logger.info(`Ready! Logged in as ${client.user.tag}`);
		logger.info(`Serving ${client.guilds.cache.size} server(s)`);
		logger.info(`Loaded ${client.commands.size} command(s)`);
		
		// Initialize reminders
		try {
			const remindCommand = require('../commands/utility/remind');
			if (remindCommand.initReminders) {
				remindCommand.initReminders(client);
			}
		} catch (error) {
			logger.warn('Could not initialize reminders:', error.message);
		}
		
		// Status messages to rotate
		const statuses = [
			{ name: '/help • Protecting your server', type: ActivityType.Watching },
			{ name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
			{ name: 'for rule breakers', type: ActivityType.Watching },
			{ name: '/ban /kick /mute', type: ActivityType.Listening },
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

		// Apply immediately and rotate every 30 seconds
		setPresence();
		setInterval(setPresence, 30000);
	},
};
