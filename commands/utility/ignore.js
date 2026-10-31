const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { UI } = require('../../utils/embedBuilder');
const ignoreManager = require('../../utils/ignoreManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'ignore',
    description: 'Configure channels or users ignored from audit and deletion logging.',
    category: 'utility',

    data: new SlashCommandBuilder()
        .setName('ignore')
        .setDescription('Configure channels or users ignored from audit logging')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub
                .setName('add-channel')
                .setDescription('Ignore a channel from deletion, edit, and spam logging')
                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('The channel to ignore')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('add-user')
                .setDescription('Ignore a user from deletion, edit, and snipe logging')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to ignore')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove-channel')
                .setDescription('Stop ignoring a channel')
                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('The channel to un-ignore')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove-user')
                .setDescription('Stop ignoring a user')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to un-ignore')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('View all currently ignored channels and users')
        )
        .addSubcommand(sub =>
            sub
                .setName('clear')
                .setDescription('Clear ignored channels or users')
                .addStringOption(opt =>
                    opt
                        .setName('target')
                        .setDescription('What to clear')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All (Channels & Users)', value: 'all' },
                            { name: 'Channels Only', value: 'channels' },
                            { name: 'Users Only', value: 'users' }
                        )
                )
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [UI.error('Permission Denied', 'You lack the Manage Server permission.')],
                ephemeral: true,
            });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add-channel') {
            const channel = interaction.options.getChannel('channel');
            const added = await ignoreManager.addChannel(channel.id);

            if (!added) {
                return interaction.reply({
                    embeds: [UI.info('Already Ignored', `<#${channel.id}> is already in the ignore list.`)],
                    ephemeral: true,
                });
            }

            logger.info(`${interaction.user.tag} added channel #${channel.name} to ignore list`);
            return interaction.reply({
                embeds: [
                    UI.embed()
                        .color('success')
                        .title('Channel Ignored')
                        .desc(`Deleted messages and edits in <#${channel.id}> will no longer be logged or sniped.`)
                        .field('Channel', `<#${channel.id}> (\`${channel.id}\`)`, true)
                        .field('Configured By', `<@${interaction.user.id}>`, true)
                        .build(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'add-user') {
            const user = interaction.options.getUser('user');
            const added = await ignoreManager.addUser(user.id);

            if (!added) {
                return interaction.reply({
                    embeds: [UI.info('Already Ignored', `<@${user.id}> is already in the ignore list.`)],
                    ephemeral: true,
                });
            }

            logger.info(`${interaction.user.tag} added user ${user.tag} to ignore list`);
            return interaction.reply({
                embeds: [
                    UI.embed()
                        .color('success')
                        .title('User Ignored')
                        .desc(`Deleted messages and edits from <@${user.id}> will no longer be logged or sniped.`)
                        .field('User', `<@${user.id}> (\`${user.id}\`)`, true)
                        .field('Configured By', `<@${interaction.user.id}>`, true)
                        .build(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'remove-channel') {
            const channel = interaction.options.getChannel('channel');
            const removed = await ignoreManager.removeChannel(channel.id);

            if (!removed) {
                return interaction.reply({
                    embeds: [UI.warning('Not Found', `<#${channel.id}> was not in the ignore list.`)],
                    ephemeral: true,
                });
            }

            logger.info(`${interaction.user.tag} removed channel #${channel.name} from ignore list`);
            return interaction.reply({
                embeds: [UI.success('Channel Un-Ignored', `<#${channel.id}> has been removed from the ignore list. Logging resumed.`)],
                ephemeral: true,
            });
        }

        if (sub === 'remove-user') {
            const user = interaction.options.getUser('user');
            const removed = await ignoreManager.removeUser(user.id);

            if (!removed) {
                return interaction.reply({
                    embeds: [UI.warning('Not Found', `<@${user.id}> was not in the ignore list.`)],
                    ephemeral: true,
                });
            }

            logger.info(`${interaction.user.tag} removed user ${user.tag} from ignore list`);
            return interaction.reply({
                embeds: [UI.success('User Un-Ignored', `<@${user.id}> has been removed from the ignore list. Logging resumed.`)],
                ephemeral: true,
            });
        }

        if (sub === 'clear') {
            const target = interaction.options.getString('target');

            if (target === 'channels') {
                await ignoreManager.clearChannels();
                return interaction.reply({
                    embeds: [UI.success('Channels Cleared', 'All ignored channels have been removed from the ignore list.')],
                    ephemeral: true,
                });
            } else if (target === 'users') {
                await ignoreManager.clearUsers();
                return interaction.reply({
                    embeds: [UI.success('Users Cleared', 'All ignored users have been removed from the ignore list.')],
                    ephemeral: true,
                });
            } else {
                await ignoreManager.clearAll();
                return interaction.reply({
                    embeds: [UI.success('Ignore List Cleared', 'All ignored channels and users have been purged.')],
                    ephemeral: true,
                });
            }
        }

        if (sub === 'list') {
            const channels = ignoreManager.getChannels();
            const users = ignoreManager.getUsers();

            if (channels.length === 0 && users.length === 0) {
                return interaction.reply({
                    embeds: [UI.info('Ignore List Empty', 'No channels or users are currently ignored from audit logging.')],
                    ephemeral: true,
                });
            }

            const embed = UI.embed()
                .color('primary')
                .title('Ignored Audit Entities')
                .desc('Entities excluded from message deletion, edit, and spam logging:');

            if (channels.length > 0) {
                const channelList = channels.map(id => `• <#${id}> (\`${id}\`)`).join('\n');
                embed.field(`Ignored Channels (${channels.length})`, channelList.substring(0, 1024), false);
            } else {
                embed.field('Ignored Channels', '*None configured*', false);
            }

            if (users.length > 0) {
                const userList = users.map(id => `• <@${id}> (\`${id}\`)`).join('\n');
                embed.field(`Ignored Users (${users.length})`, userList.substring(0, 1024), false);
            } else {
                embed.field('Ignored Users', '*None configured*', false);
            }

            return interaction.reply({ embeds: [embed.build()], ephemeral: true });
        }
    },
};
