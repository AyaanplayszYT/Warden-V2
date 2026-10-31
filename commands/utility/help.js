const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

const CATEGORIES = {
    moderation: {
        name: 'Moderation Enforcement',
        description: 'Server protection, bans, timeouts, mutes, warnings, and channel locks.',
        permissions: 'Moderators & Administrators',
    },
    utility: {
        name: 'General Utilities',
        description: 'Productivity, polls, reminders, message purging, and snipe commands.',
        permissions: 'All Members',
    },
    info: {
        name: 'Server & User Intelligence',
        description: 'Telemetry, server audits, user inspection, roles, and avatar lookups.',
        permissions: 'All Members',
    },
    config: {
        name: 'System Configuration',
        description: 'Audit log channel routing, color systems, and security settings.',
        permissions: 'Server Administrators Only',
    },
};

module.exports = {
    data: {
        name: 'help',
        description: 'Display system documentation, command directory, and usage syntax.',
        options: [
            {
                name: 'command',
                description: 'Get deep technical documentation for a specific command',
                type: 3, // STRING
                required: false,
            },
        ],
    },

    async execute(interaction) {
        const specificCommand = interaction.options.getString('command');

        if (specificCommand) {
            return this.showCommandHelp(interaction, specificCommand);
        }

        return this.showMainHelp(interaction);
    },

    async showMainHelp(interaction) {
        await interaction.deferReply();
        const commands = interaction.client.commands;

        const categorized = {
            moderation: [],
            utility: [],
            info: [],
            config: [],
        };

        const modCommands = ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'unban', 'softban', 'purge', 'slowmode', 'lock', 'unlock'];
        const infoCommands = ['userinfo', 'serverinfo', 'avatar', 'roleinfo', 'emojiinfo', 'ping'];
        const configCommands = ['setmodlog', 'setspamlog', 'setupcolors'];

        commands.forEach(cmd => {
            const name = cmd.data?.name || cmd.name;
            if (modCommands.includes(name)) {
                categorized.moderation.push(cmd);
            } else if (infoCommands.includes(name)) {
                categorized.info.push(cmd);
            } else if (configCommands.includes(name)) {
                categorized.config.push(cmd);
            } else {
                categorized.utility.push(cmd);
            }
        });

        const mainCard = new V2Card()
            .setAccent('primary')
            .setTitle('[DOCUMENTATION] Warden System Overview', 'High-performance Discord moderation and security engine.')
            .setDescription(
                'Warden provides automated server security, role moderation, audit logging, and member utilities.\n\n' +
                'Select a category from the menu below to inspect available commands, or execute `/help command:<name>` for syntax and option flags.\n\n' +
                `**System Index Statistics**\n` +
                `• Total Registered Commands: **${commands.size}**\n` +
                `• Moderation Tools: **${categorized.moderation.length}**\n` +
                `• Utility & Tools: **${categorized.utility.length}**\n` +
                `• Intelligence & Telemetry: **${categorized.info.length}**\n` +
                `• System Configuration: **${categorized.config.length}**`
            );

        Object.entries(CATEGORIES).forEach(([key, cat]) => {
            const count = categorized[key].length;
            if (count > 0) {
                mainCard.addField(
                    `[CATEGORY] ${cat.name} (${count} commands)`,
                    `${cat.description}\n*Access Requirement: ${cat.permissions}*`,
                    false
                );
            }
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Select a category to view commands...')
            .addOptions(
                Object.entries(CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    description: cat.description.substring(0, 60),
                    value: key,
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        mainCard.addActionRow(selectRow);

        const replyMsg = await interaction.editReply({
            ...mainCard.toPayload(),
            components: [mainCard.buildContainer()]
        });

        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 90000,
        });

        collector.on('collect', async i => {
            const selectedKey = i.values[0];
            const cat = CATEGORIES[selectedKey];
            const cmds = categorized[selectedKey];

            const catCard = new V2Card()
                .setAccent('primary')
                .setTitle(`[CATEGORY] ${cat.name}`, cat.description)
                .setDescription(
                    `**Access Requirement:** \`${cat.permissions}\`\n\n` +
                    cmds.map(cmd => {
                        const name = cmd.data?.name || cmd.name;
                        const desc = cmd.data?.description || 'No description provided';
                        return `• \`/${name}\` — ${desc}`;
                    }).join('\n')
                )
                .setFooter(`${cmds.length} commands available in this category`);

            catCard.addActionRow(selectRow);

            await i.update({
                ...catCard.toPayload(),
                components: [catCard.buildContainer()]
            }).catch(() => {});
        });

        collector.on('end', async () => {
            selectMenu.setDisabled(true);
            mainCard.actionRows = [new ActionRowBuilder().addComponents(selectMenu)];
            await interaction.editReply({
                ...mainCard.toPayload(),
                components: [mainCard.buildContainer()]
            }).catch(() => {});
        });
    },

    async showCommandHelp(interaction, commandName) {
        await interaction.deferReply();
        const command = interaction.client.commands.get(commandName.toLowerCase());

        if (!command) {
            return V2Templates.error(
                'Command Not Found',
                `No command matching \`/${commandName}\` is registered in the command directory.\nRun \`/help\` to inspect available commands.`
            ).editReply(interaction);
        }

        const cmdData = command.data;
        const card = new V2Card()
            .setAccent('info')
            .setTitle(`[COMMAND MANUAL] /${cmdData.name}`)
            .setDescription(cmdData.description || 'No description available for this command.');

        if (cmdData.default_member_permissions) {
            let permName = 'Restricted Permissions Required';
            const permValue = BigInt(cmdData.default_member_permissions);

            if (permValue === PermissionFlagsBits.BanMembers) permName = 'Ban Members';
            else if (permValue === PermissionFlagsBits.KickMembers) permName = 'Kick Members';
            else if (permValue === PermissionFlagsBits.ModerateMembers) permName = 'Moderate Members (Timeout)';
            else if (permValue === PermissionFlagsBits.ManageChannels) permName = 'Manage Channels';
            else if (permValue === PermissionFlagsBits.ManageMessages) permName = 'Manage Messages';
            else if (permValue === PermissionFlagsBits.Administrator) permName = 'Administrator';

            card.addField('Access Clearance', `\`${permName}\``, true);
        } else {
            card.addField('Access Clearance', '`Public Access`', true);
        }

        // Subcommands or options
        if (cmdData.options && cmdData.options.length > 0) {
            const optionsList = cmdData.options.map(opt => {
                const reqBadge = opt.required ? '[REQUIRED]' : '[OPTIONAL]';
                return `• \`${opt.name}\` ${reqBadge} — ${opt.description || 'No parameter description'}`;
            }).join('\n');
            card.addField('Command Options & Flags', optionsList, false);
        } else {
            card.addField('Command Options', 'No additional flags or parameters required.', false);
        }

        card.setFooter(`Warden Command Specification • /${cmdData.name}`);
        return card.editReply(interaction);
    },
};
