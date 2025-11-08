const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const colors = require('../../config/colors.json');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'warn',
        description: 'Warns a user and logs the warning.',
        aliases: ['w'],
        cooldown: 5,
        userPermissions: [PermissionFlagsBits.ModerateMembers],
        botPermissions: [],
        options: [
            {
                name: 'user',
                description: 'The user to warn',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for warning',
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
        } else {
            member = context.mentions?.members?.first() || await context.guild.members.fetch(args[0]).catch(() => null);
            reason = args?.slice(1).join(' ') || 'No reason provided.';
        }
        if (!member) {
            if (context.reply) return context.reply('You need to mention a user or provide a user ID to warn.');
            if (context.isChatInputCommand) return context.reply({ content: 'You need to mention a user or provide a user ID to warn.', ephemeral: true });
            return;
        }
        const warnEmbed = new EmbedBuilder()
                .setColor(colors.warn || '#FFA500')
                .setTitle('⚠️ User Warned')
                .addFields(
                    { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${context.user.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'Powered by Warden' })
                .setTimestamp();
        // Send to mod log channel
        let modLogChannelId = '';
        try {
            const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
            modLogChannelId = logChannels.modLog;
        } catch (e) {}
        if (modLogChannelId && context.guild) {
            const modLogChannel = context.guild.channels.cache.get(modLogChannelId);
            if (modLogChannel) {
                await modLogChannel.send({ embeds: [warnEmbed] });
            }
        }
        // DM the warned user
        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning || '#FFA500')
                        .setTitle('You have been warned')
                        .addFields(
                            { name: 'Server', value: context.guild?.name || 'Unknown', inline: true },
                            { name: 'Moderator', value: `${context.author?.tag || context.user?.tag}`, inline: true },
                            { name: 'Reason', value: reason }
                        )
                        .setTimestamp()
                ]
            });
        } catch (e) {
            logger.warn(`Could not DM ${member.user.tag} (${member.id}) about their warning.`);
        }
        // Also reply in context
        if (context.channel?.send) {
            await context.channel.send({ embeds: [warnEmbed] });
        } else if (context.isChatInputCommand) {
            await context.reply({ embeds: [warnEmbed] });
        }
        logger.info(`Warned ${member.user.tag} (${member.id}) for: ${reason}`);
    },
};
