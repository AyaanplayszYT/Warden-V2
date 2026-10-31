const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('silent')
                .setDescription('Do not send DM notification to user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [UI.error('Member Not Found', 'That user is not present in this server.')],
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [UI.error('Action Denied', 'You cannot kick yourself.')],
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [UI.error('Action Denied', 'The bot cannot kick its own account.')],
                ephemeral: true,
            });
        }

        if (!member.kickable) {
            return interaction.reply({
                embeds: [UI.error('Hierarchy Error', 'Cannot kick this member due to role hierarchy or missing permissions.')],
                ephemeral: true,
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                embeds: [UI.error('Hierarchy Error', 'You cannot kick a user with a role equal to or higher than yours.')],
                ephemeral: true,
            });
        }

        if (!silent) {
            try {
                const dmEmbed = UI.modDM({
                    action: 'kick',
                    guildName: interaction.guild.name,
                    reason,
                });
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {}
        }

        await member.kick(`${interaction.user.tag}: ${reason}`);

        const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            type: 'kick',
        });

        const embed = UI.mod({
            action: 'kick',
            target: targetUser,
            moderator: interaction.user,
            reason,
            caseId: warning.caseId,
        });

        await interaction.reply({ embeds: [embed] });
        await logToMod(interaction.guild, embed);

        logger.info(`${interaction.user.tag} kicked ${targetUser.tag}. Reason: ${reason}`);
    },
};

async function logToMod(guild, embed) {
    try {
        const filePath = path.join(__dirname, '../../data/logChannels.json');
        if (!fs.existsSync(filePath)) return;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.modLog) {
            const ch = guild.channels.cache.get(data.modLog);
            if (ch) await ch.send({ embeds: [embed] });
        }
    } catch (e) {}
}
