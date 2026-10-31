const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Revoke a ban by user ID')
        .addStringOption(opt =>
            opt.setName('user_id')
                .setDescription('The Discord ID of the user to unban')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for unbanning')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id').trim();
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                embeds: [UI.error('Invalid ID', 'Please enter a valid numeric Discord User ID (17-20 digits).')],
                ephemeral: true,
            });
        }

        const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!banEntry) {
            return interaction.reply({
                embeds: [UI.warning('Not Found', `No active ban was found for User ID \`${userId}\`.`)],
                ephemeral: true,
            });
        }

        await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${reason}`);

        const embed = UI.mod({
            action: 'unban',
            target: banEntry.user,
            moderator: interaction.user,
            reason,
        });

        await interaction.reply({ embeds: [embed] });
        await logToMod(interaction.guild, embed);

        logger.info(`${interaction.user.tag} unbanned ${banEntry.user.tag} (${userId}). Reason: ${reason}`);
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
