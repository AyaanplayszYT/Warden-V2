const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info(`Ready! Logged in as ${client.user.tag}`);
		const setPresence = async () => {
			try {
				await client.user.setPresence({
					status: 'idle',
					activities: [{ name: 'be a good boy or else tung tung will come to ur door', type: ActivityType.Playing }]
				});
				logger.info('Presence set to idle with custom activity.');
			} catch (err) {
				logger.error('Failed to set presence:', err);
			}
		};

		// Apply immediately and re-apply periodically to handle hosting/platform quirks that reset presence
		setPresence();
		const interval = 1000 * 60 * 5; // every 5 minutes
		setInterval(setPresence, interval);
	},
};
