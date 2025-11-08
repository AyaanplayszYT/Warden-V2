// This file represents a base structure for commands.
// In a more advanced command handler, you might use a class like this
// to ensure all commands have a consistent shape and behavior.

class Command {
    /**
     * @param {Client} client The discord client
     * @param {Object} options The command options
     * @param {string} options.name The name of the command
     * @param {string} options.description A short description of the command
     * @param {string} options.category The category of the command
     * @param {Array<string>} [options.aliases=[]] The aliases of the command
     * @param {number} [options.cooldown=3] The command cooldown in seconds
     * @param {boolean} [options.ownerOnly=false] Whether the command is owner only
     * @param {Array<PermissionFlagsBits>} [options.userPerms=[]] Permissions required by the user
     * @param {Array<PermissionFlagsBits>} [options.clientPerms=[]] Permissions required by the client
     */
    constructor(client, options) {
        this.client = client;
        this.name = options.name;
        this.description = options.description;
        this.category = options.category;
        this.aliases = options.aliases || [];
        this.cooldown = options.cooldown || 3;
        this.ownerOnly = options.ownerOnly || false;
        this.userPerms = options.userPerms || [];
        this.clientPerms = options.clientPerms || [];
    }

    // This is a placeholder for the command's execution logic
    // In a class-based handler, you would override this method in each command file.
    async run(message, args) {
        throw new Error(`The run method has not been implemented in ${this.name}`);
    }
}

module.exports = Command;
