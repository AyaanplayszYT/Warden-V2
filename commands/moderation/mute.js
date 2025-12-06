const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

// Duration presets for autocomplete/choices
const DURATION_PRESETS = [
    { name: '5 minutes', value: '5m' },
    { name: '10 minutes', value: '10m' },
    { name: '30 minutes', value: '30m' },
    { name: '1 hour', value: '1h' },
    { name: '6 hours', value: '6h' },
    { name: '12 hours', value: '12h' },
    { name: '1 day', value: '1d' },
    { name: '3 days', value: '3d' },
    { name: '1 week', value: '7d' },
    { name: '2 weeks', value: '14d' },
    { name: '28 days (max)', value: '28d' },
];

module.exports = {
    data: {
        name: 'mute',
        description: 'Timeout a user for a specified duration.',
        options: [
            {
                name: 'user',
                description: 'The user to mute',
                type: 6, // USER
                required: true,
            },
            {
                name: 'duration',
                description: 'How long to mute the user (e.g., 10m, 1h, 1d)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the mute',
                type: 3, // STRING
                required: false,
            },
            {
                name: 'silent',
                description: 'Do not notify the user via DM',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ModerateMembers,
    },

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        // Parse duration
        const duration = ms(durationStr);
        if (!duration || isNaN(duration)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Duration', 'Please provide a valid duration (e.g., `10m`, `1h`, `1d`).\n\n**Examples:**\n• `10m` = 10 minutes\n• `1h` = 1 hour\n• `1d` = 1 day\n• `7d` = 1 week')],
            });
        }

        if (duration < 60000) { // Less than 1 minute
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Duration Too Short', 'The minimum timeout duration is 1 minute.')],
            });
        }

        if (duration > ms('28d')) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Duration Too Long', 'The maximum timeout duration is 28 days.')],
            });
        }

        // Fetch the member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Permission checks
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Moderate Members** permission to use this command.')],
            });
        }

        if (!targetMember) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('User Not Found', 'This user is not in the server.')],
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'You cannot mute yourself!')],
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'I cannot mute myself!')],
            });
        }

        if (!targetMember.moderatable) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Cannot Mute', 'I cannot mute this user. They may have a higher role than me.')],
            });
        }

        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Role Hierarchy', 'You cannot mute a user with an equal or higher role than you.')],
            });
        }

        // Check if already muted
        if (targetMember.isCommunicationDisabled()) {
            const currentTimeout = targetMember.communicationDisabledUntil;
            return interaction.editReply({
                embeds: [EmbedTemplates.warning('Already Muted', `**${targetUser.tag}** is already muted until <t:${Math.floor(currentTimeout.getTime() / 1000)}:F>.`)],
            });
        }

        // Format duration for display
        const formatDuration = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
            return `${seconds} second${seconds > 1 ? 's' : ''}`;
        };

        const formattedDuration = formatDuration(duration);
        const unmutesAt = new Date(Date.now() + duration);

        // Confirmation dialog
        const confirmEmbed = new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} Confirm Mute`)
            .setDescription(`Are you sure you want to mute **${targetUser.tag}**?`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addField(`${emojis.user} User`, `${targetUser.tag}\n\`${targetUser.id}\``, true)
            .addField(`${emojis.clock} Duration`, formattedDuration, true)
            .addField(`${emojis.calendar} Unmutes At`, `<t:${Math.floor(unmutesAt.getTime() / 1000)}:F>`, true)
            .addField(`${emojis.edit} Reason`, reason, false)
            .build();

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mute_confirm')
                .setLabel('Mute User')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔇'),
            new ButtonBuilder()
                .setCustomId('mute_cancel')
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

            if (buttonInteraction.customId === 'mute_cancel') {
                const cancelEmbed = EmbedTemplates.info('Mute Cancelled', `The mute action for **${targetUser.tag}** has been cancelled.`);
                return buttonInteraction.update({ embeds: [cancelEmbed], components: [] });
            }

            await buttonInteraction.deferUpdate();

            // DM the user before muting (if not silent)
            let dmSent = false;
            if (!silent) {
                try {
                    const dmEmbed = EmbedTemplates.modDM({
                        action: 'mute',
                        guildName: interaction.guild.name,
                        guildIcon: interaction.guild.iconURL({ dynamic: true }),
                        moderator: interaction.user,
                        reason,
                        duration: formattedDuration,
                    });
                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    logger.warn(`Could not DM ${targetUser.tag} about their mute.`);
                }
            }

            // Perform the timeout
            await targetMember.timeout(duration, `Muted by ${interaction.user.tag} | ${reason}`);

            // Log to warnings database
            const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason: `${reason} (Duration: ${formattedDuration})`,
                type: 'mute',
            });

            // Create success embed
            const successEmbed = EmbedTemplates.modAction({
                action: 'mute',
                target: targetUser,
                moderator: interaction.user,
                reason,
                duration: formattedDuration,
                caseId: warning.caseId,
                dmSent,
            });

            // Log to mod log channel
            await logToModChannel(interaction.guild, successEmbed);

            await buttonInteraction.editReply({
                embeds: [successEmbed],
                components: [],
            });

            logger.info(`${interaction.user.tag} muted ${targetUser.tag} in ${interaction.guild.name} for ${formattedDuration}. Reason: ${reason}`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const timeoutEmbed = EmbedTemplates.error('Timed Out', 'Mute confirmation timed out. No action was taken.');
                return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }

            logger.error('Error during mute command:', error);
            const errorEmbed = EmbedTemplates.error('Mute Failed', 'An error occurred while trying to mute this user.');
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
