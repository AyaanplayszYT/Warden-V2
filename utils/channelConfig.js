const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CONFIG_PATH = path.join(__dirname, '../data/logChannels.json');

class ChannelConfig {
    constructor() {
        this.cache = {
            modLog: '',
            spamLog: '',
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                this.cache.modLog = data.modLog || '';
                this.cache.spamLog = data.spamLog || '';
            }
        } catch (err) {
            logger.error('Failed to load logChannels configuration:', err);
        }
    }

    getModLog() {
        return this.cache.modLog;
    }

    getSpamLog() {
        return this.cache.spamLog;
    }

    async setModLog(channelId) {
        this.cache.modLog = channelId || '';
        await this.persist();
    }

    async setSpamLog(channelId) {
        this.cache.spamLog = channelId || '';
        await this.persist();
    }

    async persist() {
        try {
            const dir = path.dirname(CONFIG_PATH);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(this.cache, null, 2), 'utf8');
        } catch (err) {
            logger.error('Failed to persist logChannels configuration:', err);
        }
    }
}

module.exports = new ChannelConfig();
