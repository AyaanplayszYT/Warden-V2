const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { EmbedTemplates, WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'purge',
        description: 'Bulk delete messages with optional filters.',
        options: [
            {
                name: 'amount',
                description: 'Number of messages to delete (1-100)',
                type: 4, // INTEGER
                required: true,
                min_value: 1,
                max_value: 100,
            },
            {
                name: 'user',
                description: 'Only delete messages from this user',
                type: 6, // USER
                required: false,
            },
            {
                name: 'contains',
                description: 'Only delete messages containing this text',
                type: 3, // STRING
                required: false,
            },
            {
                name: 'bots',
                description: 'Only delete messages from bots',
                type: 5, // BOOLEAN
                required: false,
            },
            {
                name: 'attachments',
                description: 'Only delete messages with attachments',
                type: 5, // BOOLEAN
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageMessages,
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const containsText = interaction.options.getString('contains');
        const botsOnly = interaction.options.getBoolean('bots');
        const attachmentsOnly = interaction.options.getBoolean('attachments');

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Permission Denied', 'You need the **Manage Messages** permission to use this command.')],
            });
        }

        try {
            // Fetch messages (need to fetch more to account for filters)
            const fetchAmount = Math.min(amount * 2, 100);
            const messages = await interaction.channel.messages.fetch({ limit: fetchAmount });

            // Apply filters
            let filteredMessages = [...messages.values()];

            if (targetUser) {
                filteredMessages = filteredMessages.filter(m => m.author.id === targetUser.id);
            }

            if (containsText) {
                filteredMessages = filteredMessages.filter(m => 
                    m.content.toLowerCase().includes(containsText.toLowerCase())
                );
            }

            if (botsOnly) {
                filteredMessages = filteredMessages.filter(m => m.author.bot);
            }

            if (attachmentsOnly) {
                filteredMessages = filteredMessages.filter(m => m.attachments.size > 0);
            }

            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            filteredMessages = filteredMessages.filter(m => m.createdTimestamp > twoWeeksAgo);

            // Limit to requested amount
            filteredMessages = filteredMessages.slice(0, amount);

            if (filteredMessages.length === 0) {
                return interaction.editReply({
                    embeds: [EmbedTemplates.warning('No Messages', 'No messages matching your criteria were found.')],
                });
            }

            // Log messages before deleting
            const logPath = path.join(__dirname, '../../data/purgeLogs.txt');
            let logText = `\n--- Purge by ${interaction.user.tag} (${interaction.user.id}) in #${interaction.channel.name} (${interaction.channel.id}) at ${new Date().toISOString()} ---\n`;
            
            for (const msg of filteredMessages) {
                logText += `[${msg.createdAt.toISOString()}] ${msg.author?.tag || 'Unknown'} (${msg.author?.id || 'Unknown'}): ${msg.content || '[no text]'}\n`;
                if (msg.attachments.size > 0) {
                    msg.attachments.forEach(att => {
                        logText += `  Attachment: ${att.url}\n`;
                    });
                }
            }
            fs.appendFileSync(logPath, logText);

            // Bulk delete messages
            const deleted = await interaction.channel.bulkDelete(filteredMessages, true);

            // Create filter description
            const filters = [];
            if (targetUser) filters.push(`From: ${targetUser.tag}`);
            if (containsText) filters.push(`Contains: "${containsText}"`);
            if (botsOnly) filters.push('Bots only');
            if (attachmentsOnly) filters.push('With attachments');

            const embed = new WardenEmbed()
                .setType('success')
                .setTitle(`${emojis.purge} Messages Purged`)
                .addField(`${emojis.delete} Deleted`, `**${deleted.size}** message(s)`, true)
                .addField(`${emojis.channel} Channel`, `${interaction.channel}`, true)
                .addField(`${emojis.moderator} Moderator`, interaction.user.tag, true)
                .build();

            if (filters.length > 0) {
                embed.addFields({ name: `${emojis.search} Filters Applied`, value: filters.join('\n'), inline: false });
            }

            // Send ephemeral reply
            await interaction.editReply({ embeds: [embed] });

            // Log to spam log channel
            try {
                const logChannels = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/logChannels.json'), 'utf8'));
                if (logChannels.spamLog) {
                    const spamLogChannel = interaction.guild.channels.cache.get(logChannels.spamLog);
                    if (spamLogChannel) {
                        const logEmbed = new WardenEmbed()
                            .setType('warning')
                            .setTitle(`${emojis.purge} Messages Purged`)
                            .addField(`${emojis.moderator} Moderator`, `${interaction.user.tag} (${interaction.user.id})`, false)
                            .addField(`${emojis.channel} Channel`, `${interaction.channel} (${interaction.channel.id})`, false)
                            .addField(`${emojis.delete} Count`, `**${deleted.size}** messages deleted`, false)
                            .build();

                        if (filters.length > 0) {
                            logEmbed.addFields({ name: `${emojis.search} Filters`, value: filters.join('\n'), inline: false });
                        }

                        await spamLogChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (e) {}

            logger.info(`${interaction.user.tag} purged ${deleted.size} messages in #${interaction.channel.name}`);

        } catch (error) {
            logger.error('Error during purge command:', error);
            return interaction.editReply({
                embeds: [EmbedTemplates.error('Purge Failed', `An error occurred: ${error.message}`)],
            });
        }
    },
};
