const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const STICKERS_DIR = path.join(__dirname, '../emojies-stickers');

class StickerManager {
    constructor() {
        this.stickers = [];
        this.idMap = new Map();
        this.load();
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

        this.stickers.sort((a, b) => a.id.localeCompare(b.id));
        logger.info(`Loaded ${this.stickers.length} custom stickers & emojis (no-webhook native engine)`);
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
}

module.exports = new StickerManager();
