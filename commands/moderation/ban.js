const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .addIntegerOption(opt =>
            opt.setName('delete_messages')
                .setDescription('Purge recent messages (days)')
                .setRequired(false)
                .addChoices(
                    { name: 'None (0 days)', value: 0 },
                    { name: 'Past 24 hours (1 day)', value: 1 },
                    { name: 'Past 3 days', value: 3 },
                    { name: 'Past 7 days', value: 7 },
                )
        )
        .addBooleanOption(opt =>
            opt.setName('silent')
                .setDescription('Do not send DM notification to user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_messages') || 0;
        const silent = interaction.options.getBoolean('silent') || false;

        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [UI.error('Action Denied', 'You cannot ban yourself.')],
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [UI.error('Action Denied', 'The bot cannot ban its own account.')],
                ephemeral: true,
            });
        }

        const existingBan = await interaction.guild.bans.fetch(targetUser.id).catch(() => null);
        if (existingBan) {
            return interaction.reply({
                embeds: [UI.warning('Already Banned', `${targetUser.tag} is already banned from this server.`)],
                ephemeral: true,
            });
        }

        if (member) {
            if (!member.bannable) {
                return interaction.reply({
                    embeds: [UI.error('Hierarchy Error', 'Cannot ban this member due to role hierarchy or missing permissions.')],
                    ephemeral: true,
                });
            }

            if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({
                    embeds: [UI.error('Hierarchy Error', 'You cannot ban a user with a role equal to or higher than yours.')],
                    ephemeral: true,
                });
            }
        }

        // Direct message target before banning
        if (!silent && member) {
            try {
                const dmEmbed = UI.modDM({
                    action: 'ban',
                    guildName: interaction.guild.name,
                    reason,
                });
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {}
        }

        await interaction.guild.members.ban(targetUser.id, {
            deleteMessageSeconds: deleteDays * 24 * 60 * 60,
            reason: `${interaction.user.tag}: ${reason}`,
        });

        const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            type: 'ban',
        });

        const embed = UI.mod({
            action: 'ban',
            target: targetUser,
            moderator: interaction.user,
            reason,
            caseId: warning.caseId,
            extra: deleteDays > 0 ? `**Purged** • Past ${deleteDays} day(s)` : null,
        });

        await interaction.reply({ embeds: [embed] });
        await logToMod(interaction.guild, embed);

        logger.info(`${interaction.user.tag} banned ${targetUser.tag}. Reason: ${reason}`);
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
