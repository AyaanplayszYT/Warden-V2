const { ChannelType, GuildVerificationLevel, GuildExplicitContentFilter, GuildNSFWLevel } = require('discord.js');
const { V2Card } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'serverinfo',
        description: 'Display comprehensive server telemetry, security levels, and member metrics.',
        options: [],
    },

    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        const owner = await guild.fetchOwner().catch(() => null);

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        const memberCount = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = memberCount - botCount;

        const roleCount = guild.roles.cache.size - 1;
        const emojiCount = guild.emojis.cache.size;
        const stickerCount = guild.stickers?.cache?.size || 0;

        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const verificationLevels = {
            [GuildVerificationLevel.None]: 'Unrestricted',
            [GuildVerificationLevel.Low]: 'Low (Verified Email)',
            [GuildVerificationLevel.Medium]: 'Medium (Registered > 5m)',
            [GuildVerificationLevel.High]: 'High (Guild Member > 10m)',
            [GuildVerificationLevel.VeryHigh]: 'Highest (Verified Phone)',
        };

        const contentFilters = {
            [GuildExplicitContentFilter.Disabled]: 'Disabled',
            [GuildExplicitContentFilter.MembersWithoutRoles]: 'Members Without Roles',
            [GuildExplicitContentFilter.AllMembers]: 'Scan All Members',
        };

        const nsfwLevels = {
            [GuildNSFWLevel.Default]: 'Default',
            [GuildNSFWLevel.Explicit]: 'Explicit',
            [GuildNSFWLevel.Safe]: 'Safe',
            [GuildNSFWLevel.AgeRestricted]: 'Age Restricted',
        };

        const features = guild.features.length > 0 
            ? guild.features.slice(0, 10).map(f => `\`${f.replace(/_/g, ' ')}\``).join(', ')
            : 'Standard Discord Guild';

        const card = new V2Card()
            .setAccent('primary')
            .setTitle(`[SERVER TELEMETRY] ${guild.name}`, `Guild Identifier: \`${guild.id}\``)
            .setDescription(guild.description || '*No guild description defined.*')
            .addField('Guild Owner', owner ? `${owner.user.tag} (\`${owner.id}\`)` : 'Unknown', true)
            .addField('Creation Date', `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, true)
            .addField('Boost Tier Status', `Level ${boostLevel} (${boostCount} active boost subscriptions)`, true)
            .addField(
                `Member Demographics (${memberCount})`,
                `• Human Accounts: **${humanCount}**\n• Automated Bots: **${botCount}**`,
                true
            )
            .addField(
                `Channel Structure (${guild.channels.cache.size})`,
                `• Text Channels: **${textChannels}**\n• Voice Channels: **${voiceChannels}**\n• Categories: **${categoryChannels}**\n• Forum / Stage: **${forumChannels + stageChannels}**`,
                true
            )
            .addField(
                `Assets & Roles`,
                `• Roles: **${roleCount}**\n• Custom Emojis: **${emojiCount}**\n• Stickers: **${stickerCount}**`,
                true
            )
            .addField(
                'Security Configuration',
                `• Verification: **${verificationLevels[guild.verificationLevel]}**\n• Content Filter: **${contentFilters[guild.explicitContentFilter]}**\n• NSFW Classification: **${nsfwLevels[guild.nsfwLevel]}**`,
                false
            )
            .addField('Guild Enabled Features', features, false)
            .setFooter(`Requested by ${interaction.user.tag}`);

        await card.editReply(interaction);
        logger.info(`Serverinfo accessed for ${guild.name} by ${interaction.user.tag}`);
    },
};
