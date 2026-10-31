const { PermissionFlagsBits, ButtonStyle, ComponentType } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // Discord limit: 28 days

module.exports = {
    data: {
        name: 'mute',
        description: 'Timeout a user for a specified duration.',
        options: [
            {
                name: 'user',
                description: 'The user to timeout',
                type: 6, // USER
                required: true,
            },
            {
                name: 'duration',
                description: 'Timeout duration (e.g., 10m, 1h, 1d)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the timeout',
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
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Moderate Members` permission to execute this command.'
            ).editReply(interaction);
        }

        if (!targetMember) {
            return V2Templates.error(
                'Member Not Found',
                `Target **${targetUser.tag}** (\`${targetUser.id}\`) is not currently present in this server.`
            ).editReply(interaction);
        }

        if (targetUser.id === interaction.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Self-targeting is prohibited. You cannot timeout yourself.'
            ).editReply(interaction);
        }

        if (targetUser.id === interaction.client.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Action rejected. The bot cannot timeout its own account.'
            ).editReply(interaction);
        }

        if (!targetMember.moderatable) {
            return V2Templates.error(
                'Hierarchy Restriction',
                'Target cannot be timed out due to role hierarchy constraints or missing administrative permissions.'
            ).editReply(interaction);
        }

        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return V2Templates.error(
                'Hierarchy Restriction',
                'Target possesses a role equal to or higher than your highest role.'
            ).editReply(interaction);
        }

        let durationMs;
        try {
            durationMs = ms(durationInput);
        } catch {
            durationMs = null;
        }

        if (!durationMs || durationMs < 5000 || durationMs > MAX_TIMEOUT_MS) {
            return V2Templates.error(
                'Invalid Duration',
                'Duration must be between 5 seconds and 28 days (e.g. `10m`, `2h`, `1d`).'
            ).editReply(interaction);
        }

        const formattedDuration = ms(durationMs, { long: true });

        // Confirmation dialog
        const { card: confirmCard, row: confirmRow } = V2Templates.confirmation({
            title: 'Confirm Timeout Enforcement',
            description: `Review parameters below and confirm temporary communication restriction for **${targetUser.tag}**.`,
            fields: [
                { name: 'Target Account', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: 'Duration', value: formattedDuration, inline: true },
                { name: 'Reason', value: reason, inline: true },
            ],
            confirmLabel: 'Confirm Timeout',
            cancelLabel: 'Cancel',
            confirmStyle: ButtonStyle.Danger,
        });

        const confirmMessage = await interaction.editReply({
            ...confirmCard.toPayload(),
            components: [confirmCard.buildContainer()]
        });

        try {
            const buttonInteraction = await confirmMessage.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 30000,
            });

            if (buttonInteraction.customId === 'confirm_no') {
                return V2Templates.info(
                    'Action Aborted',
                    `Timeout enforcement for **${targetUser.tag}** was cancelled by operator.`
                ).update(buttonInteraction);
            }

            await buttonInteraction.deferUpdate();

            let dmSent = false;
            if (!silent) {
                try {
                    const dmCard = V2Templates.modDM({
                        action: 'mute',
                        guildName: interaction.guild.name,
                        moderator: interaction.user,
                        reason,
                        duration: formattedDuration,
                    });
                    await dmCard.send(targetUser);
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not deliver mute notification DM to ${targetUser.tag}.`);
                }
            }

            await targetMember.timeout(durationMs, `[Warden Timeout] By ${interaction.user.tag}: ${reason}`);

            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'mute',
            });

            const successCard = V2Templates.modAction({
                action: 'mute',
                target: targetUser,
                moderator: interaction.user,
                reason,
                duration: formattedDuration,
                caseId: warning.caseId,
                dmSent,
            });

            await logToModChannel(interaction.guild, successCard);
            await successCard.editReply(buttonInteraction);

            logger.info(`${interaction.user.tag} timed out ${targetUser.tag} for ${formattedDuration}. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return V2Templates.warning(
                    'Operation Timed Out',
                    'Confirmation expired after 30 seconds of inactivity. No changes were applied.'
                ).editReply(interaction);
            }

            logger.error('Error during mute command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An unexpected error occurred while executing the timeout action.'
            ).editReply(interaction);
        }
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
