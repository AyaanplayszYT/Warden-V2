const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ComponentType,
} = require('discord.js');

const colors = require('../config/colors.json');
const { embedFooter } = require('../config/config.json');

/**
 * Resolves any color string or hex number into a numeric integer for Discord V2 Container accent colors.
 */
function resolveColorNumber(color) {
    if (typeof color === 'number') return color;
    if (!color) return 0x5865F2; // Default blurple
    if (colors[color]) {
        color = colors[color];
    }
    if (typeof color === 'string') {
        const cleaned = color.replace('#', '');
        const parsed = parseInt(cleaned, 16);
        return isNaN(parsed) ? 0x5865F2 : parsed;
    }
    return 0x5865F2;
}

/**
 * Insanely sleek Discord Components V2 Card Builder
 * Represents a complete modular card structured using Discord's V2 Layout Tree:
 * Container (accent color) -> TextDisplays + Separators + ActionRows
 */
class V2Card {
    constructor() {
        this.accentColor = resolveColorNumber(colors.primary || '#5865F2');
        this.titleText = '';
        this.subtitleText = '';
        this.textBlocks = [];
        this.fields = [];
        this.actionRows = [];
        this.footerText = embedFooter || 'Warden | Security & Utility System';
        this.timestamp = null;
    }

    /**
     * Set the container accent color
     * @param {string|number} color
     */
    setAccent(color) {
        this.accentColor = resolveColorNumber(color);
        return this;
    }

    setColor(color) {
        return this.setAccent(color);
    }

    setType(type) {
        return this.setAccent(colors[type] || colors.primary);
    }

    /**
     * Set card title and optional sub-headline
     */
    setTitle(title, subtitle = null) {
        this.titleText = title || '';
        if (subtitle) this.subtitleText = subtitle;
        return this;
    }

    setDescription(description) {
        if (description) {
            this.textBlocks.push(description);
        }
        return this;
    }

    addText(text) {
        if (text) {
            this.textBlocks.push(text);
        }
        return this;
    }

    addField(name, value, inline = false) {
        if (name && value !== undefined && value !== null) {
            this.fields.push({ name: String(name), value: String(value), inline: Boolean(inline) });
        }
        return this;
    }

    addFields(...fields) {
        const flat = fields.flat(Infinity);
        for (const f of flat) {
            if (f && f.name && f.value !== undefined) {
                this.fields.push({ name: String(f.name), value: String(f.value), inline: Boolean(f.inline) });
            }
        }
        return this;
    }

    addActionRow(row) {
        if (row) {
            this.actionRows.push(row);
        }
        return this;
    }

    addButton(options) {
        const btn = new ButtonBuilder()
            .setCustomId(options.customId || options.id)
            .setLabel(options.label || 'Action')
            .setStyle(options.style || ButtonStyle.Secondary);
        if (options.disabled !== undefined) btn.setDisabled(options.disabled);
        if (options.url) btn.setURL(options.url);

        const row = new ActionRowBuilder().addComponents(btn);
        this.actionRows.push(row);
        return this;
    }

    setFooter(text, timestamp = null) {
        if (text) this.footerText = text;
        if (timestamp) this.timestamp = timestamp;
        return this;
    }

    setTimestamp(date = new Date()) {
        this.timestamp = date;
        return this;
    }

