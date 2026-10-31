const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { V2Card } = require('../../utils/v2Components');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Launch an interactive live poll with real-time voting.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question being voted on')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('First choice option')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Second choice option')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Third choice option (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Fourth choice option (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Fifth choice option (optional)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Poll duration in minutes (default: indefinite)')
                .setMinValue(1)
                .setMaxValue(10080)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Hide voter identities (default: false)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration');
        const anonymous = interaction.options.getBoolean('anonymous') ?? false;

        const options = [];
        for (let i = 1; i <= 5; i++) {
            const opt = interaction.options.getString(`option${i}`);
            if (opt) options.push(opt);
        }

        const votes = new Map(); // option index -> Set of user IDs
        const userVotes = new Map(); // user ID -> option index
        options.forEach((_, i) => votes.set(i, new Set()));

        const buildPollCard = (ended = false) => {
            const totalVotes = Array.from(votes.values()).reduce((acc, set) => acc + set.size, 0);

            let maxVotes = 0;
            let winningIndices = [];
            options.forEach((_, i) => {
                const count = votes.get(i).size;
                if (count > maxVotes) {
                    maxVotes = count;
                    winningIndices = [i];
                } else if (count === maxVotes && count > 0) {
                    winningIndices.push(i);
                }
            });

            const card = new V2Card()
                .setAccent(ended ? 'secondary' : 'primary')
                .setTitle(ended ? '[POLL CONCLUDED] Final Results' : '[ACTIVE POLL] Community Ballot')
                .setDescription(`### ${question}\n`);

            options.forEach((opt, i) => {
                const count = votes.get(i).size;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const barLength = 16;
                const filled = totalVotes > 0 ? Math.round((count / totalVotes) * barLength) : 0;
                const bar = '[' + '|'.repeat(filled) + '░'.repeat(barLength - filled) + ']';

                const isWinner = ended && maxVotes > 0 && winningIndices.includes(i);
                const tag = isWinner ? ' [WINNER]' : '';

                card.addField(
                    `[OPTION ${i + 1}] ${opt}${tag}`,
                    `\`${bar}\` **${percentage}%** (${count} vote${count !== 1 ? 's' : ''})`,
                    false
                );
            });

            let footerText = `Total Cast Ballots: ${totalVotes}`;
            if (anonymous) footerText += ' • Anonymous Voting';
            if (duration && !ended) {
                const endTime = Math.floor((Date.now() + duration * 60000) / 1000);
                footerText += ` • Closes <t:${endTime}:R>`;
            }
            card.setFooter(footerText);

            if (!ended) {
                const row = new ActionRowBuilder();
                options.forEach((opt, i) => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`poll_vote_${i}`)
                            .setLabel(`Option ${i + 1}`)
                            .setStyle(ButtonStyle.Primary)
                    );
                });
                card.addActionRow(row);
            }

            return card;
        };

        const initialCard = buildPollCard(false);
        const replyMsg = await interaction.reply({
            ...initialCard.toPayload(),
            components: [initialCard.buildContainer()],
            fetchReply: true,
        });

        const collectorTime = duration ? duration * 60000 : 86400000;
        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: collectorTime,
        });

        collector.on('collect', async btnInter => {
            const index = parseInt(btnInter.customId.replace('poll_vote_', ''), 10);
            const userId = btnInter.user.id;

            const previousVote = userVotes.get(userId);

            if (previousVote === index) {
                votes.get(index).delete(userId);
                userVotes.delete(userId);
                await btnInter.reply({ content: 'Your vote has been retracted.', ephemeral: true });
            } else {
                if (previousVote !== undefined) {
                    votes.get(previousVote).delete(userId);
                }
                votes.get(index).add(userId);
                userVotes.set(userId, index);
                await btnInter.reply({ content: `Vote recorded for Option ${index + 1}: **${options[index]}**`, ephemeral: true });
            }

            const updatedCard = buildPollCard(false);
            await interaction.editReply({
                ...updatedCard.toPayload(),
                components: [updatedCard.buildContainer()]
            }).catch(() => {});
        });

        collector.on('end', async () => {
            const endedCard = buildPollCard(true);
            await interaction.editReply({
                ...endedCard.toPayload(),
                components: [endedCard.buildContainer()]
            }).catch(() => {});
        });

        logger.info(`Poll created by ${interaction.user.tag}: "${question}"`);
    },
};
