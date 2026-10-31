const { UserFlags } = require('discord.js');
const { V2Card } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

const BADGES = {
    [UserFlags.Staff]: '[DISCORD STAFF]',
    [UserFlags.Partner]: '[DISCORD PARTNER]',
    [UserFlags.Hypesquad]: '[HYPESQUAD EVENTS]',
    [UserFlags.BugHunterLevel1]: '[BUG HUNTER TIER 1]',
    [UserFlags.BugHunterLevel2]: '[BUG HUNTER TIER 2]',
    [UserFlags.HypeSquadOnlineHouse1]: '[HYPESQUAD BRAVERY]',
    [UserFlags.HypeSquadOnlineHouse2]: '[HYPESQUAD BRILLIANCE]',
    [UserFlags.HypeSquadOnlineHouse3]: '[HYPESQUAD BALANCE]',
    [UserFlags.PremiumEarlySupporter]: '[EARLY SUPPORTER]',
    [UserFlags.VerifiedDeveloper]: '[VERIFIED DEVELOPER]',
    [UserFlags.CertifiedModerator]: '[CERTIFIED MODERATOR]',
    [UserFlags.ActiveDeveloper]: '[ACTIVE DEVELOPER]',
};

module.exports = {
    data: {
        name: 'userinfo',
        description: 'Inspect comprehensive profile, role hierarchy, and account metadata.',
        options: [
            {
                name: 'user',
                description: 'The user account to inspect (defaults to self)',
                type: 6, // USER
                required: false,
            },
        ],
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const flags = targetUser.flags?.toArray() || [];
        const badges = flags.map(flag => BADGES[UserFlags[flag]] || null).filter(Boolean);

        if (targetUser.avatar?.startsWith('a_') || targetUser.banner) {
            badges.push('[NITRO SUBSCRIBER]');
        }

        const presence = member?.presence;
        const statusMap = {
            online: 'ONLINE',
            idle: 'IDLE',
            dnd: 'DO NOT DISTURB',
            offline: 'OFFLINE',
        };
        const statusText = statusMap[presence?.status || 'offline'] || 'OFFLINE';

        // Key permissions
        const keyPermissions = [
            'Administrator',
            'ManageGuild',
            'ManageRoles',
            'ManageChannels',
            'KickMembers',
            'BanMembers',
            'ManageMessages',
            'MentionEveryone',
        ];

        let memberKeyPerms = [];
        if (member) {
            memberKeyPerms = keyPermissions.filter(perm => member.permissions.has(perm));
        }

        // Roles
        let rolesText = 'None';
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}>`);
            if (roles.length > 0) {
                rolesText = roles.length > 15 
                    ? `${roles.slice(0, 15).join(', ')} ... (+${roles.length - 15} more)`
                    : roles.join(', ');
            }
        }

        const userWarnings = warningsDB.get(interaction.guild.id, targetUser.id);
        const warningCount = userWarnings ? userWarnings.length : 0;

        const card = new V2Card()
            .setAccent(member?.displayHexColor !== '#000000' ? member?.displayHexColor : 'primary')
            .setTitle(`[USER INTELLIGENCE] ${targetUser.tag}`, `Discord Identifier: \`${targetUser.id}\``)
            .addField('Account Type', targetUser.bot ? 'Automated Application (Bot)' : 'Standard User Account', true)
            .addField('Network Status', `[${statusText}]`, true)
            .addField('Warning History', `**${warningCount}** recorded incident(s)`, true)
            .addField('Account Created', `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, true);

        if (member && member.joinedTimestamp) {
            card.addField('Guild Joined', `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, true);
        }

        if (badges.length > 0) {
            card.addField('Badges & Recognitions', badges.join('  '), false);
        }

        if (member) {
            card.addField(`Assigned Roles (${member.roles.cache.size - 1})`, rolesText, false);
            if (memberKeyPerms.length > 0) {
                card.addField('Administrative & Elevated Permissions', memberKeyPerms.map(p => `\`${p}\``).join(', '), false);
            }
        }

        card.setFooter(`Requested by ${interaction.user.tag}`);
        await card.editReply(interaction);

        logger.info(`Userinfo accessed for ${targetUser.tag} by ${interaction.user.tag}`);
    },
};
