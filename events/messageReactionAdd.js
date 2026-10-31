const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user, client) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch (err) {
      logger.error('Failed to fetch partial reaction or message:', err);
      return;
    }

    const dataPath = path.join(__dirname, '../data/colorRoles.json');
    if (!fs.existsSync(dataPath)) return;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
      return;
    }

    if (
      !data.roles ||
      reaction.message.id !== data.messageId ||
      reaction.message.channel.id !== data.channelId ||
      reaction.message.guild.id !== data.guildId
    ) return;

    const roleInfo = data.roles.find(r => r.emoji && r.emoji === reaction.emoji.name);
    if (!roleInfo) return;

    const role = reaction.message.guild.roles.cache.find(r => r.name === roleInfo.name);
    if (!role) return;

    try {
      const member = await reaction.message.guild.members.fetch(user.id);
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, 'Color role selection');
        logger.info(`Assigned color role ${role.name} to ${user.tag}`);
      }
    } catch (err) {
      logger.error('Failed to assign color role via reaction:', err);
    }
  }
};
