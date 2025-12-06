const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'softban',
        description: 'Ban and immediately unban a user to delete their messages.',
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
                description: 'Delete messages from the past X days (1-7)',
                type: 4, // INTEGER
                required: false,
                choices: [
                    { name: 'Previous 1 day', value: 1 },
                    { name: 'Previous 3 days', value: 3 },
                    { name: 'Previous 7 days', value: 7 },
                ],
            },
        ],
        default_member_permissions: PermissionFlagsBits.BanMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('delete_messages') || 7;

        // Fetch the member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Permission checks
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Ban Members** permission to use this command.')],
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'You cannot softban yourself!')],
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'I cannot softban myself!')],
            });
        }

        if (targetMember) {
            if (!targetMember.bannable) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.error('Cannot Softban', 'I cannot softban this user. They may have a higher role than me.')],
                });
            }

            if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.error('Role Hierarchy', 'You cannot softban a user with an equal or higher role than you.')],
                });
            }
        }

        // Confirmation dialog
        const confirmEmbed = new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} Confirm Softban`)
            .setDescription(`Are you sure you want to softban **${targetUser.tag}**?\n\nThis will ban and immediately unban them, removing their recent messages.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addField(`${emojis.user} User`, `${targetUser.tag}\n\`${targetUser.id}\``, true)
            .addField(`${emojis.delete} Delete Messages`, `Past ${deleteMessageDays} day(s)`, true)
            .addField(`${emojis.edit} Reason`, reason, false)
            .build();

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('softban_confirm')
                .setLabel('Softban User')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔨'),
            new ButtonBuilder()
                .setCustomId('softban_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        const confirmMessage = await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmRow],
        });

        try {
            const buttonInteraction = await confirmMessage.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 30000,
            });

            if (buttonInteraction.customId === 'softban_cancel') {
                const cancelEmbed = EmbedTemplates.info('Softban Cancelled', `The softban action for **${targetUser.tag}** has been cancelled.`);
                return buttonInteraction.update({ embeds: [cancelEmbed], components: [] });
            }

            await buttonInteraction.deferUpdate();

            // DM the user before softbanning
            let dmSent = false;
            if (targetMember) {
                try {
                    const dmEmbed = EmbedTemplates.modDM({
                        action: 'kick',
                        guildName: interaction.guild.name,
                        guildIcon: interaction.guild.iconURL({ dynamic: true }),
                        moderator: interaction.user,
                        reason: `${reason} (Softban)`,
                    });
                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not DM ${targetUser.tag} about their softban.`);
                }
            }

            // Ban and immediately unban
            await interaction.guild.members.ban(targetUser.id, {
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
                reason: `Softbanned by ${interaction.user.tag} | ${reason}`,
            });

            await interaction.guild.members.unban(targetUser.id, `Softban complete - Unbanned after message deletion`);

            // Log to warnings database
            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'softban',
            });

            // Create success embed
            const successEmbed = EmbedTemplates.modAction({
                action: 'softban',
                target: targetUser,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
                dmSent,
            });

            // Log to mod log channel
            await logToModChannel(interaction.guild, successEmbed);

            await buttonInteraction.editReply({
                embeds: [successEmbed],
                components: [],
            });

            logger.info(`${interaction.user.tag} softbanned ${targetUser.tag} from ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const timeoutEmbed = EmbedTemplates.error('Timed Out', 'Softban confirmation timed out. No action was taken.');
                return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }

            logger.error('Error during softban command:', error);
            const errorEmbed = EmbedTemplates.error('Softban Failed', 'An error occurred while trying to softban this user.');
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    },
};

async function logToModChannel(guild, embed) {
    try {
        const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
        if (logChannels.modLog) {
            const modLogChannel = guild.channels.cache.get(logChannels.modLog);
            if (modLogChannel) {
                await modLogChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        logger.warn('Could not log to mod channel:', error);
    }
}
