const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

const snipeCache = new Map();
const editSnipeCache = new Map();
const MAX_SNIPES = 10;

module.exports = {
    name: 'snipe',
    description: 'Retrieve recently deleted or edited messages in the channel.',
    usage: 'snipe [deleted|edited|clear]',
    category: 'utility',
    snipeCache,
    editSnipeCache,
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Retrieve recently deleted or edited messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleted')
                .setDescription('Snipe a deleted message')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Index of deleted message to view (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edited')
                .setDescription('Snipe an edited message')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Index of edited message to view (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear cached snipes for this channel')
        ),

    async execute(interaction) {
        const subcommand = interaction.options?.getSubcommand() || 'deleted';
        const number = interaction.options?.getInteger('number') || 1;
        const channelId = interaction.channel.id;

        if (subcommand === 'clear') {
            snipeCache.delete(channelId);
            editSnipeCache.delete(channelId);

            return V2Templates.success(
                'Cache Purged',
                'Snipe history for this channel has been cleared.'
            ).reply(interaction, { ephemeral: true });
        }

        const cache = subcommand === 'deleted' ? snipeCache : editSnipeCache;
        const channelSnipes = cache.get(channelId);

        if (!channelSnipes || channelSnipes.length === 0) {
            return V2Templates.warning(
                'No Messages Cached',
                `No ${subcommand} messages found in this channel's memory cache.`
            ).reply(interaction, { ephemeral: true });
        }

        const index = Math.min(number - 1, channelSnipes.length - 1);
        const snipe = channelSnipes[index];

        if (!snipe) {
            return V2Templates.error(
                'Record Not Found',
                `No cached ${subcommand} message found at index #${number}.`
            ).reply(interaction, { ephemeral: true });
        }

        const card = new V2Card()
            .setAccent(subcommand === 'deleted' ? 'error' : 'warning')
            .setTitle(
                subcommand === 'deleted' ? '[SNIPE] Deleted Message Record' : '[SNIPE] Edited Message Audit',
                `Author: ${snipe.author.tag} (\`${snipe.author.id}\`) • Record #${index + 1} of ${channelSnipes.length}`
            );

        if (subcommand === 'deleted') {
            card.addField('Message Content', snipe.content || '*No text content*', false);
        } else {
            card.addField('Original Content (Before)', snipe.oldContent?.substring(0, 1024) || '*No text content*', false);
            card.addField('Revised Content (After)', snipe.newContent?.substring(0, 1024) || '*No text content*', false);
        }

        if (snipe.attachments?.length > 0) {
            const attachmentLinks = snipe.attachments.map((a, i) => `[Attachment ${i + 1}](${a})`).join('\n');
            card.addField('Attached Files', attachmentLinks, false);
        }

        if (snipe.timestamp) {
            card.addField('Recorded Timestamp', `<t:${Math.floor(snipe.timestamp / 1000)}:R>`, true);
        }

        card.setFooter(`Snipe Cache • Channel: #${interaction.channel.name}`);
        return card.reply(interaction);
    },

    addDeletedMessage(channelId, message) {
        if (!channelId || !message || message.author?.bot) return;

        let channelSnipes = snipeCache.get(channelId) || [];
        const attachments = message.attachments ? Array.from(message.attachments.values()).map(a => a.url) : [];

        channelSnipes.unshift({
            content: message.content,
            author: {
                id: message.author.id,
                tag: message.author.tag,
                displayAvatarURL: () => message.author.displayAvatarURL({ dynamic: true }),
            },
            attachments,
            timestamp: Date.now(),
        });

        if (channelSnipes.length > MAX_SNIPES) {
            channelSnipes = channelSnipes.slice(0, MAX_SNIPES);
        }
        snipeCache.set(channelId, channelSnipes);
    },

    addEditedMessage(channelId, oldMessage, newMessage) {
        if (!channelId || !oldMessage || !newMessage || oldMessage.author?.bot) return;

        let channelSnipes = editSnipeCache.get(channelId) || [];
        const attachments = newMessage.attachments ? Array.from(newMessage.attachments.values()).map(a => a.url) : [];

        channelSnipes.unshift({
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            author: {
                id: oldMessage.author.id,
                tag: oldMessage.author.tag,
                displayAvatarURL: () => oldMessage.author.displayAvatarURL({ dynamic: true }),
            },
            attachments,
            timestamp: Date.now(),
        });

        if (channelSnipes.length > MAX_SNIPES) {
            channelSnipes = channelSnipes.slice(0, MAX_SNIPES);
        }
        editSnipeCache.set(channelId, channelSnipes);
    },
};
