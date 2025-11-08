const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Define color roles and their emoji
const COLOR_ROLES = [
  { name: 'Red', color: '#FF0000', emoji: '🟥' },
  { name: 'Blue', color: '#3498DB', emoji: '🟦' },
  { name: 'Green', color: '#2ECC40', emoji: '🟩' },
  { name: 'Yellow', color: '#FFFF00', emoji: '🟨' },
  { name: 'Purple', color: '#9B59B6', emoji: '🟪' },
  { name: 'Orange', color: '#E67E22', emoji: '🟧' }
];

module.exports = {
  data: {
    name: 'setupcolors',
    description: 'Create color roles and post a reaction role message in a channel.',
    options: [
      {
        name: 'channel',
        description: 'The channel to post the color roles message in',
        type: 7, // CHANNEL type
        required: true
      }
    ],
    default_member_permissions: PermissionFlagsBits.Administrator,
  },
  async execute(context, args) {
    // Only allow admins
    if (!context.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
    }
    let interactionReply = null;
    if (context.isChatInputCommand && context.reply) {
      // Reply immediately to avoid interaction timeout
      interactionReply = await context.reply({ content: 'Setting up color roles, please wait...', ephemeral: true, fetchReply: true });
    }
    let channel = null;
    if (context.options?.getChannel) {
      channel = context.options.getChannel('channel');
    } else if (args && args[0]) {
      // Try to resolve from mention or ID
      channel = context.guild.channels.cache.get(args[0].id || args[0]);
    } else {
      channel = context.channel;
    }
    if (!channel || !channel.send) {
      if (interactionReply && context.editReply) {
        await context.editReply({ content: 'Invalid channel provided.' });
      } else {
        await context.reply({ content: 'Invalid channel provided.', ephemeral: true });
      }
      return;
    }
    // Check permissions
    const perms = channel.permissionsFor(context.guild.members.me);
    if (!perms.has('SendMessages') || !perms.has('AddReactions')) {
      if (interactionReply && context.editReply) {
        await context.editReply({ content: 'I need Send Messages and Add Reactions permissions in that channel.' });
      } else {
        await context.reply({ content: 'I need Send Messages and Add Reactions permissions in that channel.', ephemeral: true });
      }
      return;
    }
    // Create roles if they don't exist
    const guild = context.guild;
    let createdRoles = [];
    for (const roleData of COLOR_ROLES) {
      let role = guild.roles.cache.find(r => r.name === roleData.name);
      if (!role) {
        try {
          role = await guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            mentionable: true,
            reason: 'Color role setup by /setupcolors'
          });
          createdRoles.push(role);
        } catch (err) {
          if (interactionReply && context.editReply) {
            await context.editReply({ content: `Failed to create role ${roleData.name}: ${err.message}` });
          } else if (context.isChatInputCommand) {
            await context.reply({ content: `Failed to create role ${roleData.name}: ${err.message}`, ephemeral: true });
          } else {
            await context.channel.send(`Failed to create role ${roleData.name}: ${err.message}`);
          }
          return;
        }
      }
    }
    // Build embed
    const embed = new EmbedBuilder()
      .setTitle('Pick Your Color!')
      .setDescription(COLOR_ROLES.map(r => `${r.emoji} - ${r.name}`).join('\n'))
      .setColor('#7F7FD5')
      .setFooter({ text: 'React below to get your color role!' });
    // Send message
    let msg;
    try {
      msg = await channel.send({ embeds: [embed] });
    } catch (err) {
      if (interactionReply && context.editReply) {
        await context.editReply({ content: `Failed to send message in that channel: ${err.message}` });
      } else {
        await context.reply({ content: `Failed to send message in that channel: ${err.message}`, ephemeral: true });
      }
      return;
    }
    // Add reactions
    for (const roleData of COLOR_ROLES) {
      try {
        await msg.react(roleData.emoji);
      } catch (err) {
        // Ignore if emoji fails
      }
    }
    // Save message ID and mapping for reaction handler
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, '../../data/colorRoles.json');
    const saveData = {
      messageId: msg.id,
      channelId: channel.id,
      guildId: guild.id,
      roles: COLOR_ROLES.map(r => ({ name: r.name, emoji: r.emoji }))
    };
    fs.writeFileSync(dataPath, JSON.stringify(saveData, null, 2));
    // Confirm
    if (interactionReply && context.editReply) {
      await context.editReply({ content: 'Color roles and message set up!' });
    } else if (context.isChatInputCommand) {
      await context.reply({ content: 'Color roles and message set up!', ephemeral: true });
    } else {
      await context.channel.send('Color roles and message set up!');
    }
  }
};
