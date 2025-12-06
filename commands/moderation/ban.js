const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis, colors } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'ban',
        description: 'Ban a user from the server with optional message deletion.',
        options: [
            {
                name: 'user',
                description: 'The user to ban',
                type: 6, // USER
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the ban',
                type: 3, // STRING
                required: false,
            },
            {
                name: 'delete_messages',
                description: 'Delete messages from the past X days (0-7)',
                type: 4, // INTEGER
                required: false,
                choices: [
                    { name: "Don't delete any", value: 0 },
                    { name: 'Previous 1 day', value: 1 },
                    { name: 'Previous 3 days', value: 3 },
                    { name: 'Previous 7 days', value: 7 },
                ],
            },
            {
                name: 'silent',
                description: 'Do not notify the user via DM',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.BanMembers,
    },

    async execute(interaction) {
        // Defer reply for processing time
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;
        const silent = interaction.options.getBoolean('silent') || false;

        // Fetch the member if they're in the guild
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Permission checks
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Ban Members** permission to use this command.')],
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'You cannot ban yourself!')],
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'I cannot ban myself!')],
            });
        }

        // Check if user is already banned
        const existingBan = await interaction.guild.bans.fetch(targetUser.id).catch(() => null);
        if (existingBan) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Already Banned', `**${targetUser.tag}** is already banned from this server.`)],
            });
        }

        // Role hierarchy check
        if (targetMember) {
            if (!targetMember.bannable) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.error('Cannot Ban', 'I cannot ban this user. They may have a higher role than me or I lack permissions.')],
                });
            }

            if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.error('Role Hierarchy', 'You cannot ban a user with an equal or higher role than you.')],
                });
            }
        }

        // Confirmation dialog
        const confirmEmbed = new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} Confirm Ban`)
            .setDescription(`Are you sure you want to ban **${targetUser.tag}**?`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addField(`${emojis.user} User`, `${targetUser.tag}\n\`${targetUser.id}\``, true)
            .addField(`${emojis.edit} Reason`, reason, true)
            .addField(`${emojis.delete} Delete Messages`, deleteMessageDays > 0 ? `Past ${deleteMessageDays} day(s)` : 'None', true)
            .build();

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ban_confirm')
                .setLabel('Ban User')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔨'),
            new ButtonBuilder()
                .setCustomId('ban_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        const confirmMessage = await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmRow],
        });

        // Wait for button interaction
        try {
            const buttonInteraction = await confirmMessage.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 30000,
            });

            if (buttonInteraction.customId === 'ban_cancel') {
                const cancelEmbed = EmbedTemplates.info('Ban Cancelled', `The ban action for **${targetUser.tag}** has been cancelled.`);
                return buttonInteraction.update({ embeds: [cancelEmbed], components: [] });
            }

            // Proceed with ban
            await buttonInteraction.deferUpdate();

            // DM the user before banning (if not silent)
            let dmSent = false;
            if (!silent && targetMember) {
                try {
                    const dmEmbed = EmbedTemplates.modDM({
                        action: 'ban',
                        guildName: interaction.guild.name,
                        guildIcon: interaction.guild.iconURL({ dynamic: true }),
                        moderator: interaction.user,
                        reason,
                    });
                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not DM ${targetUser.tag} about their ban.`);
                }
            }

            // Perform the ban
            await interaction.guild.members.ban(targetUser.id, {
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
                reason: `Banned by ${interaction.user.tag} | ${reason}`,
            });

            // Log to warnings database
            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                type: 'ban',
            });

            // Create success embed
            const successEmbed = EmbedTemplates.modAction({
                action: 'ban',
                target: targetUser,
                moderator: interaction.user,
                reason,
                caseId: warning.caseId,
                dmSent,
            });

            // Log to mod log channel
            await logToModChannel(interaction.guild, successEmbed);

            // Update the interaction
            await buttonInteraction.editReply({
                embeds: [successEmbed],
                components: [],
            });

            logger.info(`${interaction.user.tag} banned ${targetUser.tag} from ${interaction.guild.name}. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const timeoutEmbed = EmbedTemplates.error('Timed Out', 'Ban confirmation timed out. No action was taken.');
                return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }

            logger.error('Error during ban command:', error);
            const errorEmbed = EmbedTemplates.error('Ban Failed', 'An error occurred while trying to ban this user.');
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    },
};

// Helper function to log to mod channel
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
