const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { V2Card, V2Templates } = require('../../utils/v2Components');
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
} catch (error) {
    reminders = [];
}

function saveReminders() {
    fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
}

module.exports = {
    name: 'remind',
    description: 'Schedule automated reminders with time triggers.',
    usage: 'remind <set|list|clear|cancel>',
    category: 'utility',
    reminders,
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Schedule and manage automated reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Register a new automated reminder')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('When to remind you (e.g., 10m, 1h, 2d)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Reminder message text')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all your active pending reminders')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all your scheduled reminders')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel a specific reminder by ID')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('The reminder ID to cancel')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options?.getSubcommand() || 'set';
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'set': {
                const timeInput = interaction.options.getString('time');
                const message = interaction.options.getString('message');

                const duration = ms(timeInput);

                if (!duration || duration < 60000) {
                    return V2Templates.error(
                        'Invalid Duration Format',
                        'Minimum reminder duration is `1 minute`.\n\n**Valid Syntax Examples:**\n• `10m` — 10 minutes\n• `1h` — 1 hour\n• `1d` — 1 day\n• `1w` — 1 week'
                    ).reply(interaction, { ephemeral: true });
                }

                if (duration > 30 * 24 * 60 * 60 * 1000) {
                    return V2Templates.error(
                        'Duration Limit Exceeded',
                        'Reminders cannot be scheduled more than 30 days into the future.'
                    ).reply(interaction, { ephemeral: true });
                }

                const reminderTime = Date.now() + duration;
                const reminder = {
                    id: Date.now(),
                    userId,
                    channelId: interaction.channel.id,
                    guildId: interaction.guild.id,
                    message,
                    createdAt: Date.now(),
                    remindAt: reminderTime,
                };

                reminders.push(reminder);
                saveReminders();

                scheduleReminder(client, reminder);

                const card = new V2Card()
                    .setAccent('success')
                    .setTitle('[REMINDER REGISTERED] Automated Alert Set')
                    .setDescription(`Warden will deliver this reminder in **${ms(duration, { long: true })}**.`)
                    .addField('Reminder Content', message.substring(0, 1024), false)
                    .addField('Scheduled Trigger Time', `<t:${Math.floor(reminderTime / 1000)}:F> (<t:${Math.floor(reminderTime / 1000)}:R>)`, false)
                    .setFooter(`Reminder ID: ${reminder.id}`);

                return card.reply(interaction);
            }

            case 'list': {
                const userReminders = reminders.filter(r => r.userId === userId);

                if (userReminders.length === 0) {
                    return V2Templates.info(
                        'No Active Reminders',
                        'You currently have zero scheduled reminders pending in queue.'
                    ).reply(interaction, { ephemeral: true });
                }

                const card = new V2Card()
                    .setAccent('primary')
                    .setTitle(`[ACTIVE REMINDERS] ${interaction.user.tag}`)
                    .setDescription(
                        userReminders.slice(0, 10).map((r, i) =>
                            `**${i + 1}.** ${r.message.substring(0, 60)}${r.message.length > 60 ? '...' : ''}\n` +
                            `   Trigger: <t:${Math.floor(r.remindAt / 1000)}:R> • ID: \`${r.id}\``
                        ).join('\n\n')
                    )
                    .setFooter(`Total Reminders: ${userReminders.length}`);

                return card.reply(interaction, { ephemeral: true });
            }

            case 'clear': {
                const userReminders = reminders.filter(r => r.userId === userId);

                if (userReminders.length === 0) {
                    return V2Templates.info(
                        'No Reminders to Clear',
                        'You currently have no scheduled reminders.'
                    ).reply(interaction, { ephemeral: true });
                }

                const { card: confirmCard, row: confirmRow } = V2Templates.confirmation({
                    title: 'Clear All Scheduled Reminders',
                    description: `Are you sure you want to permanently clear all **${userReminders.length}** pending reminder(s)?`,
                    confirmLabel: `Clear ${userReminders.length} Reminder(s)`,
                    cancelLabel: 'Keep Reminders',
                    confirmStyle: ButtonStyle.Danger,
                });

                const replyMsg = await interaction.reply({
                    ...confirmCard.toPayload(),
                    components: [confirmCard.buildContainer()],
                    ephemeral: true,
                    fetchReply: true,
                });

                const collector = replyMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter: i => i.user.id === userId,
                    time: 30000,
                    max: 1,
                });

                collector.on('collect', async i => {
                    if (i.customId === 'confirm_yes') {
                        reminders = reminders.filter(r => r.userId !== userId);
                        saveReminders();

                        return V2Templates.success(
                            'Reminders Cleared',
                            `All **${userReminders.length}** scheduled reminder(s) have been cancelled.`
                        ).update(i);
                    } else {
                        return V2Templates.info(
                            'Action Aborted',
                            'Reminder queue remains active and unmodified.'
                        ).update(i);
                    }
                });

                break;
            }

            case 'cancel': {
                const reminderId = interaction.options.getInteger('id');
                const reminderIndex = reminders.findIndex(r => r.id === reminderId && r.userId === userId);

                if (reminderIndex === -1) {
                    return V2Templates.error(
                        'Reminder Not Found',
                        'No pending reminder matching that ID was found under your account.'
                    ).reply(interaction, { ephemeral: true });
                }

                const cancelled = reminders[reminderIndex];
                reminders.splice(reminderIndex, 1);
                saveReminders();

                return V2Templates.success(
                    'Reminder Cancelled',
                    `Reminder \`#${cancelled.id}\` ("${cancelled.message.substring(0, 40)}") has been removed.`
                ).reply(interaction, { ephemeral: true });
            }
        }
    },

    initReminders(client) {
        const now = Date.now();
        reminders = reminders.filter(r => r.remindAt > now);
        saveReminders();

        reminders.forEach(reminder => {
            scheduleReminder(client, reminder);
        });

        logger.info(`Loaded ${reminders.length} pending reminders`);
    },
};

function scheduleReminder(client, reminder) {
    const delay = reminder.remindAt - Date.now();

    if (delay <= 0) {
        const index = reminders.findIndex(r => r.id === reminder.id);
        if (index !== -1) {
            reminders.splice(index, 1);
            saveReminders();
        }
        return;
    }

    setTimeout(async () => {
        try {
            const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
            const user = await client.users.fetch(reminder.userId).catch(() => null);

            if (!user) return;

            const card = new V2Card()
                .setAccent('info')
                .setTitle('[REMINDER ALERT] Scheduled Notification')
                .setDescription(reminder.message)
                .addField('Scheduled', `<t:${Math.floor(reminder.createdAt / 1000)}:R>`, true)
                .setFooter('Warden Automated Reminders');

            if (channel) {
                await channel.send({
                    content: `<@${reminder.userId}>`,
                    ...card.toPayload()
                }).catch(() => {
                    card.send(user).catch(() => {});
                });
            } else {
                await card.send(user).catch(() => {});
            }

            const index = reminders.findIndex(r => r.id === reminder.id);
            if (index !== -1) {
                reminders.splice(index, 1);
                saveReminders();
            }
        } catch (error) {
            logger.error('Error delivering scheduled reminder:', error);
        }
    }, Math.min(delay, 2147483647));
}
