const { SlashCommandBuilder } = require('discord.js');
const { UI, PremiumEmbed } = require('../../utils/embedBuilder');
const ms = require('ms');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const remindersPath = path.join(__dirname, '../../data/reminders.json');
let reminders = [];

try {
    if (fs.existsSync(remindersPath)) {
        reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    }
} catch (e) {
    reminders = [];
}

function saveReminders() {
    fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set and manage personal reminders')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set a new reminder')
                .addStringOption(opt => opt.setName('time').setDescription('When to remind you (e.g. 10m, 1h, 1d)').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List your active reminders')
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Clear all your reminders')
        )
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Cancel a specific reminder by ID')
                .addIntegerOption(opt => opt.setName('id').setDescription('Reminder ID').setRequired(true))
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const uid = interaction.user.id;

        if (sub === 'set') {
            const timeStr = interaction.options.getString('time');
            const message = interaction.options.getString('message');
            const duration = ms(timeStr);

            if (!duration || duration < 60000) {
                return interaction.reply({
                    embeds: [UI.error('Invalid Duration', 'Minimum reminder duration is 1 minute (e.g. `10m`, `1h`, `1d`).')],
                    ephemeral: true,
                });
            }

            if (duration > 30 * 24 * 60 * 60 * 1000) {
                return interaction.reply({
                    embeds: [UI.error('Duration Too Long', 'Reminders cannot exceed 30 days.')],
                    ephemeral: true,
                });
            }

            const remindAt = Date.now() + duration;
            const reminder = {
                id: Date.now(),
                userId: uid,
                channelId: interaction.channel.id,
                guildId: interaction.guild.id,
                message,
                createdAt: Date.now(),
                remindAt,
            };

            reminders.push(reminder);
            saveReminders();
            scheduleReminder(client, reminder);

            const embed = UI.success(
                'Reminder Scheduled',
                `I will remind you in **${ms(duration, { long: true })}**.\n**Message** • ${message}\n**Trigger** • <t:${Math.floor(remindAt / 1000)}:R>\n**ID** • \`${reminder.id}\``
            );

            return interaction.reply({ embeds: [embed] });

        } else if (sub === 'list') {
            const userRems = reminders.filter(r => r.userId === uid);
            if (userRems.length === 0) {
                return interaction.reply({
                    embeds: [UI.info('No Reminders', 'You have no active reminders scheduled.')],
                    ephemeral: true,
                });
            }

            const desc = userRems.slice(0, 10).map((r, i) =>
                `**${i + 1}.** ${r.message.substring(0, 60)}${r.message.length > 60 ? '...' : ''}\nTrigger: <t:${Math.floor(r.remindAt / 1000)}:R> • ID: \`${r.id}\``
            ).join('\n\n');

            const embed = new PremiumEmbed()
                .title('Active Reminders')
                .desc(desc)
                .footer(`Total: ${userRems.length}`)
                .build();

            return interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (sub === 'clear') {
            const userRems = reminders.filter(r => r.userId === uid);
            if (userRems.length === 0) {
                return interaction.reply({
                    embeds: [UI.info('No Reminders', 'You have no active reminders to clear.')],
                    ephemeral: true,
                });
            }

            reminders = reminders.filter(r => r.userId !== uid);
            saveReminders();

            return interaction.reply({
                embeds: [UI.success('Reminders Cleared', `Cleared **${userRems.length}** reminder(s).`)],
                ephemeral: true,
            });

        } else if (sub === 'cancel') {
            const id = interaction.options.getInteger('id');
            const idx = reminders.findIndex(r => r.id === id && r.userId === uid);

            if (idx === -1) {
                return interaction.reply({
                    embeds: [UI.error('Not Found', `No reminder with ID \`${id}\` was found under your account.`)],
                    ephemeral: true,
                });
            }

            reminders.splice(idx, 1);
            saveReminders();

            return interaction.reply({
                embeds: [UI.success('Reminder Cancelled', `Reminder \`#${id}\` has been removed.`)],
                ephemeral: true,
            });
        }
    },

    initReminders(client) {
        const now = Date.now();
        reminders = reminders.filter(r => r.remindAt > now);
        saveReminders();

        reminders.forEach(reminder => scheduleReminder(client, reminder));
        logger.info(`Loaded ${reminders.length} pending reminders`);
    },
};

function scheduleReminder(client, reminder) {
    const delay = reminder.remindAt - Date.now();
    if (delay <= 0) {
        reminders = reminders.filter(r => r.id !== reminder.id);
        saveReminders();
        return;
    }

    setTimeout(async () => {
        try {
            const ch = await client.channels.fetch(reminder.channelId).catch(() => null);
            const user = await client.users.fetch(reminder.userId).catch(() => null);
            if (!user) return;

            const embed = new PremiumEmbed()
                .title('Reminder Alert')
                .desc(reminder.message)
                .footer('Warden')
                .build();

            if (ch) {
                await ch.send({ content: `<@${reminder.userId}>`, embeds: [embed] }).catch(() => {
                    user.send({ embeds: [embed] }).catch(() => {});
                });
            } else {
                await user.send({ embeds: [embed] }).catch(() => {});
            }

            reminders = reminders.filter(r => r.id !== reminder.id);
            saveReminders();
        } catch (e) {}
    }, Math.min(delay, 2147483647));
}
