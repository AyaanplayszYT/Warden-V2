const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a member for a specified duration')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('duration')
                .setDescription('Duration (e.g. 10m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('silent')
                .setDescription('Do not send DM notification to user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const durationInput = interaction.options.getString('duration');
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
                embeds: [UI.error('Action Denied', 'You cannot timeout yourself.')],
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [UI.error('Action Denied', 'The bot cannot timeout its own account.')],
                ephemeral: true,
            });
        }

        if (!member.moderatable) {
            return interaction.reply({
                embeds: [UI.error('Hierarchy Error', 'Cannot timeout this member due to role hierarchy or missing permissions.')],
                ephemeral: true,
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                embeds: [UI.error('Hierarchy Error', 'You cannot timeout a user with a role equal to or higher than yours.')],
                ephemeral: true,
            });
        }

        let durationMs;
        try {
            durationMs = ms(durationInput);
        } catch {
            durationMs = null;
        }

        if (!durationMs || durationMs < 5000 || durationMs > MAX_TIMEOUT) {
            return interaction.reply({
                embeds: [UI.error('Invalid Duration', 'Duration must be between 5 seconds and 28 days (e.g. `10m`, `2h`, `1d`).')],
                ephemeral: true,
            });
        }

        const formatted = ms(durationMs, { long: true });

        if (!silent) {
            try {
                const dmEmbed = UI.modDM({
                    action: 'mute',
                    guildName: interaction.guild.name,
                    reason,
                    duration: formatted,
                });
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {}
        }

        await member.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

        const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            type: 'mute',
        });

        const embed = UI.mod({
            action: 'mute',
            target: targetUser,
            moderator: interaction.user,
            reason,
            duration: formatted,
            caseId: warning.caseId,
        });

        await interaction.reply({ embeds: [embed] });
        await logToMod(interaction.guild, embed);

        logger.info(`${interaction.user.tag} timed out ${targetUser.tag} for ${formatted}. Reason: ${reason}`);
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
