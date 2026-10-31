const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits } = require('discord.js');
const { UI, PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

const CATEGORIES = {
    moderation: {
        name: 'Moderation',
        description: 'Bans, mutes, warnings, kicks, and lockdown tools',
        commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'softban', 'unban', 'lock', 'unlock', 'slowmode', 'purge'],
    },
    utility: {
        name: 'Utility',
        description: 'Productivity, polls, reminders, snipes, and custom stickers',
        commands: ['sticker', 'stickers', 'poll', 'remind', 'snipe', 'ping', 'help'],
    },
    info: {
        name: 'Intelligence',
        description: 'User, server, role, and avatar inspection',
        commands: ['userinfo', 'serverinfo', 'avatar', 'roleinfo', 'emojiinfo'],
    },
    config: {
        name: 'Configuration',
        description: 'Log routing, ignore lists, and color setup',
        commands: ['ignore', 'setmodlog', 'setspamlog', 'setupcolors', 'modlogs', 'spamlogs'],
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View command documentation and directory')
        .addStringOption(opt =>
            opt.setName('command')
                .setDescription('Get details for a specific command')
                .setRequired(false)
        ),

    async execute(interaction) {
        const cmdName = interaction.options.getString('command');

        if (cmdName) {
            const cmd = interaction.client.commands.get(cmdName.toLowerCase());
            if (!cmd) {
                return interaction.reply({
                    embeds: [UI.error('Not Found', `Command \`/${cmdName}\` was not found.`)],
                    ephemeral: true,
                });
            }

            const data = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
            let optionsText = 'None';
            if (data.options && data.options.length > 0) {
                optionsText = data.options.map(o => `\`${o.name}\` • ${o.description || 'No description'}`).join('\n');
            }

            const embed = new PremiumEmbed()
                .title(`/${data.name}`)
                .desc(data.description || 'No description provided')
                .field('Options', optionsText, false)
                .build();

            return interaction.reply({ embeds: [embed] });
        }

        const mainEmbed = new PremiumEmbed()
            .title('Warden • Command Directory')
            .desc('Select a category from the dropdown menu to inspect commands.\nUse `/help command:<name>` for detailed parameter syntax.')
            .field('Moderation', '12 commands • Ban, kick, mute, warn, purge, lock...', false)
            .field('Utility', '7 commands • Custom stickers, polls, reminders, snipes, latency...', false)
            .field('Intelligence', '5 commands • Userinfo, serverinfo, roles, avatars...', false)
            .field('Configuration', '6 commands • Ignore lists, log routing, color roles...', false)
            .build();

        const select = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                Object.entries(CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    description: cat.description,
                    value: key,
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        const msg = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            fetchReply: true,
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 90000,
        });

        collector.on('collect', async i => {
            const cat = CATEGORIES[i.values[0]];
            const embed = new PremiumEmbed()
                .title(`${cat.name} Commands`)
                .desc(cat.description + '\n\n' + cat.commands.map(c => `• \`/${c}\``).join('\n'))
                .build();

            await i.update({ embeds: [embed], components: [row] }).catch(() => {});
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(() => {});
        });
    },
};
