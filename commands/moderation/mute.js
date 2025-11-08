const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const colors = require('../../config/colors.json');

const logger = require('../../utils/logger');
module.exports = {
    data: {
        name: 'mute',
        description: 'Mutes (timeouts) a user for a specified duration.',
        aliases: ['timeout', 'silence'],
        cooldown: 5,
        userPermissions: [PermissionFlagsBits.ModerateMembers],
        botPermissions: [PermissionFlagsBits.ModerateMembers],
        options: [
            {
                name: 'user',
                description: 'The user to mute',
                type: 6, // USER
                required: true,
            },
            {
                name: 'duration',
                description: 'Mute duration (e.g., 10m, 1h, 1d)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for mute',
                type: 3, // STRING
                required: false,
            },
        ],
    },
    async execute(context, args) {
        let member, time, reason;
        if (context.isChatInputCommand) {
            member = await context.guild.members.fetch(context.options.getUser('user').id).catch(() => null);
            time = context.options.getString('duration');
            reason = context.options.getString('reason') || 'No reason provided.';
            logger.info(`Mute command used by ${context.user.tag} for ${member?.user?.tag}`);
        } else {
            member = context.mentions?.members?.first() || await context.guild.members.fetch(args[0]).catch(() => null);
            time = args[1];
            reason = args.slice(2).join(' ') || 'No reason provided.';
            logger.info(`Mute command used by ${context.author.tag} for ${member?.user?.tag}`);
        }
        if (!member) {
            if (context.reply) return context.reply('You need to mention a user to mute.');
            if (context.isChatInputCommand) return context.reply({ content: 'You need to mention a user to mute.', ephemeral: true });
            return;
        }
        if (!time) {
            if (context.reply) return context.reply('You need to specify a duration for the mute (e.g., 10m, 1h, 1d).');
            if (context.isChatInputCommand) return context.reply({ content: 'You need to specify a duration for the mute (e.g., 10m, 1h, 1d).', ephemeral: true });
            return;
        }
        const duration = ms(time);
        if (isNaN(duration)) {
            if (context.reply) return context.reply('Invalid time format. Use formats like `10m`, `1h`, `7d`.');
            if (context.isChatInputCommand) return context.reply({ content: 'Invalid time format. Use formats like `10m`, `1h`, `7d`.', ephemeral: true });
            return;
        }
        if (duration > ms('28d')) {
            if (context.reply) return context.reply('You cannot timeout a member for more than 28 days.');
            if (context.isChatInputCommand) return context.reply({ content: 'You cannot timeout a member for more than 28 days.', ephemeral: true });
            return;
        }
        if (member.isCommunicationDisabled()) {
            if (context.reply) return context.reply('This user is already muted.');
            if (context.isChatInputCommand) return context.reply({ content: 'This user is already muted.', ephemeral: true });
            return;
        }
        try {
            await member.timeout(duration, `Muted by ${(context.author?.tag || context.user?.tag)}. Reason: ${reason}`);
                const muteEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('🔇 User Muted')
                    .addFields(
                        { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                        { name: '🛡️ Moderator', value: `${context.user.tag}`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false }
                    )
                    .setFooter({ text: 'Powered by Warden' })
                    .setTimestamp();
            // Send to mod log channel
            const fs = require('fs');
            const path = require('path');
            let modLogChannelId = '';
            try {
                const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
                modLogChannelId = logChannels.modLog;
            } catch (e) {}
            if (modLogChannelId) {
                const modLogChannel = context.guild.channels.cache.get(modLogChannelId);
                if (modLogChannel) {
                    await modLogChannel.send({ embeds: [muteEmbed] });
                }
            }
            // Also reply in context
            if (context.channel?.send) {
                await context.channel.send({ embeds: [muteEmbed] });
            } else if (context.isChatInputCommand) {
                await context.reply({ embeds: [muteEmbed] });
            }
        } catch (error) {
            logger.error(error);
            if (context.reply) return context.reply('An error occurred while trying to mute this user.');
            if (context.isChatInputCommand) return context.reply({ content: 'An error occurred while trying to mute this user.', ephemeral: true });
        }
    },
};
