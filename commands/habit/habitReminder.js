import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getHabitsNeedingReminder } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-reminder")
  .setDescription(
    "Send habit reminders to users who haven't completed their daily habits"
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Type of reminder to send")
      .setRequired(false)
      .addChoices(
        { name: "Gentle", value: "gentle" },
        { name: "Motivational", value: "motivational" },
        { name: "Summary", value: "summary" }
      )
  )
  .addBooleanOption((option) =>
    option
      .setName("public")
      .setDescription("Send reminders in this channel (default: private DM)")
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild?.id;
    const reminderType = interaction.options.getString("type") || "gentle";
    const isPublic = interaction.options.getBoolean("public") || false;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const member = interaction.member;
    const hasPermission =
      member.permissions.has("ManageMessages") ||
      member.permissions.has("Administrator");

    if (!hasPermission && isPublic) {
      return await interaction.editReply({
        content:
          "You need 'Manage Messages' permission to send public reminders.",
      });
    }

    const reminders = getHabitsNeedingReminder(guildId);

    if (reminders.length === 0) {
      return await interaction.editReply({
        content:
          "🎉 Great news! Everyone is up to date with their habits today!",
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    if (isPublic) {
      const embed = createPublicReminderEmbed(reminders, reminderType);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    for (const reminder of reminders) {
      try {
        const user = await interaction.client.users.fetch(reminder.userId);
        const embed = createPersonalReminderEmbed(reminder, reminderType);

        await user.send({ embeds: [embed] });
        sentCount++;
      } catch (error) {
        console.error(
          `Failed to send reminder to user ${reminder.userId}:`,
          error
        );
        failedCount++;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("📬 Habit Reminders Sent")
      .setDescription(
        `**Successfully sent:** ${sentCount} reminders\n` +
          `**Failed to send:** ${failedCount} reminders\n\n` +
          `${
            failedCount > 0
              ? "Some users may have DMs disabled."
              : "All reminders delivered successfully!"
          }`
      )
      .setColor(sentCount > 0 ? 0x00ff00 : 0xff9900)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-reminder command:", error);
    const errorMessage = `There was an error sending reminders: ${error.message}`;
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Error sending error message:", replyError);
    }
  }
}

function createPersonalReminderEmbed(reminder, type) {
  const { habit, reminderType } = reminder;
  const messages = getReminderMessages(type, reminderType);

  const embed = new EmbedBuilder()
    .setTitle(`${habit.emoji} ${messages.title}`)
    .setDescription(messages.description)
    .addFields(
      {
        name: "Habit to Complete",
        value: `**${habit.name}**\n${habit.description || "No description"}`,
        inline: false,
      },
      {
        name: "Your Progress",
        value:
          `**Current Streak:** ${habit.streak} days\n` +
          `**Best Streak:** ${habit.longestStreak} days\n` +
          `**Daily Target:** ${habit.target}`,
        inline: true,
      },
      {
        name: "Quick Action",
        value: "Use `/habit-log` in your server to log completion!",
        inline: true,
      }
    )
    .setColor(getColorForStreak(habit.streak))
    .setFooter({ text: messages.footer })
    .setTimestamp();

  return embed;
}

function createPublicReminderEmbed(reminders, type) {
  const userReminders = {};

  for (const reminder of reminders) {
    if (!userReminders[reminder.userId]) {
      userReminders[reminder.userId] = [];
    }
    userReminders[reminder.userId].push(reminder.habit);
  }

  const messages = getReminderMessages(type, "general");

  let reminderText = "";
  for (const [userId, habits] of Object.entries(userReminders)) {
    const habitNames = habits.map((h) => `${h.emoji} ${h.name}`).join(", ");
    reminderText += `<@${userId}> - ${habitNames}\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📢 ${messages.title}`)
    .setDescription(messages.description)
    .addFields({
      name: "Pending Habits",
      value: reminderText || "No pending habits",
      inline: false,
    })
    .setColor(0xff9900)
    .setFooter({ text: "Use /habit-log to update your progress!" })
    .setTimestamp();

  return embed;
}

function getReminderMessages(type, timeOfDay) {
  const messages = {
    gentle: {
      morning: {
        title: "Good Morning! 🌅",
        description:
          "Just a friendly reminder about your habit. No pressure - you've got this!",
        footer: "Every small step counts towards your goals! 🌱",
      },
      afternoon: {
        title: "Afternoon Check-in ☀️",
        description:
          "Hope your day is going well! Don't forget about your habit when you have a moment.",
        footer: "You're doing great - keep it up! 💪",
      },
      evening: {
        title: "Evening Reminder 🌙",
        description:
          "Winding down for the day? There's still time for your habit if you'd like.",
        footer: "Tomorrow is always a fresh start! ✨",
      },
      general: {
        title: "Gentle Habit Reminder",
        description:
          "A friendly nudge for those who haven't completed their daily habits yet.",
        footer: "No pressure - you've got this!",
      },
    },
    motivational: {
      morning: {
        title: "Rise and Shine! 🔥",
        description:
          "Champions start their day strong! Your habit is waiting for you to crush it!",
        footer: "Success is built one habit at a time! 🏆",
      },
      afternoon: {
        title: "Midday Motivation! ⚡",
        description:
          "The day isn't over yet! You have the power to make it count with your habit!",
        footer: "Every rep, every day, every habit matters! 💯",
      },
      evening: {
        title: "Finish Strong! 🚀",
        description:
          "End your day like a champion! Complete your habit and maintain that momentum!",
        footer: "Winners finish what they start! 🏅",
      },
      general: {
        title: "Motivational Habit Reminder",
        description:
          "Time to show your habits who's boss! Your future self will thank you!",
        footer: "Consistency creates champions!",
      },
    },
    summary: {
      morning: {
        title: "Daily Habit Summary 📊",
        description:
          "Here's your habit status for today. Let's make it a productive day!",
        footer: "Track your progress with /habit-log",
      },
      afternoon: {
        title: "Habit Progress Check 📈",
        description: "Here's what you have left to complete today:",
        footer: "Still time to hit your targets!",
      },
      evening: {
        title: "End of Day Summary 📋",
        description: "Here are the habits you haven't completed today:",
        footer: "Tomorrow is a new opportunity!",
      },
      general: {
        title: "Habit Status Summary",
        description: "Here are the habits that still need attention today:",
        footer: "Use /habit-log to update your progress",
      },
    },
  };

  return (
    messages[type]?.[timeOfDay] ||
    messages[type]?.general ||
    messages.gentle.general
  );
}

function getColorForStreak(streak) {
  if (streak >= 30) return 0x8b00ff;
  if (streak >= 14) return 0xff6b00;
  if (streak >= 7) return 0x00ff00;
  if (streak >= 3) return 0x00bfff;
  if (streak >= 1) return 0xffff00;
  return 0x999999;
}
