const { Events, Collection, PermissionFlagsBits } = require('discord.js');
const { prefix, ownerId } = require('../config/config.json');
const { V2Card } = require('../utils/v2Components');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

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
                    const noticeCard = new V2Card()
                        .setAccent('error')
                        .setTitle('[SECURITY ENFORCEMENT] Mass Mention Violation')
                        .setDescription(`You attempted an unauthorized mass mention (\`@everyone\` or \`@here\`) in **${message.guild.name}**.\n\nA **10 minute timeout** has been automatically applied to your account.`);
                    await noticeCard.send(message.author);
                } catch (e) {}

                // Send audit card to mod log channel
                try {
                    const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/logChannels.json'), 'utf8'));
                    if (logChannels.modLog) {
                        const modLogChannel = message.guild.channels.cache.get(logChannels.modLog);
                        if (modLogChannel) {
                            const auditCard = new V2Card()
                                .setAccent('error')
                                .setTitle('[AUTO-MOD VIOLATION] Unauthorized Mass Mention')
                                .setDescription(`User ${message.author} (\`${message.author.tag}\`) attempted a restricted broadcast mention.`)
                                .addField('Target Channel', `<#${message.channel.id}>`, true)
                                .addField('Enforcement Action', '10 Minute Automatic Timeout', true)
                                .addField('Message Content', `\`${message.content.substring(0, 500)}\``, false)
                                .setTimestamp(new Date());

                            await auditCard.send(modLogChannel);
                        }
                    }
                } catch (e) {}

                // Public warning card in channel
                const publicCard = new V2Card()
                    .setAccent('error')
                    .setTitle('[AUTO-MOD] Unauthorized Broadcast Mention Intercepted')
                    .setDescription(`${message.author} was placed on a **10 minute timeout** for attempting an unauthorized broadcast mention. Incident logged.`)
                    .setFooter('Warden Automated Guard');

                return message.channel.send({
                    ...publicCard.toPayload(),
                    components: [publicCard.buildContainer()]
                });
            }
        }

        // Bot mention response
        if (message.mentions.has(client.user) && !message.author.bot) {
            const infoCard = new V2Card()
                .setAccent('primary')
                .setTitle('[SYSTEM INFORMATION] Warden Active')
                .setDescription(
                    `Warden is fully active and protecting **${message.guild.name}**.\n\n` +
                    `• Prefix Commands: \`${prefix}help\`\n` +
                    `• Modern Slash Commands: \`/help\`, \`/ban\`, \`/mute\`, \`/warnings\`\n` +
                    `• Discord Components V2 Engine: Active`
                )
                .setFooter('Warden Security Engine');

            return message.channel.send({
                ...infoCard.toPayload(),
                components: [infoCard.buildContainer()]
            });
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
