const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: {
    name: 'purge',
    description: 'Bulk delete a number of messages in this channel.',
    options: [
      {
        name: 'amount',
        description: 'Number of messages to delete (2-100)',
        type: 4, // INTEGER
        required: true
      }
    ],
    default_member_permissions: PermissionFlagsBits.ManageMessages,
  },
  async execute(context, args) {
    const amount = context.options?.getInteger?.('amount') || args[0];
    if (!amount || isNaN(amount) || amount < 2 || amount > 100) {
      // Use flags for ephemeral if interaction, else just send to channel
      if (context.reply && context.isChatInputCommand) {
        return context.reply({ content: 'Please provide a number between 2 and 100.', flags: 64 });
      } else {
        return context.channel.send('Please provide a number between 2 and 100.');
      }
    }
    if (!context.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      if (context.reply && context.isChatInputCommand) {
        return context.reply({ content: 'You need Manage Messages permission to use this command.', flags: 64 });
      } else {
        return context.channel.send('You need Manage Messages permission to use this command.');
      }
    }
    try {
      // Fetch messages before deleting for logging
      const fetched = await context.channel.messages.fetch({ limit: amount });
      const deleted = await context.channel.bulkDelete(amount, true);

      // Log deleted messages to data/purgeLogs.txt
      const logPath = path.join(__dirname, '../../data/purgeLogs.txt');
      let logText = `\n--- Purge by ${context.member.user?.tag || context.user?.tag || 'Unknown'} (${context.member.user?.id || context.user?.id || 'Unknown'}) in #${context.channel.name} (${context.channel.id}) at ${new Date().toISOString()} ---\n`;
      fetched.forEach(msg => {
        logText += `[${msg.createdAt.toISOString()}] ${msg.author?.tag || 'Unknown'} (${msg.author?.id || 'Unknown'}): ${msg.content || '[no text]'}\n`;
        if (msg.attachments && msg.attachments.size > 0) {
          msg.attachments.forEach(att => {
            logText += `  Attachment: ${att.url}\n`;
          });
        }
      });
      fs.appendFileSync(logPath, logText);

      // Send a summary embed to spam log channel
      let spamLogId;
      try {
        const logChannels = require('../../data/logChannels.json');
        spamLogId = logChannels.spamLog;
      } catch (e) {}
      if (spamLogId && context.guild && context.guild.channels) {
        const spamLogChannel = context.guild.channels.cache.get(spamLogId);
        if (spamLogChannel) {
          const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Messages Purged')
            .setDescription(`**${context.member.user?.tag || context.user?.tag || 'Unknown'}** purged **${deleted.size}** messages in <#${context.channel.id}>.`)
            .setTimestamp();
          spamLogChannel.send({ embeds: [embed] });
        }
      }

      await context.channel.send(`🧹 Deleted ${deleted.size} messages.`);
    } catch (err) {
      if (context.reply && context.isChatInputCommand) {
        await context.reply({ content: `Failed to delete messages: ${err.message}`, flags: 64 });
      } else {
        await context.channel.send(`Failed to delete messages: ${err.message}`);
      }
    }
  }
};
