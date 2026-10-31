const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { PremiumEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Launch an interactive voting poll')
        .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
        .addStringOption(opt => opt.setName('option1').setDescription('First option').setRequired(true))
        .addStringOption(opt => opt.setName('option2').setDescription('Second option').setRequired(true))
        .addStringOption(opt => opt.setName('option3').setDescription('Third option').setRequired(false))
        .addStringOption(opt => opt.setName('option4').setDescription('Fourth option').setRequired(false))
        .addStringOption(opt => opt.setName('option5').setDescription('Fifth option').setRequired(false))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(1440).setRequired(false))
        .addBooleanOption(opt => opt.setName('anonymous').setDescription('Hide voter identities').setRequired(false)),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration');
        const anonymous = interaction.options.getBoolean('anonymous') ?? false;

        const options = [];
        for (let i = 1; i <= 5; i++) {
            const val = interaction.options.getString(`option${i}`);
            if (val) options.push(val);
        }

        const votes = new Map();
        const userVotes = new Map();
        options.forEach((_, i) => votes.set(i, new Set()));

        const makeEmbed = (ended = false) => {
            const total = Array.from(votes.values()).reduce((sum, s) => sum + s.size, 0);

            let desc = `### ${question}\n\n`;
            options.forEach((opt, i) => {
                const count = votes.get(i).size;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const barFilled = total > 0 ? Math.round((count / total) * 12) : 0;
                const bar = '[' + '|'.repeat(barFilled) + '░'.repeat(12 - barFilled) + ']';

                desc += `**Option ${i + 1}** • ${opt}\n\`${bar}\` ${pct}% (${count} vote${count !== 1 ? 's' : ''})\n\n`;
            });

            let footer = `Total Votes: ${total}`;
            if (anonymous) footer += ' • Anonymous';
            if (duration && !ended) {
                footer += ` • Ends in ${duration}m`;
            }

            return new PremiumEmbed()
                .title(ended ? 'Poll Results' : 'Active Poll')
                .desc(desc.trim())
                .footer(footer)
                .build();
        };

        const makeRow = () => {
            const row = new ActionRowBuilder();
            options.forEach((_, i) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vote_${i}`)
                        .setLabel(`Option ${i + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            return row;
        };

        const msg = await interaction.reply({
            embeds: [makeEmbed(false)],
            components: [makeRow()],
            fetchReply: true,
        });

        const collectorTime = duration ? duration * 60000 : 86400000;
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: collectorTime,
        });

        collector.on('collect', async btn => {
            const idx = parseInt(btn.customId.replace('vote_', ''), 10);
            const uid = btn.user.id;
            const prev = userVotes.get(uid);

            if (prev === idx) {
                votes.get(idx).delete(uid);
                userVotes.delete(uid);
                await btn.reply({ content: 'Vote removed.', ephemeral: true });
            } else {
                if (prev !== undefined) votes.get(prev).delete(uid);
                votes.get(idx).add(uid);
                userVotes.set(uid, idx);
                await btn.reply({ content: `Voted for Option ${idx + 1}: ${options[idx]}`, ephemeral: true });
            }

            await interaction.editReply({ embeds: [makeEmbed(false)] }).catch(() => {});
        });

        collector.on('end', async () => {
            await interaction.editReply({ embeds: [makeEmbed(true)], components: [] }).catch(() => {});
        });

        logger.info(`Poll created by ${interaction.user.tag}: ${question}`);
    },
};
