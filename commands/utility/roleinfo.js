const { SlashCommandBuilder } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Inspect specifications and permissions for a role')
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('The role to inspect')
                .setRequired(true)
        ),

    async execute(interaction) {
        const role = interaction.options.getRole('role');

        const embed = new PremiumEmbed()
            .color(role.hexColor !== '#000000' ? role.hexColor : 'primary')
            .title(`@${role.name}`)
            .field('Metadata', `**ID** • \`${role.id}\`\n**Color** • \`${role.hexColor.toUpperCase()}\`\n**Position** • #${interaction.guild.roles.cache.size - role.position}`, true)
            .field('Properties', `**Members** • ${role.members.size}\n**Hoisted** • ${role.hoist ? 'Yes' : 'No'}\n**Mentionable** • ${role.mentionable ? 'Yes' : 'No'}`, true)
            .field('Created', `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, false)
            .build();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Roleinfo checked for ${role.name} by ${interaction.user.tag}`);
    },
};
