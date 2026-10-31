const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');
const logger = require('../utils/logger');

const dataPath = path.join(__dirname, '../data/colorRoles.json');
let cachedData = null;
let lastCheck = 0;

function getColorRolesData() {
    const now = Date.now();
    if (!cachedData || now - lastCheck > 60000) {
        lastCheck = now;
        try {
            if (fs.existsSync(dataPath)) {
                cachedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            }
        } catch (e) {
            cachedData = null;
        }
    }
    return cachedData;
}

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(reaction, user, client) {
        if (user.bot) return;

        const data = getColorRolesData();
        if (!data || !data.messageId || reaction.message.id !== data.messageId) {
            return;
        }

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();
        } catch (err) {
            logger.error('Failed to fetch partial reaction or message:', err);
            return;
        }

        const roleInfo = data.roles?.find(r => r.emoji && r.emoji === reaction.emoji.name);
        if (!roleInfo) return;

        const role = reaction.message.guild.roles.cache.find(r => r.name === roleInfo.name);
        if (!role) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Color role removal');
                logger.info(`Removed color role ${role.name} from ${user.tag}`);
            }
        } catch (err) {
            logger.error(`Failed to remove color role from ${user.tag}:`, err);
        }
    },
};
