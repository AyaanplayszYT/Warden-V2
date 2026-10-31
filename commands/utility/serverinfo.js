const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display server metrics and structure'),

    async execute(interaction) {
        const guild = interaction.guild;

        const text = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voice = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = Math.max(0, totalMembers - botCount);

        const embed = new PremiumEmbed()
            .title(guild.name)
            .thumbnail(guild.iconURL({ dynamic: true }))
            .field('Overview', `**ID** • \`${guild.id}\`\n**Owner** • <@${guild.ownerId}>\n**Created** • <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, false)
            .field('Members', `**Total** • ${totalMembers}\n**Humans** • ${humanCount}\n**Bots** • ${botCount}`, true)
            .field('Channels', `**Text** • ${text}\n**Voice** • ${voice}\n**Categories** • ${categories}`, true)
            .field('Assets', `**Roles** • ${guild.roles.cache.size - 1}\n**Emojis** • ${guild.emojis.cache.size}\n**Boost Tier** • Level ${guild.premiumTier}`, true)
            .build();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Serverinfo checked for ${guild.name} by ${interaction.user.tag}`);
    },
};
