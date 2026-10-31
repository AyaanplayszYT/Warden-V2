const { PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'roleinfo',
        description: 'Display detailed configuration, permission bits, and metrics for a role.',
        options: [
            {
                name: 'role',
                description: 'The role to inspect',
                type: 8, // ROLE
                required: true,
            },
        ],
    },

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        if (!role) {
            return V2Templates.error('Invalid Role', 'The requested role could not be resolved.').reply(interaction, { ephemeral: true });
        }

        const memberCount = role.members.size;
        const colorHex = role.hexColor.toUpperCase();
        const position = interaction.guild.roles.cache.size - role.position;

        const keyPermissions = [
            'Administrator',
            'ManageGuild',
            'ManageRoles',
            'ManageChannels',
            'KickMembers',
            'BanMembers',
            'ManageMessages',
            'MentionEveryone',
            'MuteMembers',
            'DeafenMembers',
            'MoveMembers',
            'ViewAuditLog',
        ];

        const roleKeyPerms = keyPermissions.filter(p => role.permissions.has(PermissionFlagsBits[p]));

        const card = new V2Card()
            .setAccent(role.hexColor !== '#000000' ? role.hexColor : 'primary')
            .setTitle(`[ROLE SPECIFICATION] @${role.name}`, `Role Identifier: \`${role.id}\``)
            .addField('Role Mention', `<@&${role.id}>`, true)
            .addField('Color Code', `\`${colorHex}\``, true)
            .addField('Hierarchy Position', `#${position} of ${interaction.guild.roles.cache.size}`, true)
            .addField('Member Count', `**${memberCount}** user(s)`, true)
            .addField('Hoisted (Separated)', role.hoist ? 'Enabled' : 'Disabled', true)
            .addField('Mentionable by Members', role.mentionable ? 'Enabled' : 'Disabled', true)
            .addField('Managed by Integration', role.managed ? 'Yes (Bot / Integration Role)' : 'No (Standard Role)', true)
            .addField('Created Date', `<t:${Math.floor(role.createdTimestamp / 1000)}:F> (<t:${Math.floor(role.createdTimestamp / 1000)}:R>)`, true);

        if (roleKeyPerms.length > 0) {
            card.addField('Granted Elevated Permissions', roleKeyPerms.map(p => `\`${p}\``).join(', '), false);
        } else {
            card.addField('Granted Elevated Permissions', 'None (Standard permissions only)', false);
        }

        card.setFooter(`Requested by ${interaction.user.tag}`);
        await card.reply(interaction);

        logger.info(`Roleinfo accessed for ${role.name} by ${interaction.user.tag}`);
    },
};
