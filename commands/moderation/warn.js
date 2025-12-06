const { PermissionFlagsBits } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const warningsDB = require('../../utils/warningsDB');
const logger = require('../../utils/logger');
const { maxWarnings } = require('../../config/config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'warn',
        description: 'Warn a user for rule violations.',
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
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

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
                embeds: [EmbedTemplates.error('Invalid Target', 'You cannot warn yourself!')],
            });
        }

        if (targetUser.bot) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Invalid Target', 'You cannot warn bots!')],
            });
        }

        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Role Hierarchy', 'You cannot warn a user with an equal or higher role than you.')],
            });
        }

        // Add warning to database
        const warning = warningsDB.add(interaction.guild.id, targetUser.id, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            type: 'warn',
        });

        // Get total warnings for this user
        const totalWarnings = warningsDB.count(interaction.guild.id, targetUser.id);
        const maxWarns = maxWarnings || 5;

        // DM the user (if not silent)
        let dmSent = false;
        if (!silent) {
            try {
                const dmEmbed = EmbedTemplates.modDM({
                    action: 'warn',
                    guildName: interaction.guild.name,
                    guildIcon: interaction.guild.iconURL({ dynamic: true }),
                    moderator: interaction.user,
                    reason,
                });
                
                // Add warning count to DM
                dmEmbed.fields.push({
                    name: `${emojis.warning} Warning Count`,
                    value: `You now have **${totalWarnings}/${maxWarns}** warnings in this server.`,
                    inline: false,
                });

                if (totalWarnings >= maxWarns) {
                    dmEmbed.fields.push({
                        name: `${emojis.error} Maximum Warnings Reached`,
                        value: 'You may face additional consequences if you continue to violate the rules.',
                        inline: false,
                    });
                }

                await targetUser.send({ embeds: [dmEmbed] });
                dmSent = true;
            } catch (error) {
                logger.warn(`Could not DM ${targetUser.tag} about their warning.`);
            }
        }

        // Create success embed
        const successEmbed = EmbedTemplates.modAction({
            action: 'warn',
            target: targetUser,
            moderator: interaction.user,
            reason,
            caseId: warning.caseId,
            dmSent,
        });

        // Add warning count field
        successEmbed.fields.push({
            name: `${emojis.stats} Total Warnings`,
            value: `**${totalWarnings}/${maxWarns}**`,
            inline: true,
        });

        // Check if auto-action should be taken
        let autoAction = null;
        if (totalWarnings >= maxWarns) {
            // Auto-mute for 1 hour when max warnings reached
            try {
                if (targetMember.moderatable) {
                    await targetMember.timeout(60 * 60 * 1000, `Auto-mute: Reached ${maxWarns} warnings`);
                    autoAction = `User has been automatically muted for 1 hour for reaching ${maxWarns} warnings.`;
                    
                    warningsDB.add(interaction.guild.id, targetUser.id, {
                        moderatorId: interaction.client.user.id,
                        moderatorTag: interaction.client.user.tag,
                        reason: `Auto-mute: Reached ${maxWarns} warnings`,
                        type: 'mute',
                    });
                }
            } catch (error) {
                logger.error('Failed to auto-mute user:', error);
            }
        }

        if (autoAction) {
            successEmbed.fields.push({
                name: `${emojis.timeout} Auto-Action`,
                value: autoAction,
                inline: false,
            });
        }

        // Log to mod log channel
        await logToModChannel(interaction.guild, successEmbed);

        await interaction.editReply({
            embeds: [successEmbed],
        });

        logger.info(`${interaction.user.tag} warned ${targetUser.tag} in ${interaction.guild.name}. Reason: ${reason}. Total warnings: ${totalWarnings}`);
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
