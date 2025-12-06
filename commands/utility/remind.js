const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { WardenEmbed, EmbedTemplates, colors, emojis } = require('../../utils/embedBuilder');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

// Reminders storage
const remindersPath = path.join(__dirname, '../../data/reminders.json');
let reminders = [];

// Load reminders on startup
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
    description: 'Set a reminder for yourself',
    usage: 'remind <time> <message>',
    category: 'utility',
    reminders,
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set and manage reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new reminder')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('When to remind you (e.g., 1h, 30m, 2d)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('What to remind you about')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your active reminders')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all your reminders')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel a specific reminder')
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
                    return interaction.reply({
                        embeds: [EmbedTemplates.error(
                            'Invalid time format! Minimum is 1 minute.\n\n' +
                            '**Examples:**\n' +
                            '• `1h` - 1 hour\n' +
                            '• `30m` - 30 minutes\n' +
                            '• `2d` - 2 days\n' +
                            '• `1w` - 1 week'
                        )],
                        ephemeral: true
                    });
                }

                if (duration > 30 * 24 * 60 * 60 * 1000) {
                    return interaction.reply({
                        embeds: [EmbedTemplates.error('Duration Too Long', 'Reminders cannot be set for more than 30 days!')],
                        ephemeral: true
                    });
                }

                const reminderTime = Date.now() + duration;
                const reminder = {
                    id: Date.now(),
                    oderId: userId,
                    userId,
                    channelId: interaction.channel.id,
                    guildId: interaction.guild.id,
                    message,
                    createdAt: Date.now(),
                    remindAt: reminderTime
                };

                reminders.push(reminder);
                saveReminders();

                // Set timeout for reminder
                scheduleReminder(client, reminder);

                const embed = new WardenEmbed()
                    .setColor(colors.success)
                    .setAuthor({ 
                        name: 'Reminder Set',
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`${emojis.success} I'll remind you in **${ms(duration, { long: true })}**`)
                    .addFields(
                        {
                            name: '📝 Reminder',
                            value: message.substring(0, 1024),
                            inline: false
                        },
                        {
                            name: '⏰ Time',
                            value: `<t:${Math.floor(reminderTime / 1000)}:F> (<t:${Math.floor(reminderTime / 1000)}:R>)`,
                            inline: false
                        }
                    )
                    .setFooter({ text: `Reminder ID: ${reminder.id}` })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            case 'list': {
                const userReminders = reminders.filter(r => r.userId === userId);
                
                if (userReminders.length === 0) {
                    return interaction.reply({
                        embeds: [EmbedTemplates.info('No Reminders', 'You have no active reminders.')],
                        ephemeral: true
                    });
                }

                const embed = new WardenEmbed()
                    .setColor(colors.primary)
                    .setAuthor({ 
                        name: 'Your Reminders',
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(
                        userReminders.slice(0, 10).map((r, i) => 
                            `**${i + 1}.** ${r.message.substring(0, 50)}${r.message.length > 50 ? '...' : ''}\n` +
                            `   ⏰ <t:${Math.floor(r.remindAt / 1000)}:R> • ID: \`${r.id}\``
                        ).join('\n\n')
                    )
                    .setFooter({ 
                        text: userReminders.length > 10 
                            ? `Showing 10 of ${userReminders.length} reminders` 
                            : `${userReminders.length} reminder${userReminders.length !== 1 ? 's' : ''}`
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            case 'clear': {
                const userReminders = reminders.filter(r => r.userId === userId);
                
                if (userReminders.length === 0) {
                    return interaction.reply({
                        embeds: [EmbedTemplates.info('No Reminders', 'You have no reminders to clear.')],
                        ephemeral: true
                    });
                }

                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('remind_clear_confirm')
                        .setLabel(`Clear ${userReminders.length} Reminder${userReminders.length !== 1 ? 's' : ''}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('remind_clear_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

                const confirmEmbed = new WardenEmbed()
                    .setColor(colors.warning)
                    .setTitle('⚠️ Clear All Reminders?')
                    .setDescription(
                        `Are you sure you want to clear **${userReminders.length}** reminder${userReminders.length !== 1 ? 's' : ''}?\n\n` +
                        `This action cannot be undone.`
                    );

                const reply = await interaction.reply({ 
                    embeds: [confirmEmbed], 
                    components: [confirmRow],
                    fetchReply: true,
                    ephemeral: true 
                });

                const collector = reply.createMessageComponentCollector({ 
                    filter: i => i.user.id === userId,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async i => {
                    if (i.customId === 'remind_clear_confirm') {
                        reminders = reminders.filter(r => r.userId !== userId);
                        saveReminders();
                        
                        await i.update({
                            embeds: [EmbedTemplates.success('Cleared', `Cleared ${userReminders.length} reminder${userReminders.length !== 1 ? 's' : ''}!`)],
                            components: []
                        });
                    } else {
                        await i.update({
                            embeds: [EmbedTemplates.info('Cancelled', 'Action was cancelled.')],
                            components: []
                        });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        await reply.edit({
                            components: []
                        }).catch(() => {});
                    }
                });

                break;
            }

            case 'cancel': {
                const reminderId = interaction.options.getInteger('id');
                const reminderIndex = reminders.findIndex(r => r.id === reminderId && r.userId === userId);
                
                if (reminderIndex === -1) {
                    return interaction.reply({
                        embeds: [EmbedTemplates.error('Not Found', 'Reminder not found or you don\'t have permission to cancel it.')],
                        ephemeral: true
                    });
                }

                const cancelledReminder = reminders[reminderIndex];
                reminders.splice(reminderIndex, 1);
                saveReminders();

                const embed = new WardenEmbed()
                    .setColor(colors.success)
                    .setAuthor({ name: 'Reminder Cancelled', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`${emojis.success} Successfully cancelled the reminder.`)
                    .addFields({
                        name: '📝 Cancelled Reminder',
                        value: cancelledReminder.message.substring(0, 1024),
                        inline: false
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },

    // Initialize reminders on bot startup
    initReminders(client) {
        // Clean up expired reminders
        const now = Date.now();
        reminders = reminders.filter(r => r.remindAt > now);
        saveReminders();

        // Schedule all pending reminders
        reminders.forEach(reminder => {
            scheduleReminder(client, reminder);
        });

        console.log(`📅 Loaded ${reminders.length} pending reminders`);
    }
};

function scheduleReminder(client, reminder) {
    const delay = reminder.remindAt - Date.now();
    
    if (delay <= 0) {
        // Reminder already passed, remove it
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

            const embed = new WardenEmbed()
                .setColor(colors.info)
                .setAuthor({ 
                    name: '⏰ Reminder!',
                    iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(reminder.message)
                .addFields({
                    name: '📅 Set',
                    value: `<t:${Math.floor(reminder.createdAt / 1000)}:R>`,
                    inline: true
                })
                .setTimestamp();

            // Try to send in channel first
            if (channel) {
                await channel.send({
                    content: `<@${reminder.userId}>`,
                    embeds: [embed]
                }).catch(() => {
                    // If can't send in channel, DM the user
                    user.send({ embeds: [embed] }).catch(() => {});
                });
            } else {
                // DM the user
                await user.send({ embeds: [embed] }).catch(() => {});
            }

            // Remove from storage
            const index = reminders.findIndex(r => r.id === reminder.id);
            if (index !== -1) {
                reminders.splice(index, 1);
                saveReminders();
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }, Math.min(delay, 2147483647)); // Max setTimeout delay
}
