const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const COLOR_ROLES = [
    { name: 'Crimson Red', color: '#ED4245' },
    { name: 'Ocean Blue', color: '#3498DB' },
    { name: 'Emerald Green', color: '#57F287' },
    { name: 'Warm Amber', color: '#FEE75C' },
    { name: 'Amethyst Purple', color: '#9B59B6' },
    { name: 'Sunset Orange', color: '#F27A3A' },
];

module.exports = {
    name: 'setupcolors',
    description: 'Provision color roles and deploy an interactive role selection component.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('setupcolors')
        .setDescription('Provision color roles and deploy an interactive role selection component')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to deploy the color selector to')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [UI.error('Permission Denied', 'You lack the Administrator permission.')],
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel('channel');
        const guild = interaction.guild;

        const perms = channel.permissionsFor(guild.members.me);
        if (!perms || !perms.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                embeds: [UI.error('Missing Permissions', `Bot lacks permission to send messages in <#${channel.id}>.`)],
                ephemeral: true,
            });
        }

        const createdRoleIds = {};
        for (const roleData of COLOR_ROLES) {
            let role = guild.roles.cache.find(r => r.name === roleData.name);
            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        mentionable: false,
                        reason: `Color role setup by ${interaction.user.tag}`,
                    });
                } catch (err) {
                    logger.error(`Failed to create color role ${roleData.name}:`, err);
                    return interaction.reply({
                        embeds: [UI.error('Role Creation Failed', `Failed to create role \`${roleData.name}\`: ${err.message}`)],
                        ephemeral: true,
                    });
                }
            }
            createdRoleIds[roleData.name] = role.id;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('color_role_select')
            .setPlaceholder('Select vanity color...')
            .addOptions([
                ...COLOR_ROLES.map(r => ({
                    label: r.name,
                    description: `Hex: ${r.color}`,
                    value: r.name,
                })),
                {
                    label: 'Remove Color',
                    description: 'Remove your vanity color role',
                    value: 'none',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = UI.embed()
            .color('primary')
            .title('Color Profile Selector')
            .desc(
                'Customize your username appearance in this server by selecting a vanity color role below.\n\n' +
                COLOR_ROLES.map(r => `• **${r.name}** (\`${r.color}\`)`).join('\n') +
                '\n\n*Select an option from the menu to apply or switch your color.*'
            )
            .footer('Identity Customization');

        try {
            const sentMsg = await channel.send({
                embeds: [embed.build()],
                components: [row],
            });

            const dataDir = path.join(__dirname, '../../data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const dataPath = path.join(dataDir, 'colorRoles.json');
            const saveData = {
                messageId: sentMsg.id,
                channelId: channel.id,
                guildId: guild.id,
                roles: COLOR_ROLES.map(r => ({ name: r.name, id: createdRoleIds[r.name] || '' })),
            };
            fs.writeFileSync(dataPath, JSON.stringify(saveData, null, 2));

            return interaction.reply({
                embeds: [UI.success('Color System Deployed', `Color roles verified and selector deployed to <#${channel.id}>.`)],
                ephemeral: true,
            });
        } catch (err) {
            return interaction.reply({
                embeds: [UI.error('Deployment Failed', `Failed to send selector to <#${channel.id}>: ${err.message}`)],
                ephemeral: true,
            });
        }
    },
};
