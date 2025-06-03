import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getUserHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-list")
  .setDescription("View all your tracked habits")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("View another user's habits (if they're public)")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("detailed")
      .setDescription("Show detailed information for each habit")
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const detailed = interaction.options.getBoolean("detailed") || false;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const isOwnHabits = targetUser.id === interaction.user.id;
    const habits = getUserHabits(targetUser.id, guildId);

    if (!habits || habits.length === 0) {
      const message = isOwnHabits
        ? "You haven't created any habits yet! Use `/habit-create` to get started."
        : `${targetUser.username} hasn't created any habits yet.`;

      return await interaction.editReply({ content: message });
    }

    // Sort habits by current streak (descending) then by name
    const sortedHabits = habits.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.name.localeCompare(b.name);
    });

    const embed = new EmbedBuilder()
      .setTitle(
        `${isOwnHabits ? "Your" : `${targetUser.username}'s`} Habit Tracker`
      )
      .setColor(0x0099ff)
      .setTimestamp();

    if (detailed) {
      // Detailed view - show fewer habits with more info
      const habitsToShow = sortedHabits.slice(0, 5); // Limit to prevent embed size issues

      for (const habit of habitsToShow) {
        const lastCompleted = habit.lastCompleted
          ? new Date(habit.lastCompleted).toLocaleDateString()
          : "Never";

        const progressBar = createProgressBar(
          habit.streak,
          habit.longestStreak
        );

        embed.addFields({
          name: `${habit.emoji} ${habit.name}`,
          value:
            `**Streak:** ${habit.streak} days ${progressBar}\n` +
            `**Best:** ${habit.longestStreak} days\n` +
            `**Total:** ${habit.totalCompletions} completions\n` +
            `**Target:** ${habit.target}/day\n` +
            `**Last:** ${lastCompleted}`,
          inline: true,
        });
      }

      if (habits.length > 5) {
        embed.setFooter({
          text: `Showing 5 of ${habits.length} habits. Use without 'detailed' option to see all.`,
        });
      }
    } else {
      // Compact view - show all habits
      const habitList = sortedHabits
        .map((habit, index) => {
          const streakEmoji = getStreakEmoji(habit.streak);
          const isActive = isHabitActiveToday(habit);
          const activeIndicator = isActive ? "✅" : "⏳";

          return (
            `${index + 1}. ${habit.emoji} **${
              habit.name
            }** ${activeIndicator}\n` +
            `   ${streakEmoji} ${habit.streak} day streak (best: ${habit.longestStreak})`
          );
        })
        .join("\n\n");

      embed.setDescription(habitList);

      // Add summary statistics
      const totalHabits = habits.length;
      const activeToday = habits.filter((h) => isHabitActiveToday(h)).length;
      const totalStreakDays = habits.reduce((sum, h) => sum + h.streak, 0);
      const averageStreak =
        totalHabits > 0 ? Math.round(totalStreakDays / totalHabits) : 0;

      embed.addFields({
        name: "📊 Summary",
        value:
          `**Total Habits:** ${totalHabits}\n` +
          `**Completed Today:** ${activeToday}/${totalHabits}\n` +
          `**Average Streak:** ${averageStreak} days`,
        inline: false,
      });
    }

    embed.setFooter({
      text: isOwnHabits
        ? "Use /habit-log to update your habits!"
        : `Viewing ${targetUser.username}'s habits`,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-list command:", error);

    const errorMessage = `There was an error fetching habits: ${error.message}`;

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

function createProgressBar(current, max, length = 10) {
  if (max === 0) return "▱".repeat(length);

  const filled = Math.round((current / max) * length);
  const empty = length - filled;

  return "▰".repeat(filled) + "▱".repeat(empty);
}

function getStreakEmoji(streak) {
  if (streak >= 100) return "🔥🔥🔥";
  if (streak >= 50) return "🔥🔥";
  if (streak >= 30) return "🔥";
  if (streak >= 14) return "⭐";
  if (streak >= 7) return "✨";
  if (streak >= 3) return "💪";
  if (streak >= 1) return "👍";
  return "🌱";
}

function isHabitActiveToday(habit) {
  if (!habit.completions || habit.completions.length === 0) return false;

  const today = new Date().toISOString().split("T")[0];
  return habit.completions.some((completion) => completion.date === today);
}
