import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getUserHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-status")
  .setDescription("View detailed status of a specific habit")
  .addStringOption((option) =>
    option
      .setName("habit")
      .setDescription("Select which habit to view")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("days")
      .setDescription("Number of recent days to show (default: 7)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(30)
  );

export async function execute(interaction) {
  try {
    if (interaction.isAutocomplete()) {
      const focusedValue = interaction.options.getFocused();
      const userId = interaction.user.id;
      const guildId = interaction.guild?.id;

      if (!guildId) {
        return await interaction.respond([]);
      }

      const habits = getUserHabits(userId, guildId);
      const filtered = habits
        .filter((habit) =>
          habit.name.toLowerCase().includes(focusedValue.toLowerCase())
        )
        .slice(0, 25);

      const choices = filtered.map((habit) => ({
        name: `${habit.emoji} ${habit.name}`,
        value: habit.name,
      }));

      return await interaction.respond(choices);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const habitName = interaction.options.getString("habit");
    const days = interaction.options.getInteger("days") || 7;

    const habits = getUserHabits(userId, guildId);
    const habit = habits.find(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );

    if (!habit) {
      return await interaction.editReply({
        content:
          "Habit not found. Please make sure you've created this habit first.",
      });
    }

    const totalDays = Math.ceil(
      (new Date() - new Date(habit.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const completionRate =
      totalDays > 0
        ? Math.round((habit.totalCompletions / totalDays) * 100)
        : 0;

    const recentDays = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const completion = habit.completions.find((c) => c.date === dateStr);
      recentDays.push({
        date: dateStr,
        completed: !!completion,
        count: completion?.count || 0,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }

    const calendar = createCalendar(recentDays, habit.target);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyCompletions = habit.completions.filter((c) => {
      const completionDate = new Date(c.date);
      return (
        completionDate.getMonth() === currentMonth &&
        completionDate.getFullYear() === currentYear
      );
    });

    const embed = new EmbedBuilder()
      .setTitle(`${habit.emoji} ${habit.name}`)
      .setDescription(habit.description || "No description provided")
      .addFields(
        {
          name: "📊 Statistics",
          value:
            `**Current Streak:** ${habit.streak} days\n` +
            `**Longest Streak:** ${habit.longestStreak} days\n` +
            `**Total Completions:** ${habit.totalCompletions}\n` +
            `**Completion Rate:** ${completionRate}%`,
          inline: true,
        },
        {
          name: "📅 This Month",
          value:
            `**Completions:** ${monthlyCompletions.length}\n` +
            `**Target:** ${habit.target}/day\n` +
            `**Frequency:** ${habit.frequency}\n` +
            `**Created:** ${new Date(habit.createdAt).toLocaleDateString()}`,
          inline: true,
        },
        {
          name: `📆 Last ${days} Days`,
          value: calendar,
          inline: false,
        }
      )
      .setColor(habit.streak > 0 ? 0x00ff00 : 0x999999)
      .setTimestamp();

    if (habit.lastCompleted) {
      const lastCompletion = habit.completions[habit.completions.length - 1];
      embed.addFields({
        name: "🕐 Last Completion",
        value:
          `**Date:** ${habit.lastCompleted}\n` +
          `**Count:** ${lastCompletion?.count || 1}\n` +
          `**Notes:** ${lastCompletion?.notes || "None"}`,
        inline: false,
      });
    }

    let motivationMessage = "";
    if (habit.streak === 0) {
      motivationMessage =
        "🌱 Ready to start your streak? Log your habit today!";
    } else if (habit.streak < 7) {
      motivationMessage = `💪 Great start! ${
        7 - habit.streak
      } more days to reach a week!`;
    } else if (habit.streak < 30) {
      motivationMessage = `⭐ Amazing streak! ${
        30 - habit.streak
      } more days to reach a month!`;
    } else {
      motivationMessage = "🔥 Incredible dedication! You're on fire!";
    }

    embed.setFooter({ text: motivationMessage });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-status command:", error);
    const errorMessage = `There was an error fetching habit status: ${error.message}`;
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

function createCalendar(days, target) {
  const dayNames = days.map((d) => d.dayName).join("   ");
  const dayNumbers = days
    .map((d) => String(new Date(d.date).getDate()).padStart(2, " "))
    .join("  ");

  const completionSymbols = days
    .map((d) => {
      if (!d.completed) return "⭕";
      if (d.count >= target) return "✅";
      return "🟡";
    })
    .join("  ");

  return `\`\`\`
  ${dayNames}
  ${dayNumbers}
  ${completionSymbols}
  \`\`\``;
}
