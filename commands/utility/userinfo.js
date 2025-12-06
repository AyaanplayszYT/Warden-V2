const { UserFlags, ActivityType } = require('discord.js');
const { WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

// Badge mapping
const BADGES = {
    [UserFlags.Staff]: '<:staff:1234567890> Discord Staff',
    [UserFlags.Partner]: '<:partner:1234567890> Discord Partner',
    [UserFlags.Hypesquad]: '<:hypesquad:1234567890> HypeSquad Events',
    [UserFlags.BugHunterLevel1]: '<:bughunter:1234567890> Bug Hunter',
    [UserFlags.BugHunterLevel2]: '<:bughunter2:1234567890> Bug Hunter (Gold)',
    [UserFlags.HypeSquadOnlineHouse1]: '🏠 Bravery',
    [UserFlags.HypeSquadOnlineHouse2]: '🏠 Brilliance',
    [UserFlags.HypeSquadOnlineHouse3]: '🏠 Balance',
    [UserFlags.PremiumEarlySupporter]: '👑 Early Supporter',
    [UserFlags.VerifiedDeveloper]: '🔧 Verified Bot Developer',
    [UserFlags.CertifiedModerator]: '🛡️ Certified Moderator',
    [UserFlags.ActiveDeveloper]: '👨‍💻 Active Developer',
};

module.exports = {
    data: {
        name: 'userinfo',
        description: 'Display detailed information about a user.',
        options: [
            {
                name: 'user',
                description: 'The user to get info about (defaults to yourself)',
                type: 6, // USER
                required: false,
            },
        ],
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Get user badges
        const flags = targetUser.flags?.toArray() || [];
        const badges = flags.map(flag => BADGES[UserFlags[flag]] || null).filter(Boolean);
        
        // Add Nitro badge if they have animated avatar or banner
        if (targetUser.avatar?.startsWith('a_') || targetUser.banner) {
            badges.push('💎 Nitro');
        }

        // Get presence/status
        const getStatusEmoji = (status) => {
            const statusMap = {
                online: emojis.online,
                idle: emojis.idle,
                dnd: emojis.dnd,
                offline: emojis.offline,
            };
            return statusMap[status] || emojis.offline;
        };

        const presence = member?.presence;
        const status = presence?.status || 'offline';
        const activities = presence?.activities || [];

        // Get key permissions for the user
        const keyPermissions = [
            'Administrator',
            'ManageGuild',
            'ManageChannels',
            'ManageRoles',
            'ManageMessages',
            'KickMembers',
            'BanMembers',
            'ModerateMembers',
        ];

        const userPermissions = member ? keyPermissions.filter(p => 
            member.permissions.has(p)
        ).map(p => `\`${p.replace(/([A-Z])/g, ' $1').trim()}\``) : [];

        // Get warnings count
        const warningCount = warningsDB.count(interaction.guild.id, targetUser.id);

        const embed = new WardenEmbed()
            .setType('primary')
            .setTitle(`${emojis.user} User Information`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addField(`${emojis.user} Username`, `${targetUser.tag}`, true)
            .addField(`${emojis.id} User ID`, `\`${targetUser.id}\``, true)
            .addField(`${getStatusEmoji(status)} Status`, status.charAt(0).toUpperCase() + status.slice(1), true)
            .addField(`${emojis.calendar} Account Created`, `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, true)
            .build();

        // Member-specific info
        if (member) {
            embed.addFields(
                { name: `${emojis.calendar} Joined Server`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: `${emojis.role} Highest Role`, value: member.roles.highest.toString(), inline: true }
            );

            // Roles (limited to avoid overflow)
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r.toString())
                .slice(0, 10);

            if (roles.length > 0) {
                const roleText = roles.join(', ') + (member.roles.cache.size > 11 ? ` +${member.roles.cache.size - 11} more` : '');
                embed.addFields({ name: `${emojis.role} Roles (${member.roles.cache.size - 1})`, value: roleText, inline: false });
            }

            // Key permissions
            if (userPermissions.length > 0) {
                embed.addFields({ name: `${emojis.moderator} Key Permissions`, value: userPermissions.join(', '), inline: false });
            }

            // Nickname
            if (member.nickname) {
                embed.addFields({ name: '📝 Nickname', value: member.nickname, inline: true });
            }

            // Boost status
            if (member.premiumSince) {
                embed.addFields({ 
                    name: `${emojis.boost} Boosting Since`, 
                    value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, 
                    inline: true 
                });
            }
        }

        // Badges
        if (badges.length > 0) {
            embed.addFields({ name: '🏅 Badges', value: badges.join('\n'), inline: false });
        }

        // Activities/Status
        if (activities.length > 0) {
            const activityTypes = {
                [ActivityType.Playing]: 'Playing',
                [ActivityType.Streaming]: 'Streaming',
                [ActivityType.Listening]: 'Listening to',
                [ActivityType.Watching]: 'Watching',
                [ActivityType.Custom]: '',
                [ActivityType.Competing]: 'Competing in',
            };

            const activityText = activities.slice(0, 3).map(a => {
                const prefix = activityTypes[a.type] || '';
                if (a.type === ActivityType.Custom) {
                    return `${a.emoji ? a.emoji.toString() + ' ' : ''}${a.state || ''}`;
                }
                return `${prefix} **${a.name}**${a.details ? ` - ${a.details}` : ''}`;
            }).filter(Boolean).join('\n');

            if (activityText) {
                embed.addFields({ name: '🎮 Activity', value: activityText, inline: false });
            }
        }

        // Warning count (for moderators)
        if (interaction.member.permissions.has('ModerateMembers') && warningCount > 0) {
            embed.addFields({ name: `${emojis.warning} Warnings`, value: `**${warningCount}** warning(s) on record`, inline: true });
        }

        // Bot badge
        if (targetUser.bot) {
            embed.addFields({ name: '🤖 Bot', value: 'This user is a bot', inline: true });
        }

        // Set user banner as image if available
        const userWithBanner = await targetUser.fetch().catch(() => null);
        if (userWithBanner?.bannerURL()) {
            embed.setImage(userWithBanner.bannerURL({ size: 512 }));
        }

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Userinfo command used by ${interaction.user.tag} for ${targetUser.tag}`);
    },
};
