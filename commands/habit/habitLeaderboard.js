import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getAllUsersHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-leaderboard")
  .setDescription("View the habit leaderboard for this server")
  .addStringOption((option) =>
    option
      .setName("category")
      .setDescription("Leaderboard category to display")
      .setRequired(false)
      .addChoices(
        { name: "Current Streak", value: "streak" },
        { name: "Longest Streak", value: "longest" },
        { name: "Total Completions", value: "completions" },
        { name: "Number of Habits", value: "habits" }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (default: 10)")
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(25)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const guildId = interaction.guild?.id;
    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const category = interaction.options.getString("category") || "streak";
    const limit = interaction.options.getInteger("limit") || 10;

    const allHabits = getAllUsersHabits(guildId);
    if (!allHabits || Object.keys(allHabits).length === 0) {
      return await interaction.editReply({
        content: "No habits have been created in this server yet.",
      });
    }

    const leaderboard = [];
    let totalHabits = 0;
    let totalUsers = 0;
    let totalCompletions = 0;
    let totalActiveStreaks = 0;

    for (const [userId, habits] of Object.entries(allHabits)) {
      if (!Array.isArray(habits) || habits.length === 0) continue;

      totalUsers++;
      totalHabits += habits.length;

      let totalStreak = 0;
      let longestStreak = 0;
      let totalCompletionsUser = 0;
      let activeHabits = habits.length;

      for (const habit of habits) {
        totalStreak += habit.streak;
        longestStreak = Math.max(longestStreak, habit.longestStreak);
        totalCompletionsUser += habit.totalCompletions;
        if (habit.streak > 0) totalActiveStreaks++;
        totalCompletions += habit.totalCompletions;
      }

      leaderboard.push({
        userId,
        totalStreak,
        longestStreak,
        totalCompletions: totalCompletionsUser,
        activeHabits,
      });
    }

    let sortedLeaderboard;
    let fieldName;

    switch (category) {
      case "streak":
        sortedLeaderboard = leaderboard.sort(
          (a, b) => b.totalStreak - a.totalStreak
        );
        fieldName = "Total Current Streak";
        break;
      case "longest":
        sortedLeaderboard = leaderboard.sort(
          (a, b) => b.longestStreak - a.longestStreak
        );
        fieldName = "Longest Streak";
        break;
      case "completions":
        sortedLeaderboard = leaderboard.sort(
          (a, b) => b.totalCompletions - a.totalCompletions
        );
        fieldName = "Total Completions";
        break;
      case "habits":
        sortedLeaderboard = leaderboard.sort(
          (a, b) => b.activeHabits - a.activeHabits
        );
        fieldName = "Active Habits";
        break;
      default:
        sortedLeaderboard = leaderboard.sort(
          (a, b) => b.totalStreak - a.totalStreak
        );
        fieldName = "Total Current Streak";
    }

    sortedLeaderboard = sortedLeaderboard.slice(0, limit);

    let leaderboardText = "";
    for (let i = 0; i < sortedLeaderboard.length; i++) {
      const entry = sortedLeaderboard[i];
      const value = entry[category] || entry.totalStreak;
      const position = i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`;
      leaderboardText += `${position} <@${entry.userId}> - ${value} (${
        entry.activeHabits
      } habit${entry.activeHabits !== 1 ? "s" : ""})\n`;
    }

    if (!leaderboardText) {
      leaderboardText = "No data available for this category.";
    }

    const embed = new EmbedBuilder()
      .setTitle(
        `🏆 Habit Leaderboard - ${
          category.charAt(0).toUpperCase() + category.slice(1)
        }`
      )
      .setDescription("Top habit trackers in this server!")
      .addFields(
        {
          name: fieldName,
          value: leaderboardText,
          inline: false,
        },
        {
          name: "Server Stats",
          value:
            `**Total Users:** ${totalUsers}\n` +
            `**Total Habits:** ${totalHabits}\n` +
            `**Total Completions:** ${totalCompletions}\n` +
            `**Active Streaks:** ${totalActiveStreaks}`,
          inline: true,
        }
      )
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: "Keep up those habits!" });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-leaderboard command:", error);
    const errorMessage = `There was an error generating the leaderboard: ${error.message}`;
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