    /**
     * Build the Discord Components V2 Container
     * @returns {ContainerBuilder}
     */
    buildContainer() {
        const container = new ContainerBuilder().setAccentColor(this.accentColor);

        // Header section
        let headerContent = '';
        if (this.titleText) {
            headerContent += `# ${this.titleText}\n`;
        }
        if (this.subtitleText) {
            headerContent += `> ${this.subtitleText}\n`;
        }

        if (headerContent) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(headerContent.trim())
            );
            container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );
        }

        // Main text content
        if (this.textBlocks.length > 0) {
            const bodyContent = this.textBlocks.join('\n\n');
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(bodyContent)
            );
        }

        // Fields formatted cleanly in high-density monospace / markdown grid
        if (this.fields.length > 0) {
            if (this.textBlocks.length > 0) {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
                );
            }

            let fieldsContent = '';
            for (const field of this.fields) {
                fieldsContent += `**${field.name}**\n${field.value}\n\n`;
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(fieldsContent.trim())
            );
        }

        // Footer subtext
        let footerContent = '';
        if (this.footerText) {
            footerContent += `-# ${this.footerText}`;
        }
        if (this.timestamp) {
            const ts = Math.floor(new Date(this.timestamp).getTime() / 1000);
            footerContent += ` • <t:${ts}:R>`;
        }

        if (footerContent) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(footerContent)
            );
        }

        // Integrated Action Rows inside the container
        for (const row of this.actionRows) {
            container.addActionRowComponents(row);
        }

        return container;
    }

    /**
     * Generate the complete Discord Components V2 message payload
     */
    toV2() {
        const container = this.buildContainer();
        return {
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        };
    }

    /**
     * Generate a matching clean, emoji-free Discord Embed (for fallback or embed-only contexts)
     */
    toEmbed() {
        const embed = new EmbedBuilder()
            .setColor(this.accentColor);

        if (this.titleText) embed.setTitle(this.titleText);
        
        let desc = '';
        if (this.subtitleText) desc += `> ${this.subtitleText}\n\n`;
        if (this.textBlocks.length > 0) desc += this.textBlocks.join('\n\n');
        if (desc.trim()) embed.setDescription(desc.trim());

        for (const field of this.fields) {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline });
        }

        if (this.footerText) {
            embed.setFooter({ text: this.footerText });
        }

        if (this.timestamp) {
            embed.setTimestamp(new Date(this.timestamp));
        }

        return {
            embeds: [embed],
            components: this.actionRows
        };
    }

    /**
     * Primary payload generator: Returns the Discord Components V2 payload
     */
    toPayload() {
        return this.toV2();
    }

    /**
     * Safe reply to interaction with automatic fallback
     */
    async reply(interaction, options = {}) {
        const v2Payload = { ...this.toV2(), ...options };
        try {
            return await interaction.reply(v2Payload);
        } catch (err) {
            const embedPayload = { ...this.toEmbed(), ...options };
            return await interaction.reply(embedPayload);
        }
    }

    /**
     * Safe editReply with automatic fallback
     */
    async editReply(interaction, options = {}) {
        const v2Payload = { ...this.toV2(), ...options };
        try {
            return await interaction.editReply(v2Payload);
        } catch (err) {
            const embedPayload = { ...this.toEmbed(), ...options };
            return await interaction.editReply(embedPayload);
        }
    }

    /**
     * Safe update for component interactions (buttons/select menus)
     */
    async update(interaction, options = {}) {
        const v2Payload = { ...this.toV2(), ...options };
        try {
            return await interaction.update(v2Payload);
        } catch (err) {
            const embedPayload = { ...this.toEmbed(), ...options };
            return await interaction.update(embedPayload);
        }
    }

    /**
     * Safe followUp with automatic fallback
     */
    async followUp(interaction, options = {}) {
        const v2Payload = { ...this.toV2(), ...options };
        try {
            return await interaction.followUp(v2Payload);
        } catch (err) {
            const embedPayload = { ...this.toEmbed(), ...options };
            return await interaction.followUp(embedPayload);
        }
    }

    /**
     * Safe send to channel / user with automatic fallback
     */
    async send(target, options = {}) {
        const v2Payload = { ...this.toV2(), ...options };
        try {
            return await target.send(v2Payload);
        } catch (err) {
            const embedPayload = { ...this.toEmbed(), ...options };
            return await target.send(embedPayload);
        }
    }
}

/**
 * Pre-built Insanely Good V2 Component Templates (100% Emoji-Free, Pure Precision Layout)
 */
