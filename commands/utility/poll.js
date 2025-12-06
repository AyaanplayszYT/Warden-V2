const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WardenEmbed, EmbedTemplates, colors, emojis } = require('../../utils/embedBuilder');

module.exports = {
    name: 'poll',
    description: 'Create an interactive poll',
    usage: 'poll <question> [options...]',
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create an interactive poll')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The poll question')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('First option')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Second option')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Third option (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Fourth option (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Fifth option (optional)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Poll duration in minutes (default: no limit)')
                .setMinValue(1)
                .setMaxValue(10080)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Hide who voted for what (default: false)')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const question = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration');
        const anonymous = interaction.options.getBoolean('anonymous') ?? false;
        
        // Collect options
        const options = [];
        for (let i = 1; i <= 5; i++) {
            const opt = interaction.options.getString(`option${i}`);
            if (opt) options.push(opt);
        }

        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const votes = new Map(); // option index -> Set of user IDs
        const userVotes = new Map(); // user ID -> option index
        
        // Initialize votes
        options.forEach((_, i) => votes.set(i, new Set()));

        function createPollEmbed(ended = false) {
            const totalVotes = Array.from(votes.values()).reduce((acc, set) => acc + set.size, 0);
            
            const embed = new WardenEmbed()
                .setColor(ended ? colors.secondary : colors.primary)
                .setAuthor({ 
                    name: ended ? '📊 Poll Ended' : '📊 Poll',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle(question);

            let description = '';
            let maxVotes = 0;
            let winningOptions = [];

            // Find max votes for highlighting winner
            options.forEach((_, i) => {
                const count = votes.get(i).size;
                if (count > maxVotes) {
                    maxVotes = count;
                    winningOptions = [i];
                } else if (count === maxVotes && count > 0) {
                    winningOptions.push(i);
                }
            });

            options.forEach((opt, i) => {
                const count = votes.get(i).size;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const barLength = 20;
                const filledLength = totalVotes > 0 ? Math.round((count / totalVotes) * barLength) : 0;
                const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
                
                const isWinner = ended && maxVotes > 0 && winningOptions.includes(i);
                const winnerMark = isWinner ? ' 🏆' : '';
                
                description += `${optionEmojis[i]} **${opt}**${winnerMark}\n`;
                description += `\`${bar}\` ${percentage}% (${count} vote${count !== 1 ? 's' : ''})\n\n`;
            });

            embed.setDescription(description);

            const footerParts = [];
            footerParts.push(`Total: ${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`);
            if (anonymous) footerParts.push('Anonymous voting');
            if (duration && !ended) {
                const endTime = Math.floor((Date.now() + duration * 60000) / 1000);
                footerParts.push(`Ends <t:${endTime}:R>`);
            }
            if (ended) footerParts.push('Voting closed');
            
            embed.setFooter({ 
                text: footerParts.join(' • '),
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

            return embed;
        }

        function createButtons(disabled = false) {
            const rows = [];
            const buttonRow = new ActionRowBuilder();
            
            options.forEach((opt, i) => {
                buttonRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${i}`)
                        .setLabel(opt.substring(0, 25))
                        .setEmoji(optionEmojis[i])
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled)
                );
            });
            
            rows.push(buttonRow);

            // Add end poll button for creator
            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('poll_end')
                    .setLabel('End Poll')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled)
            );
            rows.push(controlRow);

            return rows;
        }

        const embed = createPollEmbed();
        const buttons = createButtons();

        const reply = await interaction.reply({
            embeds: [embed],
            components: buttons,
            fetchReply: true
        });

        // Create collector
        const collectorTime = duration ? duration * 60000 : 86400000; // Default 24 hours
        const collector = reply.createMessageComponentCollector({ 
            time: collectorTime 
        });

        let ended = false;

        collector.on('collect', async i => {
            if (ended) return;

            // Handle end poll button
            if (i.customId === 'poll_end') {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: 'Only the poll creator can end the poll.',
                        ephemeral: true 
                    });
                }
                
                ended = true;
                collector.stop('ended');
                
                const endEmbed = createPollEmbed(true);
                await i.update({ 
                    embeds: [endEmbed], 
                    components: createButtons(true) 
                });
                return;
            }

            // Handle vote
            if (i.customId.startsWith('poll_vote_')) {
                const optionIndex = parseInt(i.customId.split('_')[2]);
                const userId = i.user.id;

                // Check if user already voted
                const previousVote = userVotes.get(userId);
                
                if (previousVote !== undefined) {
                    // Remove previous vote
                    votes.get(previousVote).delete(userId);
                }

                // Toggle vote if same option
                if (previousVote === optionIndex) {
                    userVotes.delete(userId);
                    
                    if (anonymous) {
                        await i.reply({ 
                            content: `${emojis.success} Vote removed!`,
                            ephemeral: true 
                        });
                    } else {
                        await i.deferUpdate();
                    }
                } else {
                    // Add new vote
                    votes.get(optionIndex).add(userId);
                    userVotes.set(userId, optionIndex);
                    
                    if (anonymous) {
                        await i.reply({ 
                            content: `${emojis.success} Voted for **${options[optionIndex]}**!`,
                            ephemeral: true 
                        });
                    } else {
                        await i.deferUpdate();
                    }
                }

                // Update embed
                const newEmbed = createPollEmbed();
                await reply.edit({ embeds: [newEmbed] });
            }
        });

        collector.on('end', async (_, reason) => {
            if (!ended && reason === 'time') {
                ended = true;
                const endEmbed = createPollEmbed(true);
                await reply.edit({ 
                    embeds: [endEmbed], 
                    components: createButtons(true) 
                }).catch(() => {});
            }
        });
    }
};
