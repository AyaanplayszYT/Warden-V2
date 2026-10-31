const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');

const STICKERS_DIR = path.join(__dirname, '../emojies-stickers');

class StickerManager {
    constructor() {
        this.stickers = [];
        this.idMap = new Map();
        this.webhookCache = new Map();
        this.replacedMessageIds = new Set();
        this.load();
    }

    markReplacedMessage(messageId) {
        if (!messageId) return;
        this.replacedMessageIds.add(messageId);
        setTimeout(() => this.replacedMessageIds.delete(messageId), 10000);
    }

    isReplacedMessage(messageId) {
        return this.replacedMessageIds.has(messageId);
    }

    load() {
        this.stickers = [];
        this.idMap.clear();

        if (!fs.existsSync(STICKERS_DIR)) {
            logger.warn('emojies-stickers directory does not exist');
            return;
        }

        const files = fs.readdirSync(STICKERS_DIR);
        for (const file of files) {
            const fullPath = path.join(STICKERS_DIR, file);
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) continue;

            const ext = path.extname(file).toLowerCase();
            if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) continue;

            const baseName = path.basename(file, ext);
            let slug = baseName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
            if (!slug) slug = 'sticker_' + this.stickers.length;

            const sticker = {
                id: slug,
                name: baseName,
                filename: file,
                path: fullPath,
                ext,
                isAnimated: ext === '.gif',
                aliases: [],
            };

            // Custom handy aliases
            if (slug.includes('catrage')) sticker.aliases.push('catrage');
            if (slug.includes('tomthink')) sticker.aliases.push('tomthink');
            if (slug.includes('pepe')) sticker.aliases.push('pepe');
            if (slug.includes('epstein')) sticker.aliases.push('epstein');
            if (slug.includes('flipoff')) sticker.aliases.push('flipoff');
            if (slug === 'قدحن') sticker.aliases.push('arabic');

            this.stickers.push(sticker);
            this.idMap.set(slug, sticker);
            this.idMap.set(baseName.toLowerCase(), sticker);
            sticker.aliases.forEach(a => this.idMap.set(a.toLowerCase(), sticker));
        }

        // Sort alphabetically by ID
        this.stickers.sort((a, b) => a.id.localeCompare(b.id));
        logger.info(`Loaded ${this.stickers.length} custom stickers & emojis`);
    }

    getAll() {
        return this.stickers;
    }

    get(query) {
        if (!query) return null;
        const normalized = query.toLowerCase().trim().replace(/^[:;]+|[:;]+$/g, '');
        return this.idMap.get(normalized) ||
               this.stickers.find(s => s.id === normalized || s.name.toLowerCase() === normalized || s.aliases.includes(normalized)) ||
               null;
    }

    search(query, limit = 25) {
        if (!query) {
            return this.stickers.slice(0, limit).map(s => ({
                name: `${s.id} (${s.isAnimated ? 'GIF' : 'PNG'})`,
                value: s.id,
            }));
        }

        const q = query.toLowerCase().trim().replace(/^[:;]+|[:;]+$/g, '');
        const matched = this.stickers.filter(s =>
            s.id.includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.aliases.some(a => a.includes(q))
        );

        return matched.slice(0, limit).map(s => ({
            name: `${s.id} (${s.isAnimated ? 'GIF' : 'PNG'})`,
            value: s.id,
        }));
    }

    async getWebhook(channel, client) {
        if (!channel || !channel.guild || !channel.isTextBased() || channel.isDMBased()) return null;

        const botMember = channel.guild.members.me;
        if (!botMember || !channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageWebhooks)) {
            return null;
        }

        if (this.webhookCache.has(channel.id)) {
            const cached = this.webhookCache.get(channel.id);
            try {
                // Verify webhook is still valid
                if (cached.channelId === channel.id) return cached;
            } catch (e) {
                this.webhookCache.delete(channel.id);
            }
        }

        try {
            const webhooks = await channel.fetchWebhooks();
            let hook = webhooks.find(w => w.owner?.id === client.user.id && w.name === 'Warden Stickers');

            if (!hook) {
                hook = await channel.createWebhook({
                    name: 'Warden Stickers',
                    avatar: client.user.displayAvatarURL(),
                    reason: 'Custom Nitro-style sticker delivery',
                });
            }

            this.webhookCache.set(channel.id, hook);
            return hook;
        } catch (err) {
            logger.warn(`Could not manage webhook in #${channel.name}:`, err.message);
            return null;
        }
    }

    async sendAsUser({ channel, user, member, sticker, client, content = '' }) {
        if (!sticker || !channel) return false;

        const webhook = await this.getWebhook(channel, client);
        if (webhook) {
            try {
                await webhook.send({
                    content: content || undefined,
                    username: member?.displayName || user.username,
                    avatarURL: user.displayAvatarURL({ dynamic: true }),
                    files: [sticker.path],
                });
                return true;
            } catch (err) {
                logger.warn(`Webhook dispatch failed in #${channel.name}:`, err.message);
            }
        }

        // Fallback: send directly through channel
        try {
            await channel.send({
                content: content ? `${content}\n*(sent by ${user})*` : `*(sent by ${user})*`,
                files: [sticker.path],
            });
            return true;
        } catch (err) {
            logger.error(`Direct sticker dispatch failed in #${channel.name}:`, err);
            return false;
        }
    }
}

module.exports = new StickerManager();
