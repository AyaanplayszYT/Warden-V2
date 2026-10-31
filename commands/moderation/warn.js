const { PermissionFlagsBits } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const { maxWarnings } = require('../../config/config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'warn',
        description: 'Issue an official recorded warning to a user.',
        options: [
            {
                name: 'user',
                description: 'The user to warn',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the warning',
                type: 3, // STRING
                required: false,
            },
            {
                name: 'silent',
                description: 'Suppress direct message notification to user',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to execute this command.'
            ).reply(interaction, { ephemeral: true });
        }

        if (!targetMember) {
            return V2Templates.error(
                'Member Not Found',
                `Target **${targetUser.tag}** (\`${targetUser.id}\`) is not currently present in this server.`
            ).reply(interaction, { ephemeral: true });
        }

        if (targetUser.id === interaction.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Self-targeting is prohibited. You cannot warn yourself.'
            ).reply(interaction, { ephemeral: true });
        }

        if (targetUser.id === interaction.client.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Action rejected. The bot cannot warn its own account.'
            ).reply(interaction, { ephemeral: true });
        }

        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return V2Templates.error(
                'Hierarchy Restriction',
                'Target possesses a role equal to or higher than your highest role.'
            ).reply(interaction, { ephemeral: true });
        }

        let dmSent = false;
        if (!silent) {
            try {
                const dmCard = V2Templates.modDM({
                    action: 'warn',
                    guildName: interaction.guild.name,
                    moderator: interaction.user,
                    reason,
                });
                await dmCard.send(targetUser);
                dmSent = true;
            } catch (error) {
                logger.warn(`Could not deliver warning notification DM to ${targetUser.tag}.`);
            }
        }

        const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            type: 'warn',
        });

        const userWarnings = warningsDB.get(interaction.guild.id, targetUser.id);
        const warningCount = userWarnings.length;

        const card = V2Templates.modAction({
            action: 'warn',
            target: targetUser,
            moderator: interaction.user,
            reason,
            caseId: warning.caseId,
            dmSent,
            extraFields: [
                { name: 'Total Warnings', value: `${warningCount} / ${maxWarnings || 5}`, inline: true },
            ],
        });

        await logToModChannel(interaction.guild, card);
        await card.reply(interaction);

        logger.info(`${interaction.user.tag} warned ${targetUser.tag} (Case #${warning.caseId}). Total: ${warningCount}`);
    },
};

async function logToModChannel(guild, card) {
    try {
        const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
        if (logChannels.modLog) {
            const modLogChannel = guild.channels.cache.get(logChannels.modLog);
            if (modLogChannel) {
                await card.send(modLogChannel);
            }
        }
    } catch (error) {
        logger.warn('Could not dispatch log to mod channel:', error);
    }
}
