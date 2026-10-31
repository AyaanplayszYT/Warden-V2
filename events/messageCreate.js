const { Events, Collection, PermissionFlagsBits } = require('discord.js');
const { prefix, ownerId } = require('../config/config.json');
const { UI } = require('../utils/embedBuilder');
const channelConfig = require('../utils/channelConfig');
const stickerManager = require('../utils/stickerManager');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const PING_GIF_URL = 'https://i.pinimg.com/736x/e2/12/4d/e2124de5134e59f5a863a7bb396dee78.jpg';

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        // Anti Mass Mention Protection
        if (message.mentions.everyone || message.content.includes('@everyone') || message.content.includes('@here')) {
            const member = message.member;
            const isAdmin = member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages));
            const isOwner = message.author.id === ownerId;

            if (!isAdmin && !isOwner) {
                await message.delete().catch(() => {});

                const muteDuration = 10 * 60 * 1000; // 10 minutes
                try {
                    await member.timeout(muteDuration, '[Auto-Mod] Unauthorized mass mention attempt');
                } catch (err) {
                    logger.error(`Failed to timeout mass-mention offender ${message.author.tag}:`, err);
                }

                // Deliver DM notification
                try {
                    const noticeCard = UI.embed()
                        .color('error')
                        .title('Mass Mention Violation')
                        .desc(`You attempted an unauthorized mass mention in **${message.guild.name}**.\n\nA 10 minute timeout has been automatically applied to your account.`);
                    await message.author.send({ embeds: [noticeCard.build()] });
                } catch (e) {}

                // Send audit card to mod log channel
                try {
                    const modLogChannelId = channelConfig.getModLog();
                    if (modLogChannelId) {
                        const modLogChannel = message.guild.channels.cache.get(modLogChannelId);
                        if (modLogChannel) {
                            const auditCard = UI.embed()
                                .color('error')
                                .title('Unauthorized Mass Mention')
                                .desc(`User ${message.author} (\`${message.author.tag}\`) attempted a restricted broadcast mention.`)
                                .field('Target Channel', `<#${message.channel.id}>`, true)
                                .field('Action', '10 Minute Timeout', true)
                                .field('Content', `\`${message.content.substring(0, 500)}\``, false);

                            await modLogChannel.send({ embeds: [auditCard.build()] }).catch(() => {});
                        }
                    }
                } catch (e) {}

                // Public warning card in channel
                const publicCard = UI.embed()
                    .color('error')
                    .title('Broadcast Mention Intercepted')
                    .desc(`${message.author} was placed on a 10 minute timeout for attempting an unauthorized broadcast mention.`)
                    .footer('Warden Guard');

                return message.channel.send({ embeds: [publicCard.build()] });
            }
        }

        // Bot mention response (Ping GIF)
        if (message.mentions.has(client.user) && !message.author.bot) {
            const isDirectMention = message.content.includes(`<@${client.user.id}>`) || 
                                    message.content.includes(`<@!${client.user.id}>`);

            if (isDirectMention || !message.reference) {
                return message.reply({ content: PING_GIF_URL });
            }
        }

        // Custom Sticker Chat Shortcut (:name: or ;name)
        const trimmed = message.content.trim();
        const isEmojiFormat = trimmed.startsWith(':') && trimmed.endsWith(':') && trimmed.length > 2;
        const isSemicolonFormat = trimmed.startsWith(';') && !trimmed.startsWith(';;') && trimmed.length > 1 && !trimmed.includes(' ');

        if (isEmojiFormat || isSemicolonFormat) {
            const sticker = stickerManager.get(trimmed);
            if (sticker) {
                try {
                    await message.reply({ files: [sticker.path] });
                } catch (err) {
                    logger.error(`Failed to reply with sticker ${sticker.id}:`, err);
                }
                return;
            }
        }

        // Prefix command handling
        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.data && cmd.data.aliases && cmd.data.aliases.includes(commandName));

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
                return message.reply(`Rate limited. Please wait \`${timeLeft.toFixed(1)}s\` before reusing \`${command.data.name}\`.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        try {
            await command.execute(message, args);
        } catch (error) {
            logger.error(`Error executing prefix command ${command.data.name}:`, error);
        }
    },
};
