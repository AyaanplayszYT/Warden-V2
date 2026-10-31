const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const colors = require('../config/colors.json');
const { embedFooter } = require('../config/config.json');

function resolveColor(c) {
    if (typeof c === 'number') return c;
    if (colors[c]) c = colors[c];
    if (typeof c === 'string') {
        const parsed = parseInt(c.replace('#', ''), 16);
        return isNaN(parsed) ? 0x2B2D31 : parsed;
    }
    return 0x2B2D31;
}

/**
 * Premium Minimal Embed Builder
 */
class PremiumEmbed {
    constructor() {
        this.embed = new EmbedBuilder()
            .setColor(resolveColor('primary'))
            .setFooter({ text: embedFooter || 'Warden' })
            .setTimestamp();
    }

    color(c) {
        this.embed.setColor(resolveColor(c));
        return this;
    }

    title(t) {
        if (t) this.embed.setTitle(t);
        return this;
    }

    desc(d) {
        if (d) this.embed.setDescription(d);
        return this;
    }

    field(name, value, inline = false) {
        if (name && value !== undefined && value !== null) {
            this.embed.addFields({ name: String(name), value: String(value), inline: Boolean(inline) });
        }
        return this;
    }

    thumbnail(url) {
        if (url) this.embed.setThumbnail(url);
        return this;
    }

    image(url) {
        if (url) this.embed.setImage(url);
        return this;
    }

    footer(text) {
        if (text) this.embed.setFooter({ text });
        return this;
    }

    build() {
        return this.embed;
    }

    toPayload(components = []) {
        const comp = Array.isArray(components) ? components : [components];
        return {
            embeds: [this.embed],
            components: comp.filter(Boolean)
        };
    }
}

/**
 * Quick templates for minimal, premium responses
 */
const UI = {
    embed() {
        return new PremiumEmbed();
    },

    success(title, description) {
        return new PremiumEmbed()
            .color('success')
            .title(title)
            .desc(description)
            .build();
    },

    error(title, description) {
        return new PremiumEmbed()
            .color('error')
            .title(title)
            .desc(description)
            .build();
    },

    warning(title, description) {
        return new PremiumEmbed()
            .color('warning')
            .title(title)
            .desc(description)
            .build();
    },

    info(title, description) {
        return new PremiumEmbed()
            .color('info')
            .title(title)
            .desc(description)
            .build();
    },

    mod(options) {
        const { action, target, moderator, reason, duration, caseId, extra } = options;
        const colorMap = {
            ban: 'error',
            kick: 'error',
            mute: 'warning',
            warn: 'warning',
            unban: 'success',
            unmute: 'success',
            softban: 'error',
        };
        const titleMap = {
            ban: 'User Banned',
            kick: 'User Kicked',
            mute: 'User Timed Out',
            warn: 'Warning Issued',
            unban: 'Ban Revoked',
            unmute: 'Timeout Removed',
            softban: 'User Softbanned',
        };

        const targetTag = target?.user?.tag || target?.tag || 'Unknown';
        const targetId = target?.user?.id || target?.id || 'Unknown';
        const modTag = moderator ? (moderator.tag || 'System') : 'System';

        let desc = `**Target** • ${targetTag} (\`${targetId}\`)\n**Moderator** • ${modTag}\n**Reason** • ${reason || 'No reason provided'}`;
        if (duration) desc += `\n**Duration** • ${duration}`;
        if (extra) desc += `\n${extra}`;

        const embed = new PremiumEmbed()
            .color(colorMap[action] || 'primary')
            .title(titleMap[action] || 'Moderation Action')
            .desc(desc);

        if (caseId) {
            embed.footer(`Case #${caseId} • ${embedFooter || 'Warden'}`);
        }

        return embed.build();
    },

    modDM(options) {
        const { action, guildName, reason, duration } = options;
        const titleMap = {
            ban: 'Banned from',
            kick: 'Kicked from',
            mute: 'Timed out in',
            warn: 'Warning received in',
            softban: 'Softbanned from',
        };

        let desc = `You were subject to a moderation action in **${guildName}**.\n**Action** • ${titleMap[action] || 'Notice'} ${guildName}\n**Reason** • ${reason || 'No reason provided'}`;
        if (duration) desc += `\n**Duration** • ${duration}`;

        return new PremiumEmbed()
            .color('warning')
            .title(`Moderation Notice • ${guildName}`)
            .desc(desc)
            .build();
    }
};

// Aliases for compatibility
const EmbedTemplates = UI;
const WardenEmbed = PremiumEmbed;

module.exports = {
    UI,
    PremiumEmbed,
    EmbedTemplates,
    WardenEmbed,
    resolveColor,
    colors,
};
