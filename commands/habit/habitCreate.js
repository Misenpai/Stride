import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { createHabit, getUserHabits } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-create")
  .setDescription("Create a new habit to track")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Name of the habit (e.g., 'Drink water', 'Exercise')")
      .setRequired(true)
      .setMaxLength(50)
  )
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("Brief description of the habit")
      .setRequired(false)
      .setMaxLength(200)
  )
  .addStringOption((option) =>
    option
      .setName("frequency")
      .setDescription("How often you want to do this habit")
      .setRequired(false)
      .addChoices(
        { name: "Daily", value: "daily" },
        { name: "Weekly", value: "weekly" },
        { name: "Custom", value: "custom" }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName("target")
      .setDescription(
        "Target number per day/week (e.g., 8 for 8 glasses of water)"
      )
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption((option) =>
    option
      .setName("emoji")
      .setDescription("Emoji to represent this habit (optional)")
      .setRequired(false)
      .setMaxLength(2)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description") || "";
    const frequency = interaction.options.getString("frequency") || "daily";
    const target = interaction.options.getInteger("target") || 1;
    const emoji = interaction.options.getString("emoji") || "✅";

    const existingHabits = getUserHabits(userId, guildId);
    const duplicateHabit = existingHabits.find(
      (habit) => habit.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateHabit) {
      return await interaction.editReply({
        content: `You already have a habit named "${name}". Please choose a different name.`,
      });
    }

    if (existingHabits.length >= 10) {
      return await interaction.editReply({
        content:
          "You can only track up to 10 habits at a time. Please delete some habits first using `/habit-delete`.",
      });
    }

    const habit = {
      name,
      description,
      frequency,
      target,
      emoji,
      createdAt: new Date().toISOString(),
      streak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      lastCompleted: null,
      completions: [],
    };

    const success = createHabit(userId, guildId, habit);

    if (!success) {
      return await interaction.editReply({
        content: "Failed to create habit. Please try again.",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Habit Created Successfully!`)
      .setDescription(`**${name}**`)
      .addFields(
        {
          name: "Description",
          value: description || "No description",
          inline: false,
        },
        {
          name: "Frequency",
          value: frequency.charAt(0).toUpperCase() + frequency.slice(1),
          inline: true,
        },
        { name: "Daily Target", value: target.toString(), inline: true },
        { name: "Current Streak", value: "0 days", inline: true }
      )
      .setColor(0x00ff00)
      .setFooter({ text: `Use /habit-log to start tracking!` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in habit-create command:", error);
    const errorMessage = `There was an error creating your habit: ${error.message}`;
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
