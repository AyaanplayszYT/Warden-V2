const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { WardenEmbed, EmbedTemplates, colors, emojis } = require('../../utils/embedBuilder');

module.exports = {
    name: 'roleinfo',
    description: 'Display detailed information about a role',
    usage: 'roleinfo <role>',
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Display detailed information about a role')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to get information about')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const role = interaction.options?.getRole('role') || interaction.mentions?.roles?.first();
        
        if (!role) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('No Role', 'Please specify a role.')],
                ephemeral: true
            });
        }

        // Get key permissions
        const keyPermissions = [];
        const permissionFlags = {
            Administrator: '👑 Administrator',
            ManageGuild: '⚙️ Manage Server',
            ManageRoles: '🏷️ Manage Roles',
            ManageChannels: '📁 Manage Channels',
            ManageMessages: '💬 Manage Messages',
            ManageWebhooks: '🔗 Manage Webhooks',
            ManageNicknames: '📝 Manage Nicknames',
            ManageEmojisAndStickers: '😀 Manage Emojis',
            KickMembers: '👢 Kick Members',
            BanMembers: '🔨 Ban Members',
            ModerateMembers: '⏰ Timeout Members',
            MentionEveryone: '📢 Mention Everyone',
            ViewAuditLog: '📋 View Audit Log',
            MuteMembers: '🔇 Mute Members',
            DeafenMembers: '🔕 Deafen Members',
            MoveMembers: '🔄 Move Members'
        };

        for (const [perm, label] of Object.entries(permissionFlags)) {
            if (role.permissions.has(PermissionFlagsBits[perm])) {
                keyPermissions.push(label);
            }
        }

        // Get members with this role (limited to first 100)
        const membersWithRole = role.members;
        const memberCount = membersWithRole.size;
        const memberList = membersWithRole.first(10).map(m => m.user.tag).join(', ');

        // Role properties
        const properties = [];
        if (role.hoist) properties.push('📌 Displayed Separately');
        if (role.mentionable) properties.push('💬 Mentionable');
        if (role.managed) properties.push('🤖 Managed by Integration');
        if (role.tags?.botId) properties.push('🤖 Bot Role');
        if (role.tags?.premiumSubscriberRole) properties.push('💎 Booster Role');
        if (role.icon) properties.push('🖼️ Has Icon');
        if (role.unicodeEmoji) properties.push(`${role.unicodeEmoji} Has Emoji`);

        const embed = new WardenEmbed()
            .setColor(role.hexColor === '#000000' ? colors.primary : role.hexColor)
            .setAuthor({ 
                name: `Role Information`,
                iconURL: role.iconURL() || interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle(`${role.unicodeEmoji || ''} ${role.name}`)
            .addFields(
                {
                    name: '📋 General Information',
                    value: [
                        `${emojis.id} **ID:** \`${role.id}\``,
                        `🎨 **Color:** ${role.hexColor === '#000000' ? 'Default' : role.hexColor}`,
                        `📊 **Position:** ${role.position} / ${interaction.guild.roles.cache.size}`,
                        `📅 **Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
                        `💬 **Mention:** ${role}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '👥 Members',
                    value: [
                        `**Count:** ${memberCount.toLocaleString()}`,
                        memberCount > 0 
                            ? `**Sample:** ${memberList}${memberCount > 10 ? ` and ${memberCount - 10} more...` : ''}`
                            : '*No members with this role*'
                    ].join('\n'),
                    inline: true
                }
            );

        if (properties.length > 0) {
            embed.addFields({
                name: '⚙️ Properties',
                value: properties.join('\n'),
                inline: false
            });
        }

        if (keyPermissions.length > 0) {
            embed.addFields({
                name: '🔐 Key Permissions',
                value: keyPermissions.slice(0, 12).join('\n') + 
                       (keyPermissions.length > 12 ? `\n*...and ${keyPermissions.length - 12} more*` : ''),
                inline: false
            });
        } else {
            embed.addFields({
                name: '🔐 Key Permissions',
                value: '*No key permissions*',
                inline: false
            });
        }

        // Add color preview with progress bar
        if (role.hexColor !== '#000000') {
            const colorPreview = '█'.repeat(20);
            embed.addFields({
                name: '🎨 Color Preview',
                value: `\`${colorPreview}\``,
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        }).setTimestamp();

        // Add role icon if available
        if (role.iconURL()) {
            embed.setThumbnail(role.iconURL({ size: 256 }));
        }

        return interaction.reply({ embeds: [embed] });
    }
};
