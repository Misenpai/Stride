import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getAllUsersHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-leaderboard")
  .setDescription("View the server's habit tracking leaderboard")
  .addStringOption((option) =>
    option
      .setName("category")
      .setDescription("What to rank by")
      .setRequired(false)
      .addChoices(
        { name: "Current Streaks", value: "streak" },
        { name: "Longest Streaks", value: "longest" },
        { name: "Total Completions", value: "completions" },
        { name: "Active Habits", value: "habits" }
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
    const category = interaction.options.getString("category") || "streak";
    const limit = interaction.options.getInteger("limit") || 10;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const allUsersHabits = getAllUsersHabits(guildId);

    if (!allUsersHabits || Object.keys(allUsersHabits).length === 0) {
      return await interaction.editReply({
        content:
          "No habit data found for this server. Start tracking habits with `/habit-create`!",
      });
    }

    // Calculate user statistics
    const userStats = [];

    for (const [userId, habits] of Object.entries(allUsersHabits)) {
      if (!habits || habits.length === 0) continue;

      let totalStreak = 0;
      let longestStreak = 0;
      let totalCompletions = 0;
      let activeHabits = habits.length;

      habits.forEach((habit) => {
        totalStreak += habit.streak;
        longestStreak = Math.max(longestStreak, habit.longestStreak);
        totalCompletions += habit.totalCompletions;
      });

      userStats.push({
        userId,
        totalStreak,
        longestStreak,
        totalCompletions,
        activeHabits,
        averageStreak: Math.round(totalStreak / activeHabits),
      });
    }

    if (userStats.length === 0) {
      return await interaction.editReply({
        content: "No users with habit data found in this server.",
      });
    }

    // Sort based on category
    let sortField, title, description;
    switch (category) {
      case "streak":
        userStats.sort((a, b) => b.totalStreak - a.totalStreak);
        title = "🔥 Current Streak Leaders";
        description = "Users with the highest combined current streaks";
        sortField = "totalStreak";
        break;
      case "longest":
        userStats.sort((a, b) => b.longestStreak - a.longestStreak);
        title = "🏆 Longest Streak Champions";
        description = "Users with the longest single habit streaks";
        sortField = "longestStreak";
        break;
      case "completions":
        userStats.sort((a, b) => b.totalCompletions - a.totalCompletions);
        title = "📊 Total Completion Leaders";
        description = "Users with the most habit completions";
        sortField = "totalCompletions";
        break;
      case "habits":
        userStats.sort((a, b) => b.activeHabits - a.activeHabits);
        title = "🎯 Most Active Trackers";
        description = "Users tracking the most habits";
        sortField = "activeHabits";
        break;
    }

    const topUsers = userStats.slice(0, limit);

    // Build leaderboard
    let leaderboard = "";
    const medals = ["🥇", "🥈", "🥉"];

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const medal = i < 3 ? medals[i] : `${i + 1}.`;

      try {
        const discordUser = await interaction.client.users.fetch(user.userId);
        const username = discordUser.username;

        let statText = "";
        switch (category) {
          case "streak":
            statText = `${user.totalStreak} days (${user.activeHabits} habits)`;
            break;
          case "longest":
            statText = `${user.longestStreak} days`;
            break;
          case "completions":
            statText = `${user.totalCompletions} completions`;
            break;
          case "habits":
            statText = `${user.activeHabits} habits (avg: ${user.averageStreak} days)`;
            break;
        }

        leaderboard += `${medal} **${username}** - ${statText}\n`;
      } catch (error) {
        // User not found or error fetching
        leaderboard += `${medal} *Unknown User* - ${user[sortField]}\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields({
        name: "🏅 Leaderboard",
        value: leaderboard || "No data available",
        inline: false,
      })
      .setColor(0xffd700)
      .setFooter({
        text: `Showing top ${topUsers.length} of ${userStats.length} users`,
      })
      .setTimestamp();

    // Add server statistics
    const totalUsers = userStats.length;
    const totalHabits = userStats.reduce((sum, u) => sum + u.activeHabits, 0);
    const totalCompletions = userStats.reduce(
      (sum, u) => sum + u.totalCompletions,
      0
    );
    const averageHabitsPerUser = Math.round(totalHabits / totalUsers);

    embed.addFields({
      name: "📈 Server Stats",
      value:
        `**Active Users:** ${totalUsers}\n` +
        `**Total Habits:** ${totalHabits}\n` +
        `**Total Completions:** ${totalCompletions}\n` +
        `**Avg. Habits/User:** ${averageHabitsPerUser}`,
      inline: true,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-leaderboard command:", error);

    const errorMessage = `There was an error fetching the leaderboard: ${error.message}`;

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
