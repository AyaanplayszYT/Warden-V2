const { SlashCommandBuilder } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const ignoreManager = require('../../utils/ignoreManager');
const logger = require('../../utils/logger');

const snipeCache = new Map();
const editSnipeCache = new Map();
const MAX_SNIPES = 10;

module.exports = {
    name: 'snipe',
    description: 'Retrieve recently deleted or edited messages in the channel.',
    category: 'utility',
    snipeCache,
    editSnipeCache,

    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Retrieve recently deleted or edited messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleted')
                .setDescription('View a recently deleted message')
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('Message index (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edited')
                .setDescription('View a recently edited message')
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('Message index (1 = most recent)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear cached messages for this channel')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand() || 'deleted';
        const number = interaction.options.getInteger('number') || 1;
        const channelId = interaction.channel.id;

        if (subcommand === 'clear') {
            snipeCache.delete(channelId);
            editSnipeCache.delete(channelId);

            return interaction.reply({
                embeds: [UI.success('Cache Cleared', 'Snipe history for this channel has been purged.')],
                ephemeral: true,
            });
        }

        const cache = subcommand === 'deleted' ? snipeCache : editSnipeCache;
        const channelSnipes = cache.get(channelId);

        if (!channelSnipes || channelSnipes.length === 0) {
            return interaction.reply({
                embeds: [UI.info('No Records Found', `No ${subcommand} messages cached in this channel.`)],
                ephemeral: true,
            });
        }

        const index = Math.min(number - 1, channelSnipes.length - 1);
        const snipe = channelSnipes[index];

        if (!snipe) {
            return interaction.reply({
                embeds: [UI.error('Not Found', `No cached ${subcommand} message found at index #${number}.`)],
                ephemeral: true,
            });
        }

        const embed = UI.embed()
            .color(subcommand === 'deleted' ? 'error' : 'warning')
            .title(subcommand === 'deleted' ? 'Deleted Message Record' : 'Edited Message Audit')
            .desc(`Author: **${snipe.author.tag}** (\`${snipe.author.id}\`) • Index: ${index + 1}/${channelSnipes.length}`);

        if (subcommand === 'deleted') {
            embed.field('Content', snipe.content ? snipe.content.substring(0, 1024) : '*No text content*', false);
        } else {
            embed.field('Original', snipe.oldContent ? snipe.oldContent.substring(0, 1024) : '*No text content*', false);
            embed.field('Revised', snipe.newContent ? snipe.newContent.substring(0, 1024) : '*No text content*', false);
        }

        if (snipe.attachments && snipe.attachments.length > 0) {
            const attachmentLinks = snipe.attachments.map((a, i) => `[Attachment ${i + 1}](${a})`).join('\n');
            embed.field('Attachments', attachmentLinks, false);
        }

        if (snipe.timestamp) {
            embed.field('Timestamp', `<t:${Math.floor(snipe.timestamp / 1000)}:R>`, true);
        }

        return interaction.reply({ embeds: [embed.build()] });
    },

    addDeletedMessage(channelId, message) {
        if (!channelId || !message || message.author?.bot) return;
        if (ignoreManager.isChannelIgnored(channelId) || ignoreManager.isUserIgnored(message.author.id)) return;

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
        if (ignoreManager.isChannelIgnored(channelId) || ignoreManager.isUserIgnored(oldMessage.author.id)) return;

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
