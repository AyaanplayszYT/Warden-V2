const { PermissionFlagsBits, ButtonStyle, ComponentType } = require('discord.js');
const { V2Templates } = require('../../utils/v2Components');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'softban',
        description: 'Ban and immediately unban a user to purge recent messages.',
        options: [
            {
                name: 'user',
                description: 'The user to softban',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the softban',
                type: 3, // STRING
                required: false,
            },
            {
                name: 'delete_messages',
                description: 'Delete messages from past X days (1-7)',
                type: 4, // INTEGER
                required: false,
                choices: [
                    { name: 'Past 24 hours (1 day)', value: 1 },
                    { name: 'Past 3 days', value: 3 },
                    { name: 'Past 7 days', value: 7 },
                ],
            },
            {
                name: 'silent',
                description: 'Suppress direct message notification to user',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.BanMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('delete_messages') || 1;
        const silent = interaction.options.getBoolean('silent') || false;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Ban Members` permission to execute this command.'
            ).editReply(interaction);
        }

        if (targetUser.id === interaction.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Self-targeting is prohibited. You cannot softban yourself.'
            ).editReply(interaction);
        }

        if (targetUser.id === interaction.client.user.id) {
            return V2Templates.error(
                'Invalid Target',
                'Action rejected. The bot cannot softban its own account.'
            ).editReply(interaction);
        }

        if (targetMember) {
            if (!targetMember.bannable) {
                return V2Templates.error(
                    'Hierarchy Restriction',
                    'Target cannot be softbanned due to role hierarchy constraints.'
                ).editReply(interaction);
            }

            if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
                return V2Templates.error(
                    'Hierarchy Restriction',
                    'Target possesses a role equal to or higher than your highest role.'
                ).editReply(interaction);
            }
        }

        const { card: confirmCard, row: confirmRow } = V2Templates.confirmation({
            title: 'Confirm Softban Enforcement',
            description: `Review parameters below and confirm softban (ban + immediate unban) for **${targetUser.tag}**.`,
            fields: [
                { name: 'Target Account', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: 'Purge Window', value: `Past ${deleteMessageDays} day(s)`, inline: true },
                { name: 'Reason', value: reason, inline: true },
            ],
            confirmLabel: 'Confirm Softban',
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
                    `Softban enforcement for **${targetUser.tag}** was cancelled by operator.`
                ).update(buttonInteraction);
            }

            await buttonInteraction.deferUpdate();

            let dmSent = false;
            if (!silent && targetMember) {
                try {
                    const dmCard = V2Templates.modDM({
                        action: 'ban',
                        guildName: interaction.guild.name,
                        moderator: interaction.user,
                        reason: `[Softban] ${reason}`,
                    });
                    await dmCard.send(targetUser);
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not deliver softban notification DM to ${targetUser.tag}.`);
                }
            }

            // Ban with message deletion
            await interaction.guild.members.ban(targetUser.id, {
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
                reason: `[Warden Softban] By ${interaction.user.tag}: ${reason}`,
            });

            // Immediately unban
            await interaction.guild.bans.remove(targetUser.id, `[Warden Softban Complete] Unbanned automatically.`);

            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'softban',
            });

            const successCard = V2Templates.modAction({
                action: 'softban',
                target: targetUser,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
                dmSent,
            });

            await logToModChannel(interaction.guild, successCard);
            await successCard.editReply(buttonInteraction);

            logger.info(`${interaction.user.tag} softbanned ${targetUser.tag}. Purged: ${deleteMessageDays}d. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return V2Templates.warning(
                    'Operation Timed Out',
                    'Confirmation expired after 30 seconds of inactivity. No changes were applied.'
                ).editReply(interaction);
            }

            logger.error('Error during softban command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An unexpected error occurred while executing the softban action.'
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
