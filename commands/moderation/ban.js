const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'ban',
        description: 'Bans a user from the server.',
        aliases: ['b'],
        cooldown: 5,
        userPermissions: [PermissionFlagsBits.BanMembers],
        botPermissions: [PermissionFlagsBits.BanMembers],
        options: [
            {
                name: 'user',
                description: 'The user to ban',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for ban',
                type: 3, // STRING
                required: false,
            },
        ],
    },

    async execute(context, args) {
        // 🔒 Moderator permission check
        const memberExecutor = context.member || await context.guild.members.fetch(context.user.id);
        if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
            return context.reply({
                content: '🚫 You don’t have permission to use this command. (Ban Members only)',
                ephemeral: true,
            });
        }

        let member, reason;
        if (context.isChatInputCommand) {
            member = await context.guild.members.fetch(context.options.getUser('user').id).catch(() => null);
            reason = context.options.getString('reason') || 'No reason provided.';
        } else {
            member = context.mentions?.members?.first() || await context.guild.members.fetch(args[0]).catch(() => null);
            reason = args?.slice(1).join(' ') || 'No reason provided.';
        }

        if (!member) {
            return context.reply({
                content: '❗ You need to mention a user or provide a valid user ID to ban.',
                ephemeral: true,
            });
        }

        if (member.id === (context.author?.id || context.user?.id)) {
            return context.reply({ content: '⚠️ You cannot ban yourself.', ephemeral: true });
        }

        if (member.id === context.client.user.id) {
            return context.reply({ content: '⚠️ You cannot ban me.', ephemeral: true });
        }

        if (!member.bannable) {
            return context.reply({ content: '❌ I cannot ban this user. They might have a higher role than me.', ephemeral: true });
        }

        if (context.member?.roles?.highest?.position <= member.roles.highest.position) {
            return context.reply({ content: '🚫 You cannot ban a user with an equal or higher role than you.', ephemeral: true });
        }

        try {
            await member.ban({ reason: `Banned by ${(context.author?.tag || context.user?.tag)}. Reason: ${reason}` });

            const banEmbed = new EmbedBuilder()
                .setColor(colors.error || '#ED4245')
                .setTitle('⛔ User Banned')
                .addFields(
                    { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${context.user.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'Powered by Warden' })
                .setTimestamp();

            // 🧾 Send to mod log channel
            let modLogChannelId = '';
            try {
                const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
                modLogChannelId = logChannels.modLog;
            } catch (e) {}

            if (modLogChannelId) {
                const modLogChannel = context.guild.channels.cache.get(modLogChannelId);
                if (modLogChannel) await modLogChannel.send({ embeds: [banEmbed] });
            }

            // ✅ Reply in channel
            if (context.channel?.send) {
                await context.channel.send({ embeds: [banEmbed] });
            } else if (context.isChatInputCommand) {
                await context.reply({ embeds: [banEmbed] });
            }

        } catch (error) {
            console.error(error);
            return context.reply({
                content: '❌ An error occurred while trying to ban this user.',
                ephemeral: true,
            });
        }
    },
};
