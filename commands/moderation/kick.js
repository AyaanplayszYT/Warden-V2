const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');

const logger = require('../../utils/logger');
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
            if (context.reply) return context.reply('You need to mention a user or provide a user ID to kick.');
            if (context.isChatInputCommand) return context.reply({ content: 'You need to mention a user or provide a user ID to kick.', ephemeral: true });
            return;
        }
        if (member.id === (context.author?.id || context.user?.id)) {
            if (context.reply) return context.reply('You cannot kick yourself.');
            if (context.isChatInputCommand) return context.reply({ content: 'You cannot kick yourself.', ephemeral: true });
            return;
        }
        if (!member.kickable) {
            if (context.reply) return context.reply('I cannot kick this user. They might have a higher role than me.');
            if (context.isChatInputCommand) return context.reply({ content: 'I cannot kick this user. They might have a higher role than me.', ephemeral: true });
            return;
        }
        if (context.member?.roles?.highest?.position <= member.roles.highest.position) {
            if (context.reply) return context.reply('You cannot kick a user with an equal or higher role than you.');
            if (context.isChatInputCommand) return context.reply({ content: 'You cannot kick a user with an equal or higher role than you.', ephemeral: true });
            return;
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
                    await modLogChannel.send({ embeds: [kickEmbed] });
                }
            }
            // Also reply in context
            if (context.channel?.send) {
                await context.channel.send({ embeds: [kickEmbed] });
            } else if (context.isChatInputCommand) {
                await context.reply({ embeds: [kickEmbed] });
            }
        } catch (error) {
            logger.error(error);
            if (context.reply) return context.reply('An error occurred while trying to kick this user.');
            if (context.isChatInputCommand) return context.reply({ content: 'An error occurred while trying to kick this user.', ephemeral: true });
        }
    },
};
