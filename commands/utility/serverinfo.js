const { ChannelType, GuildVerificationLevel, GuildExplicitContentFilter, GuildNSFWLevel } = require('discord.js');
const { WardenEmbed, emojis } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: {
        name: 'serverinfo',
        description: 'Display detailed information about the server.',
        options: [],
    },

    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;

        // Fetch owner
        const owner = await guild.fetchOwner().catch(() => null);

        // Count channels by type
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        // Member stats
        const memberCount = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = memberCount - botCount;

        // Role count (excluding @everyone)
        const roleCount = guild.roles.cache.size - 1;

        // Emoji and sticker counts
        const emojiCount = guild.emojis.cache.size;
        const stickerCount = guild.stickers?.cache?.size || 0;

        // Boost info
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        // Verification level mapping
        const verificationLevels = {
            [GuildVerificationLevel.None]: 'None',
            [GuildVerificationLevel.Low]: 'Low (Email verified)',
            [GuildVerificationLevel.Medium]: 'Medium (5 min registered)',
            [GuildVerificationLevel.High]: 'High (10 min member)',
            [GuildVerificationLevel.VeryHigh]: 'Highest (Phone verified)',
        };

        // Content filter mapping
        const contentFilters = {
            [GuildExplicitContentFilter.Disabled]: 'Disabled',
            [GuildExplicitContentFilter.MembersWithoutRoles]: 'Members without roles',
            [GuildExplicitContentFilter.AllMembers]: 'All members',
        };

        // NSFW level mapping
        const nsfwLevels = {
            [GuildNSFWLevel.Default]: 'Default',
            [GuildNSFWLevel.Explicit]: 'Explicit',
            [GuildNSFWLevel.Safe]: 'Safe',
            [GuildNSFWLevel.AgeRestricted]: 'Age Restricted',
        };

        // Features formatting
        const features = guild.features.length > 0 
            ? guild.features.slice(0, 10).map(f => `\`${f.replace(/_/g, ' ')}\``).join(', ')
            : 'None';

        const embed = new WardenEmbed()
            .setType('primary')
            .setTitle(`${emojis.server} ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setDescription(guild.description || '*No server description set*')
            .addField(`${emojis.id} Server ID`, `\`${guild.id}\``, true)
            .addField(`${emojis.crown} Owner`, owner ? `${owner.user.tag}` : 'Unknown', true)
            .addField(`${emojis.calendar} Created`, `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, true)
            .addField(
                `${emojis.users} Members (${memberCount})`,
                `${emojis.user} Humans: **${humanCount}**\n🤖 Bots: **${botCount}**`,
                true
            )
            .addField(
                `${emojis.channel} Channels (${guild.channels.cache.size})`,
                `${emojis.textChannel} Text: **${textChannels}**\n${emojis.voiceChannel} Voice: **${voiceChannels}**\n${emojis.category} Categories: **${categoryChannels}**`,
                true
            )
            .addField(
                `${emojis.role} Roles & Emojis`,
                `${emojis.role} Roles: **${roleCount}**\n😀 Emojis: **${emojiCount}**\n🏷️ Stickers: **${stickerCount}**`,
                true
            )
            .addField(
                `${emojis.boost} Boost Status`,
                `Level: **${boostLevel}** (${boostCount} boosts)`,
                true
            )
            .addField(
                `${emojis.lock} Security`,
                `Verification: **${verificationLevels[guild.verificationLevel]}**\nContent Filter: **${contentFilters[guild.explicitContentFilter]}**`,
                true
            )
            .addField(
                `${emojis.settings} Features`,
                features.length > 200 ? features.substring(0, 200) + '...' : features,
                false
            )
            .build();

        // Add banner if available
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Serverinfo command used by ${interaction.user.tag} in ${guild.name}`);
    },
};
