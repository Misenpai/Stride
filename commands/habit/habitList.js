import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getUserHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-list")
  .setDescription("List all your habits or view someone else's")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Select a user to view their habits (default: you)")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("detailed")
      .setDescription("Show detailed view with progress bars (default: false)")
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild?.id;
    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const detailed = interaction.options.getBoolean("detailed") || false;
    const userId = targetUser.id;

    const habits = getUserHabits(userId, guildId);
    if (!habits || habits.length === 0) {
      return await interaction.editReply({
        content: `<@${userId}> has no habits tracked yet. Use \`/habit-create\` to start!`,
      });
    }

    const sortedHabits = habits.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.name.localeCompare(b.name);
    });

    let embed;
    if (detailed) {
      embed = createDetailedEmbed(sortedHabits, targetUser);
    } else {
      embed = createCompactEmbed(sortedHabits, targetUser);
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-list command:", error);
    const errorMessage = `There was an error listing habits: ${error.message}`;
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

function createCompactEmbed(habits, user) {
  let habitList = "";
  let totalCompletions = 0;
  let activeStreaks = 0;

  for (const habit of habits) {
    const streakEmoji = getStreakEmoji(habit.streak);
    habitList += `${habit.emoji} **${habit.name}** - Streak: ${habit.streak} days ${streakEmoji}\n`;
    totalCompletions += habit.totalCompletions;
    if (habit.streak > 0) activeStreaks++;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${user.username}'s Habits`)
    .setDescription(habitList || "No habits found.")
    .addFields({
      name: "Summary",
      value:
        `**Total Habits:** ${habits.length}\n` +
        `**Active Streaks:** ${activeStreaks}\n` +
        `**Total Completions:** ${totalCompletions}`,
      inline: true,
    })
    .setColor(0x00ff00)
    .setTimestamp()
    .setThumbnail(user.displayAvatarURL());

  return embed;
}

function createDetailedEmbed(habits, user) {
  const displayedHabits = habits.slice(0, 5);
  let fields = [];

  for (const habit of displayedHabits) {
    const progressBar = createProgressBar(habit.streak, habit.longestStreak);
    const streakEmoji = getStreakEmoji(habit.streak);
    const isActiveToday = isHabitActiveToday(habit);

    let fieldValue =
      `**Description:** ${habit.description || "No description"}\n` +
      `**Frequency:** ${
        habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)
      }\n` +
      `**Target:** ${habit.target}/day\n` +
      `**Streak:** ${habit.streak} days ${streakEmoji}\n` +
      `**Longest Streak:** ${habit.longestStreak} days\n` +
      `**Total Completions:** ${habit.totalCompletions}\n` +
      `**Progress:** ${progressBar}\n` +
      `**Status Today:** ${
        isActiveToday ? "✅ Completed" : "⭕ Not Completed"
      }`;

    if (habit.lastCompleted) {
      fieldValue += `\n**Last Completed:** ${new Date(
        habit.lastCompleted
      ).toLocaleDateString()}`;
    }

    fields.push({
      name: `${habit.emoji} ${habit.name}`,
      value: fieldValue,
      inline: false,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${user.username}'s Habits (Detailed View)`)
    .setDescription(
      habits.length > 5
        ? `Showing 5 of ${habits.length} habits. Use compact view or refine your query to see more.`
        : "Detailed view of all habits."
    )
    .addFields(fields)
    .setColor(0x00ff00)
    .setTimestamp()
    .setThumbnail(user.displayAvatarURL());

  return embed;
}

function createProgressBar(current, max) {
  if (max === 0) return "▱▱▱▱▱";
  const filled = Math.min(Math.round((current / max) * 5), 5);
  const empty = 5 - filled;
  return "▰".repeat(filled) + "▱".repeat(empty);
}

function getStreakEmoji(streak) {
  if (streak >= 30) return "🔥🔥";
  if (streak >= 14) return "🔥";
  if (streak >= 7) return "🌟";
  if (streak >= 3) return "💪";
  if (streak >= 1) return "✅";
  return "";
}

function isHabitActiveToday(habit) {
  const today = new Date().toISOString().split("T")[0];
  return habit.completions.some((c) => c.date === today);
}
