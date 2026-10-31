const { PermissionFlagsBits, ButtonStyle, ComponentType } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'kick',
        description: 'Remove a member from the server with audit logging.',
        options: [
            {
                name: 'user',
                description: 'The user to kick',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the kick',
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
        default_member_permissions: PermissionFlagsBits.KickMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Kick Members` permission to execute this command.'
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
                'Self-targeting is prohibited. You cannot kick yourself.'
            ).editReply(interaction);
        }

        if (targetUser.id === interaction.client.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Action rejected. The bot cannot kick its own account.'
            ).editReply(interaction);
        }

        if (!targetMember.kickable) {
            return V2Templates.error(
                'Hierarchy Restriction',
                'Target cannot be kicked due to role hierarchy constraints or missing administrative permissions.'
            ).editReply(interaction);
        }

        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return V2Templates.error(
                'Hierarchy Restriction',
                'Target possesses a role equal to or higher than your highest role.'
            ).editReply(interaction);
        }

        const { card: confirmCard, row: confirmRow } = V2Templates.confirmation({
            title: 'Confirm Kick Enforcement',
            description: `Review the moderation parameters below and confirm removal for **${targetUser.tag}**.`,
            fields: [
                { name: 'Target Account', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: 'Reason', value: reason, inline: true },
            ],
            confirmLabel: 'Confirm Kick',
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
                    `Kick enforcement for **${targetUser.tag}** was cancelled by operator.`
                ).update(buttonInteraction);
            }

            await buttonInteraction.deferUpdate();

            let dmSent = false;
            if (!silent) {
                try {
                    const dmCard = V2Templates.modDM({
                        action: 'kick',
                        guildName: interaction.guild.name,
                        moderator: interaction.user,
                        reason,
                    });
                    await dmCard.send(targetUser);
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not deliver kick notification DM to ${targetUser.tag}.`);
                }
            }

            await targetMember.kick(`[Warden Kick] By ${interaction.user.tag}: ${reason}`);

            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'kick',
            });

            const successCard = V2Templates.modAction({
                action: 'kick',
                target: targetUser,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
                dmSent,
            });

            await logToModChannel(interaction.guild, successCard);
            await successCard.editReply(buttonInteraction);

            logger.info(`${interaction.user.tag} kicked ${targetUser.tag} from ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return V2Templates.warning(
                    'Operation Timed Out',
                    'Confirmation expired after 30 seconds of inactivity. No changes were applied.'
                ).editReply(interaction);
            }

            logger.error('Error during kick command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An unexpected error occurred while executing the kick action.'
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
