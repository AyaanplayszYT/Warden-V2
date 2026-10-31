const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a member')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for removing the timeout')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [UI.error('Member Not Found', 'That user is not present in this server.')],
                ephemeral: true,
            });
        }

        if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp <= Date.now()) {
            return interaction.reply({
                embeds: [UI.warning('Not Timed Out', `${targetUser.tag} has no active timeout restrictions.`)],
                ephemeral: true,
            });
        }

        await member.timeout(null, `${interaction.user.tag}: ${reason}`);

        const embed = UI.mod({
            action: 'unmute',
            target: targetUser,
            moderator: interaction.user,
            reason,
        });

        await interaction.reply({ embeds: [embed] });
        await logToMod(interaction.guild, embed);

        logger.info(`${interaction.user.tag} unmuted ${targetUser.tag}. Reason: ${reason}`);
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
