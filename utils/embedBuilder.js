const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const colors = require('../config/colors.json');
const emojis = require('../config/emojis.json');
const { embedFooter } = require('../config/config.json');
const { V2Card, V2Templates, resolveColorNumber } = require('./v2Components');

/**
 * Warden Embed Builder - Clean, high-contrast, emoji-free modern embeds
 */
class WardenEmbed {
    constructor() {
        this.embed = new EmbedBuilder();
        this.embed.setColor(resolveColorNumber(colors.primary || '#5865F2'));
        this.embed.setFooter({ text: embedFooter || 'Warden | Security & Utility' });
        this.embed.setTimestamp();
    }

    setType(type) {
        const color = resolveColorNumber(colors[type] || colors.primary);
        this.embed.setColor(color);
        return this;
    }

    setColor(color) {
        this.embed.setColor(resolveColorNumber(color));
        return this;
    }

    setTitle(title) {
        this.embed.setTitle(title);
        return this;
    }

    setDescription(description) {
        this.embed.setDescription(description);
        return this;
    }

    setThumbnail(url) {
        if (url) this.embed.setThumbnail(url);
        return this;
    }

    setImage(url) {
        if (url) this.embed.setImage(url);
        return this;
    }

    setAuthor(nameOrOptions, iconURL, url) {
        if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
            this.embed.setAuthor(nameOrOptions);
        } else {
            const authorData = { name: nameOrOptions };
            if (iconURL) authorData.iconURL = iconURL;
            if (url) authorData.url = url;
            this.embed.setAuthor(authorData);
        }
        return this;
    }

    addField(name, value, inline = false) {
        this.embed.addFields({ name, value, inline });
        return this;
    }

    addFields(...fields) {
        this.embed.addFields(...fields);
        return this;
    }

    setFooter(textOrOptions, iconURL) {
        if (typeof textOrOptions === 'object' && textOrOptions !== null) {
            this.embed.setFooter(textOrOptions);
        } else {
            const footerData = { text: textOrOptions };
            if (iconURL) footerData.iconURL = iconURL;
            this.embed.setFooter(footerData);
        }
        return this;
    }

    setTimestamp(timestamp = new Date()) {
        this.embed.setTimestamp(timestamp);
        return this;
    }

    build() {
        return this.embed;
    }

    /**
     * Converts this embed into a Discord Components V2 payload
     */
    toV2() {
        const card = new V2Card()
            .setAccent(this.embed.data.color || colors.primary);

        if (this.embed.data.title) card.setTitle(this.embed.data.title);
        if (this.embed.data.description) card.setDescription(this.embed.data.description);
        if (this.embed.data.fields) card.addFields(this.embed.data.fields);
        if (this.embed.data.footer) card.setFooter(this.embed.data.footer.text);

        return card.toV2();
    }
}

/**
 * Clean templates for embed outputs
 */
const EmbedTemplates = {
    success(title, description) {
        return new WardenEmbed()
            .setType('success')
            .setTitle(`[SUCCESS] ${title}`)
            .setDescription(description)
            .build();
    },

    error(title, description) {
        return new WardenEmbed()
            .setType('error')
            .setTitle(`[ERROR] ${title}`)
            .setDescription(description)
            .build();
    },

    warning(title, description) {
        return new WardenEmbed()
            .setType('warning')
            .setTitle(`[WARNING] ${title}`)
            .setDescription(description)
            .build();
    },

    info(title, description) {
        return new WardenEmbed()
            .setType('info')
            .setTitle(`[INFO] ${title}`)
            .setDescription(description)
            .build();
    },

    modAction(options) {
        const {
            action,
            target,
            moderator,
            reason,
            duration,
            caseId,
            dmSent,
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

        const embed = new WardenEmbed()
            .setType(action)
            .setTitle(actionTitles[action] || `[MOD ACTION] ${action.toUpperCase()}`)
            .setThumbnail(target.displayAvatarURL?.() || target.avatarURL?.() || null);

        const targetTag = target.user?.tag || target.tag || 'Unknown';
        const targetId = target.user?.id || target.id || 'Unknown';
        embed.addField('Target', `${targetTag}\n\`${targetId}\``, true);

        if (moderator) {
            embed.addField('Moderator', `${moderator.tag}\n\`${moderator.id}\``, true);
        }

        if (duration) {
            embed.addField('Duration', duration, true);
        }

        embed.addField('Reason', reason || 'No reason provided', false);

        if (caseId) {
            embed.addField('Case ID', `#${caseId}`, true);
        }

        if (dmSent !== undefined) {
            embed.addField('DM Status', dmSent ? 'Delivered' : 'Failed / Blocked', true);
        }

        return embed.build();
    },

    modDM(options) {
        const {
            action,
            guildName,
            guildIcon,
            moderator,
            reason,
            duration,
            appealInfo,
        } = options;

        const actionMessages = {
            ban: 'You have been banned from',
            kick: 'You have been kicked from',
            mute: 'You have been muted in',
            warn: 'You have been warned in',
            tempban: 'You have been temporarily banned from',
        };

        const embed = new WardenEmbed()
            .setType(action === 'warn' ? 'warn' : action === 'mute' ? 'mute' : 'ban')
            .setTitle(`[MODERATION] ${actionMessages[action] || 'Action in'} ${guildName}`)
            .setThumbnail(guildIcon);

        if (moderator) {
            embed.addField('Moderator', moderator.tag, true);
        }

        if (duration) {
            embed.addField('Duration', duration, true);
        }

        embed.addField('Reason', reason || 'No reason provided', false);

        if (appealInfo) {
            embed.addField('Appeal', appealInfo, false);
        }

        return embed.build();
    },

    log(options) {
        const {
            type,
            title,
            description,
            fields,
            thumbnail,
            image,
        } = options;

        const embed = new WardenEmbed()
            .setType(type || 'info')
            .setTitle(`[LOG] ${title}`);

        if (description) embed.setDescription(description);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (fields && fields.length > 0) {
            embed.addFields(...fields);
        }

        return embed.build();
    },

    pagination(pages, currentPage = 0) {
        return {
            embed: pages[currentPage],
            currentPage,
            totalPages: pages.length,
            row: new ActionRowBuilder().addComponents(
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
                    .setLabel(`${currentPage + 1} / ${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('page_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage >= pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('page_last')
                    .setLabel('Last')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= pages.length - 1)
            ),
        };
    },
};

/**
 * Clean confirmation dialog
 */
const ConfirmationDialog = {
    create(options) {
        const {
            title,
            description,
            confirmLabel = 'Confirm',
            cancelLabel = 'Cancel',
            confirmStyle = ButtonStyle.Danger,
            timeout = 30000,
        } = options;

        const embed = new WardenEmbed()
            .setType('warning')
            .setTitle(`[CONFIRMATION] ${title}`)
            .setDescription(description)
            .build();

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

        return { embed, row, timeout };
    },
};

module.exports = {
    WardenEmbed,
    EmbedTemplates,
    ConfirmationDialog,
    V2Card,
    V2Templates,
    colors,
    emojis,
};
