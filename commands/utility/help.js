const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits } = require('discord.js');
const { WardenEmbed, EmbedTemplates, emojis, colors } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

// Command categories with emojis and required permissions
const CATEGORIES = {
    moderation: { 
        name: 'Moderation', 
        emoji: '🛡️', 
        description: 'Commands for moderating your server',
        permissions: 'Moderators Only'
    },
    utility: { 
        name: 'Utility', 
        emoji: '🔧', 
        description: 'General utility commands for everyone' 
    },
    info: { 
        name: 'Information', 
        emoji: 'ℹ️', 
        description: 'Get information about users, server, roles, etc.' 
    },
    config: {
        name: 'Configuration',
        emoji: '⚙️',
        description: 'Server configuration commands',
        permissions: 'Administrators Only'
    }
};

module.exports = {
    data: {
        name: 'help',
        description: 'Shows all available commands and their usage.',
        options: [
            {
                name: 'command',
                description: 'Get detailed help for a specific command',
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
        const commands = interaction.client.commands;

        // Categorize commands properly
        const categorized = {
            moderation: [],
            utility: [],
            info: [],
            config: [],
        };

        // Command category mappings
        const modCommands = ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'unban', 'softban', 'purge', 'slowmode', 'lock', 'unlock'];
        const infoCommands = ['userinfo', 'serverinfo', 'avatar', 'roleinfo', 'emojiinfo'];
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

        // Create main help embed
        const mainEmbed = new WardenEmbed()
            .setType('primary')
            .setTitle(`${emojis.book || '📚'} Warden Bot Help`)
            .setDescription(
                `Welcome to **Warden**, your powerful Discord moderation bot!\n\n` +
                `Use the dropdown menu below to browse commands by category, or use \`/help <command>\` for detailed information about a specific command.\n\n` +
                `**📊 Statistics**\n` +
                `• Total Commands: **${commands.size}**\n` +
                `• Moderation Commands: **${categorized.moderation.length}** 🛡️\n` +
                `• Utility Commands: **${categorized.utility.length + categorized.info.length}** 🔧`
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
            .build();

        // Add category summaries with permission info
        Object.entries(categorized).forEach(([key, cmds]) => {
            if (cmds.length > 0) {
                const cat = CATEGORIES[key];
                const permText = cat.permissions ? `\n*${cat.permissions}*` : '';
                mainEmbed.addFields({
                    name: `${cat.emoji} ${cat.name} (${cmds.length})`,
                    value: cat.description + permText,
                    inline: true,
                });
            }
        });

        // Create category select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('📂 Select a category to view commands')
            .addOptions(
                Object.entries(CATEGORIES)
                    .filter(([key]) => categorized[key].length > 0)
                    .map(([key, cat]) => ({
                        label: cat.name,
                        description: cat.description.substring(0, 50),
                        value: key,
                        emoji: cat.emoji,
                    }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const message = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            fetchReply: true,
        });

        // Handle select menu interaction
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 120000,
        });

        collector.on('collect', async i => {
            const category = i.values[0];
            const cat = CATEGORIES[category];
            const cmds = categorized[category];

            // Build command list with better formatting
            const commandList = cmds.map(cmd => {
                const name = cmd.data?.name || cmd.name;
                const desc = cmd.data?.description || cmd.description || 'No description';
                return `\`/${name}\` - ${desc}`;
            }).join('\n');

            const categoryEmbed = new WardenEmbed()
                .setType('primary')
                .setTitle(`${cat.emoji} ${cat.name} Commands`)
                .setDescription(
                    (cat.permissions ? `⚠️ **${cat.permissions}**\n\n` : '') +
                    commandList
                )
                .setFooter(`${cmds.length} commands • Use /help <command> for details`)
                .build();

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            selectMenu.setDisabled(true);
            message.edit({ components: [new ActionRowBuilder().addComponents(selectMenu)] }).catch(() => {});
        });

        logger.info(`Help command used by ${interaction.user.tag}`);
    },

    async showCommandHelp(interaction, commandName) {
        const command = interaction.client.commands.get(commandName.toLowerCase());

        if (!command) {
            return interaction.reply({
                embeds: [EmbedTemplates.error('Command Not Found', `No command called \`${commandName}\` was found.\n\nUse \`/help\` to see all available commands.`)],
                ephemeral: true,
            });
        }

        const cmdData = command.data;
        const embed = new WardenEmbed()
            .setType('info')
            .setTitle(`${emojis.help || '❓'} Command: /${cmdData.name}`)
            .setDescription(cmdData.description)
            .build();

        // Add permission requirement
        if (cmdData.default_member_permissions) {
            let permName = 'Special Permissions Required';
            const permValue = BigInt(cmdData.default_member_permissions);
            
            if (permValue === PermissionFlagsBits.BanMembers) permName = 'Ban Members';
            else if (permValue === PermissionFlagsBits.KickMembers) permName = 'Kick Members';
            else if (permValue === PermissionFlagsBits.ModerateMembers) permName = 'Moderate Members (Timeout)';
            else if (permValue === PermissionFlagsBits.ManageMessages) permName = 'Manage Messages';
            else if (permValue === PermissionFlagsBits.ManageChannels) permName = 'Manage Channels';
            else if (permValue === PermissionFlagsBits.Administrator) permName = 'Administrator';
            else if (permValue === PermissionFlagsBits.ManageGuild) permName = 'Manage Server';
            
            embed.addFields({ 
                name: '🔐 Required Permission', 
                value: `\`${permName}\``, 
                inline: true 
            });
        }

        // Add options/arguments
        if (cmdData.options && cmdData.options.length > 0) {
            // Check if it has subcommands
            const hasSubcommands = cmdData.options.some(opt => opt.type === 1 || opt.type === 2);
            
            if (hasSubcommands) {
                const subcommands = cmdData.options.filter(opt => opt.type === 1);
                const subText = subcommands.map(sub => 
                    `**/${cmdData.name} ${sub.name}**\n${sub.description}`
                ).join('\n\n');
                embed.addFields({ name: '📋 Subcommands', value: subText || 'None', inline: false });
            } else {
                const optionsText = cmdData.options.map(opt => {
                    const required = opt.required ? '`Required`' : '`Optional`';
                    return `**${opt.name}** ${required}\n${opt.description}`;
                }).join('\n\n');
                
                embed.addFields({ name: '📝 Options', value: optionsText, inline: false });
            }
        }

        // Add usage example
        let usage = `/${cmdData.name}`;
        if (cmdData.options) {
            const mainOptions = cmdData.options.filter(opt => opt.type !== 1 && opt.type !== 2);
            mainOptions.forEach(opt => {
                usage += opt.required ? ` <${opt.name}>` : ` [${opt.name}]`;
            });
        }
        embed.addFields({ name: '💡 Usage', value: `\`${usage}\``, inline: false });

        await interaction.reply({ embeds: [embed] });
    },
};
