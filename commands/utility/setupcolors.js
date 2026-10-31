const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const COLOR_ROLES = [
    { name: 'Crimson Red', color: '#ED4245', value: 'color_crimson' },
    { name: 'Ocean Blue', color: '#3498DB', value: 'color_blue' },
    { name: 'Emerald Green', color: '#57F287', value: 'color_green' },
    { name: 'Warm Amber', color: '#FEE75C', value: 'color_amber' },
    { name: 'Amethyst Purple', color: '#9B59B6', value: 'color_purple' },
    { name: 'Sunset Orange', color: '#F27A3A', value: 'color_orange' },
];

module.exports = {
    data: {
        name: 'setupcolors',
        description: 'Provision color roles and deploy an interactive role selection component.',
        options: [
            {
                name: 'channel',
                description: 'The channel to deploy the color selector to',
                type: 7, // CHANNEL
                required: true,
            },
        ],
        default_member_permissions: PermissionFlagsBits.Administrator,
    },

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Administrator` permission to configure role systems.'
            ).reply(interaction, { ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const guild = interaction.guild;

        const perms = channel.permissionsFor(guild.members.me);
        if (!perms.has(PermissionFlagsBits.SendMessages)) {
            return V2Templates.error(
                'Missing Permissions',
                `Warden lacks permission to send messages in <#${channel.id}>.`
            ).editReply(interaction);
        }

        // Provision roles if missing
        const createdRoleIds = {};
        for (const roleData of COLOR_ROLES) {
            let role = guild.roles.cache.find(r => r.name === roleData.name);
            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        mentionable: false,
                        reason: `[Warden Role Provisioning] Automated color setup by ${interaction.user.tag}`,
                    });
                } catch (err) {
                    logger.error(`Failed to create color role ${roleData.name}:`, err);
                    return V2Templates.error(
                        'Role Provisioning Failed',
                        `Failed to create role \`${roleData.name}\`: ${err.message}`
                    ).editReply(interaction);
                }
            }
            createdRoleIds[roleData.name] = role.id;
        }

        // Build Discord Components V2 Selector Card
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('color_role_select')
            .setPlaceholder('Select your preferred vanity color profile...')
            .addOptions([
                ...COLOR_ROLES.map(r => ({
                    label: r.name,
                    description: `Hex Code: ${r.color}`,
                    value: r.name,
                })),
                {
                    label: 'Remove Color Role',
                    description: 'Strip all vanity color roles from your account',
                    value: 'none',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const card = new V2Card()
            .setAccent('primary')
            .setTitle('[IDENTITY] Color Profile Selector')
            .setDescription(
                'Customize your username appearance in this server by selecting a vanity color role below.\n\n' +
                COLOR_ROLES.map(r => `• **${r.name}** (\`${r.color}\`)`).join('\n') +
                '\n\n*Select an option from the menu to apply or switch your color instantly.*'
            )
            .setFooter('Warden Identity Customization');

        card.addActionRow(row);

        let sentMsg;
        try {
            sentMsg = await channel.send({
                ...card.toPayload(),
                components: [card.buildContainer()]
            });
        } catch (err) {
            return V2Templates.error(
                'Dispatch Failed',
                `Failed to send component message to <#${channel.id}>: ${err.message}`
            ).editReply(interaction);
        }

        // Save mapping to data/colorRoles.json
        const dataPath = path.join(__dirname, '../../data/colorRoles.json');
        const saveData = {
            messageId: sentMsg.id,
            channelId: channel.id,
            guildId: guild.id,
            roles: COLOR_ROLES.map(r => ({ name: r.name, id: createdRoleIds[r.name] || '' })),
        };
        fs.writeFileSync(dataPath, JSON.stringify(saveData, null, 2));

        return V2Templates.success(
            'Color System Deployed',
            `Color roles verified and interactive selector deployed to <#${channel.id}>.`
        ).editReply(interaction);
    },
};
