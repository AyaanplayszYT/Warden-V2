const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const colors = require('../config/colors.json');
const emojis = require('../config/emojis.json');
const { embedFooter, version } = require('../config/config.json');

/**
 * Warden Embed Builder - Creates consistent, beautiful embeds
 */
class WardenEmbed {
    constructor() {
        this.embed = new EmbedBuilder();
        this.embed.setFooter({ text: embedFooter || 'Warden Bot • Protecting Your Server' });
        this.embed.setTimestamp();
    }

    /**
     * Set embed color by type
     * @param {string} type - The type of embed (success, error, warning, info, etc.)
     */
    setType(type) {
        const color = colors[type] || colors.primary;
        this.embed.setColor(color);
        return this;
    }

    setColor(color) {
        this.embed.setColor(color);
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
        // Support both setAuthor('name') and setAuthor({ name: 'name', iconURL: 'url' })
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
        // Support both setFooter('text') and setFooter({ text: 'text', iconURL: 'url' })
        if (typeof textOrOptions === 'object' && textOrOptions !== null) {
            this.embed.setFooter(textOrOptions);
        } else {
            const footerData = { text: textOrOptions };
            if (iconURL) footerData.iconURL = iconURL;
            this.embed.setFooter(footerData);
        }
        return this;
    }

    setTimestamp(timestamp) {
        this.embed.setTimestamp(timestamp);
        return this;
    }

    build() {
        return this.embed;
    }
}

/**
 * Pre-built embed templates for common actions
 */
const EmbedTemplates = {
    /**
     * Success embed
     */
    success(title, description) {
        return new WardenEmbed()
            .setType('success')
            .setTitle(`${emojis.success} ${title}`)
            .setDescription(description)
            .build();
    },

    /**
     * Error embed
     */
    error(title, description) {
        return new WardenEmbed()
            .setType('error')
            .setTitle(`${emojis.error} ${title}`)
            .setDescription(description)
            .build();
    },

    /**
     * Warning embed
     */
    warning(title, description) {
        return new WardenEmbed()
            .setType('warning')
            .setTitle(`${emojis.warning} ${title}`)
            .setDescription(description)
            .build();
    },

    /**
     * Info embed
     */
    info(title, description) {
        return new WardenEmbed()
            .setType('info')
            .setTitle(`${emojis.info} ${title}`)
            .setDescription(description)
            .build();
    },

    /**
     * Moderation action embed (ban, kick, mute, warn)
     */
    modAction(options) {
        const {
            action, // 'ban', 'kick', 'mute', 'warn', 'unban', 'unmute'
            target, // GuildMember or User
            moderator, // User
            reason,
            duration, // optional, for mute
            caseId, // optional
            dmSent, // optional boolean
        } = options;

        const actionTitles = {
            ban: `${emojis.ban} User Banned`,
            kick: `${emojis.kick} User Kicked`,
            mute: `${emojis.mute} User Muted`,
            warn: `${emojis.warn} User Warned`,
            unban: `${emojis.unban} User Unbanned`,
            unmute: `${emojis.unmute} User Unmuted`,
            softban: `${emojis.ban} User Softbanned`,
            tempban: `${emojis.ban} User Temporarily Banned`,
        };

        const actionColors = {
            ban: 'ban',
            kick: 'kick',
            mute: 'mute',
            warn: 'warn',
            unban: 'unban',
            unmute: 'unmute',
            softban: 'ban',
            tempban: 'ban',
        };

        const embed = new WardenEmbed()
            .setType(actionColors[action] || 'modAction')
            .setTitle(actionTitles[action] || `${emojis.moderator} Moderation Action`)
            .setThumbnail(target.displayAvatarURL?.() || target.avatarURL?.() || null);

        // Add user info
        const targetTag = target.user?.tag || target.tag || 'Unknown';
        const targetId = target.user?.id || target.id || 'Unknown';
        embed.addField(`${emojis.user} Target`, `${targetTag}\n\`${targetId}\``, true);

        // Add moderator info
        if (moderator) {
            embed.addField(`${emojis.moderator} Moderator`, `${moderator.tag}\n\`${moderator.id}\``, true);
        }

        // Add duration for mute/tempban
        if (duration) {
            embed.addField(`${emojis.clock} Duration`, duration, true);
        }

        // Add reason
        embed.addField(`${emojis.edit} Reason`, reason || 'No reason provided', false);

        // Add case ID if provided
        if (caseId) {
            embed.addField(`${emojis.id} Case ID`, `#${caseId}`, true);
        }

        // Add DM status
        if (dmSent !== undefined) {
            embed.addField(`${emojis.reply} DM Sent`, dmSent ? 'Yes' : 'No', true);
        }

        return embed.build();
    },

    /**
     * User DM notification embed for moderation
     */
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
            .setTitle(`${emojis[action] || emojis.warning} ${actionMessages[action] || 'Moderation Action in'} ${guildName}`)
            .setThumbnail(guildIcon);

        if (moderator) {
            embed.addField(`${emojis.moderator} Moderator`, moderator.tag, true);
        }

        if (duration) {
            embed.addField(`${emojis.clock} Duration`, duration, true);
        }

        embed.addField(`${emojis.edit} Reason`, reason || 'No reason provided', false);

        if (appealInfo) {
            embed.addField(`${emojis.link} Appeal`, appealInfo, false);
        }

        return embed.build();
    },

    /**
     * Log embed for events
     */
    log(options) {
        const {
            type, // 'messageDelete', 'messageEdit', 'memberJoin', 'memberLeave', etc.
            title,
            description,
            fields,
            thumbnail,
            image,
        } = options;

        const embed = new WardenEmbed()
            .setType(type || 'info')
            .setTitle(title);

        if (description) embed.setDescription(description);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (fields && fields.length > 0) {
            embed.addFields(...fields);
        }

        return embed.build();
    },

    /**
     * Paginated embed data structure
     */
    pagination(pages, currentPage = 0) {
        return {
            embed: pages[currentPage],
            currentPage,
            totalPages: pages.length,
            row: new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('page_first')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('page_prev')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('page_indicator')
                    .setLabel(`${currentPage + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('page_next')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage >= pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('page_last')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= pages.length - 1)
            ),
        };
    },
};

/**
 * Confirmation dialog builder
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
            .setTitle(`${emojis.warning} ${title}`)
            .setDescription(description)
            .build();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_yes')
                .setLabel(confirmLabel)
                .setStyle(confirmStyle)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('confirm_no')
                .setLabel(cancelLabel)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        return { embed, row, timeout };
    },
};

module.exports = {
    WardenEmbed,
    EmbedTemplates,
    ConfirmationDialog,
    colors,
    emojis,
};
