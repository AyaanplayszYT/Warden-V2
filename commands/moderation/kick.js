const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'kick',
        description: 'Kicks a user from the server.',
        aliases: ['k'],
        cooldown: 5,
        userPermissions: [PermissionFlagsBits.KickMembers],
        botPermissions: [PermissionFlagsBits.KickMembers],
        options: [
            {
                name: 'user',
                description: 'The user to kick',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for kick',
                type: 3, // STRING
                required: false,
            },
        ],
    },

    async execute(context, args) {
        // 🔒 Permission check
        const memberExecutor = context.member || await context.guild.members.fetch(context.user.id);
        if (!memberExecutor.permissions.has(PermissionFlagsBits.KickMembers)) {
            return context.reply({
                content: '🚫 You don’t have permission to use this command. (Kick Members only)',
                ephemeral: true,
            });
        }

        let member, reason;

        if (context.isChatInputCommand) {
            member = await context.guild.members.fetch(context.options.getUser('user').id).catch(() => null);
            reason = context.options.getString('reason') || 'No reason provided.';
            logger.info(`Kick command used by ${context.user.tag} for ${member?.user?.tag}`);
        } else {
            member = context.mentions?.members?.first() || await context.guild.members.fetch(args[0]).catch(() => null);
            reason = args?.slice(1).join(' ') || 'No reason provided.';
            logger.info(`Kick command used by ${context.author.tag} for ${member?.user?.tag}`);
        }

        if (!member) {
            return context.reply({
                content: '❗ You need to mention a user or provide a valid user ID to kick.',
                ephemeral: true,
            });
        }

        if (member.id === (context.author?.id || context.user?.id)) {
            return context.reply({
                content: '⚠️ You cannot kick yourself.',
                ephemeral: true,
            });
        }

        if (!member.kickable) {
            return context.reply({
                content: '❌ I cannot kick this user. They might have a higher role than me.',
                ephemeral: true,
            });
        }

        if (context.member?.roles?.highest?.position <= member.roles.highest.position) {
            return context.reply({
                content: '🚫 You cannot kick a user with an equal or higher role than you.',
                ephemeral: true,
            });
        }

        try {
            await member.kick(`Kicked by ${(context.author?.tag || context.user?.tag)}. Reason: ${reason}`);

            const kickEmbed = new EmbedBuilder()
                .setColor(colors.error || '#ED4245')
                .setTitle('🚪 User Kicked')
                .addFields(
                    { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${context.user.tag}`, inline: true },
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
                if (modLogChannel) await modLogChannel.send({ embeds: [kickEmbed] });
            }

            // ✅ Reply in channel
            if (context.channel?.send) {
                await context.channel.send({ embeds: [kickEmbed] });
            } else if (context.isChatInputCommand) {
                await context.reply({ embeds: [kickEmbed] });
            }

        } catch (error) {
            logger.error(error);
            return context.reply({
                content: '❌ An error occurred while trying to kick this user.',
                ephemeral: true,
            });
        }
    },
};
