const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '../data');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');

/**
 * Warnings Database - Persistent storage for user warnings
 */
class WarningsDB {
    constructor() {
        this.warnings = {};
        this.caseCounter = 0;
        this.load();
    }

    /**
     * Load warnings from file
     */
    load() {
        try {
            if (fs.existsSync(WARNINGS_FILE)) {
                const data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
                this.warnings = data.warnings || {};
                this.caseCounter = data.caseCounter || 0;
                logger.info(`Loaded ${Object.keys(this.warnings).length} guild warning records`);
            }
        } catch (error) {
            logger.error('Failed to load warnings database:', error);
            this.warnings = {};
            this.caseCounter = 0;
        }
    }

    /**
     * Save warnings to file
     */
    save() {
        try {
            const data = {
                warnings: this.warnings,
                caseCounter: this.caseCounter,
            };
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error('Failed to save warnings database:', error);
        }
    }

    /**
     * Get next case ID
     */
    getNextCaseId() {
        this.caseCounter++;
        this.save();
        return this.caseCounter;
    }

    /**
     * Add a warning to a user
     * @param {string} guildId - The guild ID
     * @param {string} userId - The user ID
     * @param {Object} warning - The warning data
     * @returns {Object} The created warning with case ID
     */
    add(guildId, userId, warning) {
        if (!this.warnings[guildId]) {
            this.warnings[guildId] = {};
        }
        if (!this.warnings[guildId][userId]) {
            this.warnings[guildId][userId] = [];
        }

        const caseId = this.getNextCaseId();
        const warningEntry = {
            caseId,
            moderatorId: warning.moderatorId,
            moderatorTag: warning.moderatorTag,
            reason: warning.reason || 'No reason provided',
            timestamp: new Date().toISOString(),
            type: warning.type || 'warn', // warn, mute, kick, ban, etc.
        };

        this.warnings[guildId][userId].push(warningEntry);
        this.save();

        logger.info(`Added warning case #${caseId} to user ${userId} in guild ${guildId}`);
        return warningEntry;
    }

    /**
     * Get all warnings for a user in a guild
     * @param {string} guildId - The guild ID
     * @param {string} userId - The user ID
     * @returns {Array} Array of warnings
     */
    get(guildId, userId) {
        if (!this.warnings[guildId] || !this.warnings[guildId][userId]) {
            return [];
        }
        return this.warnings[guildId][userId];
    }

    /**
     * Get warning count for a user in a guild
     * @param {string} guildId - The guild ID
     * @param {string} userId - The user ID
     * @returns {number} Number of warnings
     */
    count(guildId, userId) {
        return this.get(guildId, userId).length;
    }

    /**
     * Get a specific warning by case ID
     * @param {string} guildId - The guild ID
     * @param {number} caseId - The case ID
     * @returns {Object|null} The warning or null if not found
     */
    getByCase(guildId, caseId) {
        if (!this.warnings[guildId]) return null;

        for (const userId in this.warnings[guildId]) {
            const warning = this.warnings[guildId][userId].find(w => w.caseId === caseId);
            if (warning) {
                return { ...warning, userId };
            }
        }
        return null;
    }

    /**
     * Remove a specific warning by case ID
     * @param {string} guildId - The guild ID
     * @param {number} caseId - The case ID
     * @returns {boolean} Whether the warning was removed
     */
    removeByCase(guildId, caseId) {
        if (!this.warnings[guildId]) return false;

        for (const userId in this.warnings[guildId]) {
            const index = this.warnings[guildId][userId].findIndex(w => w.caseId === caseId);
            if (index !== -1) {
                this.warnings[guildId][userId].splice(index, 1);
                // Clean up empty arrays
                if (this.warnings[guildId][userId].length === 0) {
                    delete this.warnings[guildId][userId];
                }
                this.save();
                logger.info(`Removed warning case #${caseId} from guild ${guildId}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Clear all warnings for a user in a guild
     * @param {string} guildId - The guild ID
     * @param {string} userId - The user ID
     * @returns {number} Number of warnings cleared
     */
    clear(guildId, userId) {
        if (!this.warnings[guildId] || !this.warnings[guildId][userId]) {
            return 0;
        }
        const count = this.warnings[guildId][userId].length;
        delete this.warnings[guildId][userId];
        this.save();
        logger.info(`Cleared ${count} warnings for user ${userId} in guild ${guildId}`);
        return count;
    }

    /**
     * Get recent moderation actions for a guild
     * @param {string} guildId - The guild ID
     * @param {number} limit - Maximum number of actions to return
     * @returns {Array} Array of recent actions
     */
    getRecent(guildId, limit = 10) {
        if (!this.warnings[guildId]) return [];

        const allWarnings = [];
        for (const userId in this.warnings[guildId]) {
            for (const warning of this.warnings[guildId][userId]) {
                allWarnings.push({ ...warning, userId });
            }
        }

        return allWarnings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Get statistics for a guild
     * @param {string} guildId - The guild ID
     * @returns {Object} Statistics object
     */
    getStats(guildId) {
        if (!this.warnings[guildId]) {
            return {
                totalWarnings: 0,
                usersWarned: 0,
                byType: {},
            };
        }

        let totalWarnings = 0;
        const byType = {};

        for (const userId in this.warnings[guildId]) {
            for (const warning of this.warnings[guildId][userId]) {
                totalWarnings++;
                byType[warning.type] = (byType[warning.type] || 0) + 1;
            }
        }

        return {
            totalWarnings,
            usersWarned: Object.keys(this.warnings[guildId]).length,
            byType,
        };
    }
}

// Export singleton instance
module.exports = new WarningsDB();