const V2Templates = {
    /**
     * Success card
     */
    success(title, description, fields = []) {
        const card = new V2Card()
            .setAccent(colors.success || '#57F287')
            .setTitle(`[SUCCESS] ${title}`)
            .setDescription(description);

        if (fields.length > 0) card.addFields(fields);
        return card;
    },

    /**
     * Error card
     */
    error(title, description, fields = []) {
        const card = new V2Card()
            .setAccent(colors.error || '#ED4245')
            .setTitle(`[ERROR] ${title}`)
            .setDescription(description);

        if (fields.length > 0) card.addFields(fields);
        return card;
    },

    /**
     * Warning card
     */
    warning(title, description, fields = []) {
        const card = new V2Card()
            .setAccent(colors.warning || '#FEE75C')
            .setTitle(`[WARNING] ${title}`)
            .setDescription(description);

        if (fields.length > 0) card.addFields(fields);
        return card;
    },

    /**
     * Information card
     */
    info(title, description, fields = []) {
        const card = new V2Card()
            .setAccent(colors.info || colors.primary || '#5865F2')
            .setTitle(`[INFO] ${title}`)
            .setDescription(description);

        if (fields.length > 0) card.addFields(fields);
        return card;
    },

    /**
     * Moderation action audit card
     */
    modAction(options) {
        const {
            action, // 'ban', 'kick', 'mute', 'warn', 'unban', 'unmute', 'softban'
            target, // GuildMember or User
            moderator, // User
            reason,
            duration,
            caseId,
            dmSent,
            extraFields = [],
        } = options;

        const actionTitles = {
            ban: '[BANNED] User Banned',
            kick: '[KICKED] User Kicked',
            mute: '[MUTED] User Timed Out',
            warn: '[WARNED] User Warned',
            unban: '[UNBANNED] User Ban Revoked',
            unmute: '[UNMUTED] User Timeout Removed',
            softban: '[SOFTBANNED] User Softbanned',
            tempban: '[TEMPBANNED] User Temporarily Banned',
        };

        const actionColors = {
            ban: colors.ban || '#ED4245',
            kick: colors.kick || '#F27A3A',
            mute: colors.mute || '#FEE75C',
            warn: colors.warn || '#FEE75C',
            unban: colors.unban || '#57F287',
            unmute: colors.unmute || '#57F287',
            softban: colors.ban || '#ED4245',
            tempban: colors.ban || '#ED4245',
        };

        const targetTag = target.user?.tag || target.tag || 'Unknown';
        const targetId = target.user?.id || target.id || 'Unknown';
        const modTag = moderator ? (moderator.tag || 'Unknown') : 'System';
        const modId = moderator ? (moderator.id || 'Unknown') : 'System';

        const card = new V2Card()
            .setAccent(actionColors[action] || colors.modAction || '#9B59B6')
            .setTitle(actionTitles[action] || `[MOD ACTION] ${action.toUpperCase()}`)
            .setDescription(`A moderation enforcement action has been recorded in the guild log.`);

        if (caseId) {
            card.addField('Case ID', `#${caseId}`, true);
        }

        card.addField('Target', `${targetTag} (\`${targetId}\`)`, true);
        card.addField('Moderator', `${modTag} (\`${modId}\`)`, true);

        if (duration) {
            card.addField('Duration', duration, true);
        }

        card.addField('Reason', reason || 'No reason provided', false);

        if (dmSent !== undefined) {
            card.addField('Direct Message Notification', dmSent ? 'Delivered' : 'Failed / Blocked', true);
        }

        if (extraFields.length > 0) {
            card.addFields(extraFields);
        }

        card.setTimestamp(new Date());
        return card;
    },

    /**
     * User DM notification for moderation actions
     */
    modDM(options) {
        const {
            action,
            guildName,
            moderator,
            reason,
            duration,
            appealInfo,
        } = options;

        const actionMessages = {
            ban: 'You have been permanently banned from',
            kick: 'You have been kicked from',
            mute: 'You have been temporarily timed out in',
            warn: 'You have received an official warning in',
            tempban: 'You have been temporarily banned from',
        };

        const actionColors = {
            ban: colors.ban || '#ED4245',
            kick: colors.kick || '#F27A3A',
            mute: colors.mute || '#FEE75C',
            warn: colors.warn || '#FEE75C',
        };

        const card = new V2Card()
            .setAccent(actionColors[action] || colors.primary)
            .setTitle(`[MODERATION NOTICE] ${guildName}`)
            .setDescription(`${actionMessages[action] || 'A moderation action was applied in'} **${guildName}**.`);

        if (moderator) {
            card.addField('Issuing Moderator', moderator.tag, true);
        }

        if (duration) {
            card.addField('Duration', duration, true);
        }

        card.addField('Reason', reason || 'No reason provided', false);

        if (appealInfo) {
            card.addField('Appeal Instructions', appealInfo, false);
        }

        card.setTimestamp(new Date());
        return card;
    },

    /**
     * Interactive confirmation dialog
     */
    confirmation(options) {
        const {
            title,
            description,
            fields = [],
            confirmLabel = 'Confirm Action',
            cancelLabel = 'Cancel',
            confirmStyle = ButtonStyle.Danger,
        } = options;

        const card = new V2Card()
            .setAccent(colors.warning || '#FEE75C')
            .setTitle(`[CONFIRMATION REQUIRED] ${title}`)
            .setDescription(description);

        if (fields.length > 0) {
            card.addFields(fields);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_yes')
                .setLabel(confirmLabel)
                .setStyle(confirmStyle),
            new ButtonBuilder()
                .setCustomId('confirm_no')
                .setLabel(cancelLabel)
                .setStyle(ButtonStyle.Secondary)
        );

        card.addActionRow(row);
        return { card, row };
    },

    /**
     * Paginated navigation card
     */
    pagination(pages, currentPage = 0) {
        const totalPages = pages.length;
        const pageCard = pages[currentPage];

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('page_first')
                .setLabel('First')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`Page ${currentPage + 1} of ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('page_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('page_last')
                .setLabel('Last')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );

        return {
            card: pageCard,
            row,
            currentPage,
            totalPages,
        };
    },

    /**
     * Sleek server audit log card
     */
    log(options) {
        const {
            type,
            title,
            description,
            fields = [],
            user,
            channel,
            timestamp = new Date(),
        } = options;

        const logColors = {
            messageDelete: colors.messageDelete || '#ED4245',
            messageEdit: colors.messageEdit || '#F27A3A',
            memberJoin: colors.memberJoin || '#57F287',
            memberLeave: colors.memberLeave || '#ED4245',
            channelCreate: colors.channelCreate || '#57F287',
            channelDelete: colors.channelDelete || '#ED4245',
            channelUpdate: colors.channelUpdate || '#FEE75C',
            roleCreate: colors.roleCreate || '#57F287',
            roleDelete: colors.roleDelete || '#ED4245',
            roleUpdate: colors.roleUpdate || '#FEE75C',
        };

        const card = new V2Card()
            .setAccent(logColors[type] || colors.info || '#5865F2')
            .setTitle(`[AUDIT LOG] ${title}`)
            .setDescription(description || '');

        if (user) {
            const userTag = user.tag || user.user?.tag || 'Unknown';
            const userId = user.id || user.user?.id || 'Unknown';
            card.addField('User', `${userTag} (\`${userId}\`)`, true);
        }

        if (channel) {
            const chanName = channel.name || 'Unknown';
            const chanId = channel.id || 'Unknown';
            card.addField('Channel', `#${chanName} (\`${chanId}\`)`, true);
        }

        if (fields.length > 0) {
            card.addFields(fields);
        }

        card.setTimestamp(timestamp);
        return card;
    }
};

module.exports = {
    V2Card,
    V2Templates,
    resolveColorNumber,
};

