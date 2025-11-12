const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

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
        // 🔒 Moderator permission check
        const memberExecutor = context.member || await context.guild.members.fetch(context.user.id);
        if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return context.reply({
                content: '🚫 You don’t have permission to use this command. (Moderator-only)',
                ephemeral: true,
            });
        }

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
            return context.reply({
                content: '❗ You need to mention a user or provide a valid user ID.',
                ephemeral: true,
            });
        }

        if (!time) {
            return context.reply({
                content: '⏳ You need to specify a duration for the mute (e.g., 10m, 1h, 1d).',
                ephemeral: true,
            });
        }

        const duration = ms(time);
        if (isNaN(duration)) {
            return context.reply({
                content: '❌ Invalid time format. Use formats like `10m`, `1h`, `7d`.',
                ephemeral: true,
            });
        }

        if (duration > ms('28d')) {
            return context.reply({
                content: '⚠️ You cannot timeout a member for more than 28 days.',
                ephemeral: true,
            });
        }

        if (member.isCommunicationDisabled()) {
            return context.reply({
                content: '🔇 This user is already muted.',
                ephemeral: true,
            });
        }

        try {
            await member.timeout(duration, `Muted by ${(context.author?.tag || context.user?.tag)}. Reason: ${reason}`);

            const muteEmbed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🔇 User Muted')
                .addFields(
                    { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${context.user.tag}`, inline: true },
                    { name: '🕒 Duration', value: time, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'Powered by Warden' })
                .setTimestamp();

            // 🧾 Log to mod channel
            let modLogChannelId = '';
            try {
                const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
                modLogChannelId = logChannels.modLog;
            } catch (e) {}

            if (modLogChannelId) {
                const modLogChannel = context.guild.channels.cache.get(modLogChannelId);
                if (modLogChannel) await modLogChannel.send({ embeds: [muteEmbed] });
            }

            // ✅ Send in channel
            if (context.channel?.send) {
                await context.channel.send({ embeds: [muteEmbed] });
            } else if (context.isChatInputCommand) {
                await context.reply({ embeds: [muteEmbed] });
            }

        } catch (error) {
            logger.error(error);
            return context.reply({
                content: '❌ An error occurred while trying to mute this user.',
                ephemeral: true,
            });
        }
    },
};
