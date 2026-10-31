const { UI, PremiumEmbed, resolveColor } = require('./embedBuilder');

class V2Card extends PremiumEmbed {
    constructor() {
        super();
        this._rows = [];
    }

    setAccent(c) {
        this.color(c);
        return this;
    }

    setTitle(title, subtitle) {
        if (title) this.embed.setTitle(title);
        if (subtitle) this.embed.setDescription(subtitle);
        return this;
    }

    setDescription(d) {
        this.desc(d);
        return this;
    }

    addField(name, value, inline = false) {
        this.field(name, value, inline);
        return this;
    }

    setFooter(text, iconURL) {
        if (text) this.embed.setFooter({ text, iconURL });
        return this;
    }

    setTimestamp(date = new Date()) {
        this.embed.setTimestamp(date);
        return this;
    }

    addActionRow(row) {
        this._rows.push(row);
        return this;
    }

    toPayload() {
        return {
            embeds: [this.build()],
            components: this._rows
        };
    }

    async reply(interaction, options = {}) {
        const payload = { embeds: [this.build()], components: this._rows, ...options };
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(payload);
        }
        return await interaction.reply(payload);
    }

    async send(channel) {
        if (!channel || !channel.send) return;
        return await channel.send(this.toPayload());
    }
}

function makeTemplateResponse(embed) {
    return {
        embed,
        async reply(interaction, options = {}) {
            const payload = { embeds: [embed], ...options };
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(payload);
            }
            return await interaction.reply(payload);
        }
    };
}

const V2Templates = {
    success: (t, d) => makeTemplateResponse(UI.success(t, d)),
    error: (t, d) => makeTemplateResponse(UI.error(t, d)),
    warning: (t, d) => makeTemplateResponse(UI.warning(t, d)),
    info: (t, d) => makeTemplateResponse(UI.info(t, d)),
    modAction: (opts) => UI.mod(opts),
    modDM: (opts) => UI.modDM(opts),
};

module.exports = {
    V2Card,
    V2Templates,
    UI,
    resolveColorNumber: resolveColor,
};
