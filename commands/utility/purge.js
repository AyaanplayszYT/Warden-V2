const { PermissionFlagsBits } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'purge',
        description: 'Bulk delete messages from the current channel with advanced filters.',
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
                description: 'Filter deletions to messages sent by a specific user',
                type: 6, // USER
                required: false,
            },
            {
                name: 'bots_only',
                description: 'Only delete messages authored by bot applications',
                type: 5, // BOOLEAN
                required: false,
            },
            {
                name: 'contains',
                description: 'Only delete messages matching a specific text substring',
                type: 3, // STRING
                required: false,
            },
        ],
        default_member_permissions: PermissionFlagsBits.ManageMessages,
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const botsOnly = interaction.options.getBoolean('bots_only') || false;
        const contains = interaction.options.getString('contains');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return V2Templates.error(
                'Permission Denied',
                'You lack the required `Manage Messages` permission to execute this command.'
            ).editReply(interaction);
        }

        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });

        const now = Date.now();
        const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

        let filtered = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

        if (targetUser) {
            filtered = filtered.filter(m => m.author.id === targetUser.id);
        }

        if (botsOnly) {
            filtered = filtered.filter(m => m.author.bot);
        }

        if (contains) {
            filtered = filtered.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));
        }

        const toDelete = Array.from(filtered.values()).slice(0, amount);

        if (toDelete.length === 0) {
            return V2Templates.warning(
                'No Eligible Messages',
                'No messages matched your specified criteria, or all matching messages are older than 14 days (Discord bulk delete limit).'
            ).editReply(interaction);
        }

        try {
            const deleted = await channel.bulkDelete(toDelete, true);
            const deletedCount = deleted.size;

            // Log to purgeLogs.txt
            const logEntry = `[${new Date().toISOString()}] ${interaction.user.tag} purged ${deletedCount} message(s) in #${channel.name}\n`;
            try {
                fs.appendFileSync(path.join(__dirname, '../../data/purgeLogs.txt'), logEntry);
            } catch (err) {
                logger.error('Failed to write to purge logs file:', err);
            }

            const card = new V2Card()
                .setAccent('success')
                .setTitle('[PURGE OPERATION COMPLETE] Messages Removed')
                .setDescription(`Successfully purged **${deletedCount}** message(s) from <#${channel.id}>.`)
                .addField('Executing Operator', `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField('Target Filter', targetUser ? targetUser.tag : 'All Users', true)
                .addField('Bot Filter', botsOnly ? 'Bots Only' : 'Disabled', true)
                .setTimestamp(new Date());

            await card.editReply(interaction);

            // Forward to mod log channel
            await logToModChannel(interaction.guild, card);

            logger.info(`${interaction.user.tag} purged ${deletedCount} messages in #${channel.name}`);

        } catch (error) {
            logger.error('Error during purge command execution:', error);
            return V2Templates.error(
                'Execution Failure',
                'An error occurred while attempting to bulk delete messages.'
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
