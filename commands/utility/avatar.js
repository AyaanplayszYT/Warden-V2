const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { WardenEmbed, colors } = require('../../utils/embedBuilder');

module.exports = {
    name: 'avatar',
    description: 'Display a user\'s avatar in full size',
    usage: 'avatar [user]',
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display a user\'s avatar in full size')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose avatar to display')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('server')
                .setDescription('Show server-specific avatar if available')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const user = interaction.options?.getUser('user') || interaction.author || interaction.user;
        const showServer = interaction.options?.getBoolean('server') ?? true;
        
        // Fetch member for guild avatar
        let member = null;
        try {
            member = await interaction.guild.members.fetch(user.id);
        } catch {
            // User not in guild
        }

        const globalAvatar = user.displayAvatarURL({ size: 4096, dynamic: true });
        const serverAvatar = member?.displayAvatarURL({ size: 4096, dynamic: true });
        const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar;

        // Create format buttons
        const pngUrl = user.displayAvatarURL({ size: 4096, extension: 'png' });
        const jpgUrl = user.displayAvatarURL({ size: 4096, extension: 'jpg' });
        const webpUrl = user.displayAvatarURL({ size: 4096, extension: 'webp' });
        
        const formatRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('PNG')
                .setStyle(ButtonStyle.Link)
                .setURL(pngUrl),
            new ButtonBuilder()
                .setLabel('JPG')
                .setStyle(ButtonStyle.Link)
                .setURL(jpgUrl),
            new ButtonBuilder()
                .setLabel('WebP')
                .setStyle(ButtonStyle.Link)
                .setURL(webpUrl)
        );

        // Add GIF button if animated
        if (user.avatar?.startsWith('a_')) {
            formatRow.addComponents(
                new ButtonBuilder()
                    .setLabel('GIF')
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 4096, extension: 'gif' }))
            );
        }

        const avatarToShow = (showServer && hasServerAvatar) ? serverAvatar : globalAvatar;

        const embed = new WardenEmbed()
            .setColor(member?.displayHexColor || colors.primary)
            .setAuthor({ 
                name: `${user.tag}'s Avatar`,
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setImage(avatarToShow)
            .setFooter(
                hasServerAvatar 
                    ? `${showServer ? '🏠 Server Avatar' : '🌐 Global Avatar'} • Use /avatar server:false to toggle`
                    : '🌐 Global Avatar'
            )
            .build();

        // Add toggle button if user has server avatar
        const components = [formatRow];
        
        if (hasServerAvatar) {
            const toggleRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('avatar_toggle')
                    .setLabel(showServer ? 'Show Global Avatar' : 'Show Server Avatar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(showServer ? '🌐' : '🏠')
            );
            components.push(toggleRow);
        }

        const reply = await interaction.reply({ 
            embeds: [embed], 
            components,
            fetchReply: true 
        });

        // Handle toggle button
        if (hasServerAvatar) {
            const collector = reply.createMessageComponentCollector({ 
                filter: i => i.customId === 'avatar_toggle',
                time: 120000 
            });

            let showingServer = showServer;

            collector.on('collect', async i => {
                showingServer = !showingServer;
                
                const newEmbed = new WardenEmbed()
                    .setColor(member?.displayHexColor || colors.primary)
                    .setAuthor({ 
                        name: `${user.tag}'s Avatar`,
                        iconURL: user.displayAvatarURL({ dynamic: true })
                    })
                    .setImage(showingServer ? serverAvatar : globalAvatar)
                    .setFooter({ 
                        text: `${showingServer ? '🏠 Server Avatar' : '🌐 Global Avatar'} • Click to toggle`
                    })
                    .setTimestamp();

                const newToggleRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('avatar_toggle')
                        .setLabel(showingServer ? 'Show Global Avatar' : 'Show Server Avatar')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(showingServer ? '🌐' : '🏠')
                );

                await i.update({ embeds: [newEmbed], components: [formatRow, newToggleRow] });
            });

            collector.on('end', async () => {
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('avatar_toggle')
                            .setLabel('Toggle Expired')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await reply.edit({ components: [formatRow, disabledRow] });
                } catch {}
            });
        }
    }
};
