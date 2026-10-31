const { SlashCommandBuilder } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Inspect profile and role information for a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to inspect (defaults to self)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const warnings = warningsDB.get(interaction.guild.id, targetUser.id);
        const warningCount = warnings ? warnings.length : 0;

        let rolesText = 'None';
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}>`);
            if (roles.length > 0) {
                rolesText = roles.length > 10 ? `${roles.slice(0, 10).join(', ')} ... (+${roles.length - 10} more)` : roles.join(', ');
            }
        }

        const embed = new PremiumEmbed()
            .title(targetUser.tag)
            .thumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .field('Identity', `**ID** • \`${targetUser.id}\`\n**Account Type** • ${targetUser.bot ? 'Bot' : 'User'}\n**Warnings** • ${warningCount}`, false)
            .field('Dates', `**Created** • <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>${member?.joinedTimestamp ? `\n**Joined** • <t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : ''}`, false)
            .field('Roles', rolesText, false)
            .build();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Userinfo checked for ${targetUser.tag} by ${interaction.user.tag}`);
    },
};
