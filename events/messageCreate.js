const { Events, Collection, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { prefix, ownerId } = require('../config/config.json');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Prevent non-mods from pinging @everyone or @here
        if ((message.mentions.everyone || message.content.includes('@everyone') || message.content.includes('@here')) && !message.author.bot) {
            const member = message.member;
            const isAdmin = member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages));
            const isOwner = message.author.id === ownerId;

            if (!isAdmin && !isOwner) {
                await message.delete().catch(() => {});

                // Mute the user for 10 minutes
                const muteDuration = 10 * 60 * 1000; // 10 minutes in ms
                try {
                    await member.timeout(muteDuration, 'Attempted to mention @everyone or @here');
                } catch (err) {
                    logger.error(`Failed to mute ${message.author.tag}:`, err);
                }

                // DM the user a warning
                try {
                    await message.author.send('You are not allowed to mention everyone or here in this server. You have been muted for 10 minutes.');
                } catch (e) {}

                // Log to modlogs channel
                try {
                    const modLogId = require('../data/logChannels.json').modLog;
                    const modLogChannel = message.guild.channels.cache.get(modLogId);
                    if (modLogChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setTitle('Unauthorized Mass Mention')
                            .setDescription(`${message.author} (${message.author.tag}, ID: ${message.author.id}) tried to mention everyone or here.`)
                            .addFields(
                                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Message Content', value: message.content.substring(0, 1024) },
                                { name: 'Action Taken', value: 'User has been muted for 10 minutes.' }
                            )
                            .setTimestamp();
                        await modLogChannel.send({ embeds: [embed] });
                    }
                } catch (e) {}

                // Send a public warning message
                return message.channel.send({
                    content: `${message.author}, you are not allowed to mention @ everyone or @ here! You have been **muted for 10 minutes**. Your actions have been logged.`,
                    allowedMentions: { users: [message.author.id] }
                });
            }
        }

        // Respond to bot mention with a fun message
        if (message.mentions.has(client.user) && !message.author.bot) {
            logger.info('Bot was mentioned, sending dare message.');
            return message.reply('https://tenor.com/view/zakir-naik-muslim-candles-fierce-point-gif-17453203');
        }

        // Command handling
        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

        if (!command) return;

        // Cooldowns
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.data.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        // Execute command
        try {
            await command.execute(message, args);
        } catch (error) {
            logger.error(`Error executing command ${command.data.name}:`, error);
            await message.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};
