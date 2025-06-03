import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getUserHabits, logHabitCompletion } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-log")
  .setDescription("Log completion of a habit")
  .addStringOption((option) =>
    option
      .setName("habit")
      .setDescription("Select which habit to log")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Number of times completed (default: 1)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription("Date to log for (YYYY-MM-DD, default: today)")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("notes")
      .setDescription("Optional notes about this completion")
      .setRequired(false)
      .setMaxLength(200)
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
    const count = interaction.options.getInteger("count") || 1;
    const dateStr = interaction.options.getString("date");
    const notes = interaction.options.getString("notes") || "";

    let logDate = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr + "T00:00:00");
      if (isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
        return await interaction.editReply({
          content:
            "Invalid date format. Please use YYYY-MM-DD format and ensure the date is not in the future.",
        });
      }
      logDate = parsedDate;
    }

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

    const dateString = logDate.toISOString().split("T")[0];
    const alreadyLogged = habit.completions.some(
      (completion) => completion.date === dateString
    );

    if (alreadyLogged) {
      return await interaction.editReply({
        content: `You've already logged "${habit.name}" for ${dateString}. Use \`/habit-edit\` to modify existing entries.`,
      });
    }

    const result = logHabitCompletion(userId, guildId, habitName, {
      date: dateString,
      count,
      notes,
      timestamp: new Date().toISOString(),
    });

    if (!result.success) {
      return await interaction.editReply({
        content:
          result.error || "Failed to log habit completion. Please try again.",
      });
    }

    const updatedHabit = result.habit;
    const streakInfo = result.streakInfo;

    let celebrationMessage = "";
    if (streakInfo.isNewRecord) {
      celebrationMessage = `🎉 **NEW RECORD!** You've reached your longest streak ever!`;
    } else if (updatedHabit.streak > 0) {
      const milestones = [7, 14, 30, 50, 100];
      const milestone = milestones.find((m) => updatedHabit.streak === m);
      if (milestone) {
        celebrationMessage = `🔥 **MILESTONE!** ${milestone} day streak achieved!`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${updatedHabit.emoji} Habit Logged!`)
      .setDescription(`**${updatedHabit.name}** - ${count}x completed`)
      .addFields(
        {
          name: "Current Streak",
          value: `${updatedHabit.streak} days`,
          inline: true,
        },
        {
          name: "Longest Streak",
          value: `${updatedHabit.longestStreak} days`,
          inline: true,
        },
        {
          name: "Total Completions",
          value: updatedHabit.totalCompletions.toString(),
          inline: true,
        },
        { name: "Date", value: dateString, inline: true },
        {
          name: "Target Progress",
          value: `${count}/${updatedHabit.target}${
            count >= updatedHabit.target ? " ✅" : ""
          }`,
          inline: true,
        }
      )
      .setColor(count >= updatedHabit.target ? 0x00ff00 : 0xffaa00)
      .setTimestamp();

    if (notes) {
      embed.addFields({ name: "Notes", value: notes, inline: false });
    }

    if (celebrationMessage) {
      embed.addFields({
        name: "🎊 Celebration",
        value: celebrationMessage,
        inline: false,
      });
    }

    if (streakInfo.streakBroken) {
      embed.addFields({
        name: "⚠️ Streak Status",
        value: "Previous streak ended, but you're starting fresh!",
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-log command:", error);
    const errorMessage = `There was an error logging your habit: ${error.message}`;
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
