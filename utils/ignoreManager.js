const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const IGNORE_FILE = path.join(__dirname, '../data/ignored.json');

class IgnoreManager {
    constructor() {
        this.ignoredChannels = new Set();
        this.ignoredUsers = new Set();
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(IGNORE_FILE)) {
                const data = JSON.parse(fs.readFileSync(IGNORE_FILE, 'utf8'));
                if (Array.isArray(data.channels)) {
                    this.ignoredChannels = new Set(data.channels);
                }
                if (Array.isArray(data.users)) {
                    this.ignoredUsers = new Set(data.users);
                }
            }
        } catch (err) {
            logger.error('Failed to load ignored list:', err);
            this.ignoredChannels = new Set();
            this.ignoredUsers = new Set();
        }
    }

    isChannelIgnored(channelId) {
        if (!channelId) return false;
        return this.ignoredChannels.has(String(channelId));
    }

    isUserIgnored(userId) {
        if (!userId) return false;
        return this.ignoredUsers.has(String(userId));
    }

    isIgnored(channelId, userId) {
        return this.isChannelIgnored(channelId) || this.isUserIgnored(userId);
    }

    async addChannel(channelId) {
        const id = String(channelId);
        if (this.ignoredChannels.has(id)) return false;
        this.ignoredChannels.add(id);
        await this.persist();
        return true;
    }

    async removeChannel(channelId) {
        const id = String(channelId);
        if (!this.ignoredChannels.has(id)) return false;
        this.ignoredChannels.delete(id);
        await this.persist();
        return true;
    }

    async addUser(userId) {
        const id = String(userId);
        if (this.ignoredUsers.has(id)) return false;
        this.ignoredUsers.add(id);
        await this.persist();
        return true;
    }

    async removeUser(userId) {
        const id = String(userId);
        if (!this.ignoredUsers.has(id)) return false;
        this.ignoredUsers.delete(id);
        await this.persist();
        return true;
    }

    getChannels() {
        return Array.from(this.ignoredChannels);
    }

    getUsers() {
        return Array.from(this.ignoredUsers);
    }

    async clearChannels() {
        this.ignoredChannels.clear();
        await this.persist();
    }

    async clearUsers() {
        this.ignoredUsers.clear();
        await this.persist();
    }

    async clearAll() {
        this.ignoredChannels.clear();
        this.ignoredUsers.clear();
        await this.persist();
    }

    async persist() {
        try {
            const dir = path.dirname(IGNORE_FILE);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const data = {
                channels: Array.from(this.ignoredChannels),
                users: Array.from(this.ignoredUsers),
            };
            await fs.promises.writeFile(IGNORE_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (err) {
            logger.error('Failed to persist ignored configuration:', err);
        }
    }
}

module.exports = new IgnoreManager();

