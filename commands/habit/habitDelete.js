import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import { getUserHabits, deleteHabit } from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-delete")
  .setDescription("Delete a habit from your tracker")
  .addStringOption((option) =>
    option
      .setName("habit")
      .setDescription("Select which habit to delete")
      .setRequired(true)
      .setAutocomplete(true)
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

    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ Confirm Habit Deletion")
      .setDescription(
        `Are you sure you want to delete **${habit.name}**?\n\n` +
          `This will permanently remove:\n` +
          `• ${habit.totalCompletions} logged completions\n` +
          `• ${habit.streak} day current streak\n` +
          `• ${habit.longestStreak} day longest streak\n` +
          `• All historical data\n\n` +
          `**This action cannot be undone!**`
      )
      .setColor(0xff0000)
      .setTimestamp();

    const confirmButton = new ButtonBuilder()
      .setCustomId(`delete_habit_confirm_${habitName}`)
      .setLabel("Yes, Delete Habit")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️");

    const cancelButton = new ButtonBuilder()
      .setCustomId(`delete_habit_cancel_${habitName}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❌");

    const row = new ActionRowBuilder().addComponents(
      confirmButton,
      cancelButton
    );

    const response = await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row],
    });

    try {
      const buttonInteraction = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30000,
        filter: (i) => i.user.id === userId,
      });

      if (buttonInteraction.customId.startsWith("delete_habit_confirm")) {
        const success = deleteHabit(userId, guildId, habitName);

        if (!success) {
          await buttonInteraction.update({
            content: "Failed to delete habit. Please try again.",
            embeds: [],
            components: [],
          });
          return;
        }

        const successEmbed = new EmbedBuilder()
          .setTitle("🗑️ Habit Deleted")
          .setDescription(
            `**${habit.emoji} ${habit.name}** has been permanently deleted.\n\n` +
              `All data associated with this habit has been removed.`
          )
          .setColor(0xff0000)
          .setTimestamp();

        await buttonInteraction.update({
          embeds: [successEmbed],
          components: [],
        });
      } else if (buttonInteraction.customId.startsWith("delete_habit_cancel")) {
        const cancelEmbed = new EmbedBuilder()
          .setTitle("❌ Deletion Cancelled")
          .setDescription(
            `Habit **${habit.emoji} ${habit.name}** was not deleted.`
          )
          .setColor(0x999999)
          .setTimestamp();

        await buttonInteraction.update({
          embeds: [cancelEmbed],
          components: [],
        });
      }
    } catch (error) {
      if (error.code === "InteractionCollectorError") {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ Confirmation Timeout")
          .setDescription("Habit deletion cancelled due to timeout.")
          .setColor(0x999999)
          .setTimestamp();

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: [],
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in habit-delete command:", error);
    const errorMessage = `There was an error deleting your habit: ${error.message}`;
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: errorMessage,
          embeds: [],
          components: [],
        });
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
