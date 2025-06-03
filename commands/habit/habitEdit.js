import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  getUserHabits,
  updateHabit,
  deleteHabitCompletion,
} from "../../utils/habitManager.js";

export const data = new SlashCommandBuilder()
  .setName("habit-edit")
  .setDescription("Edit a habit or its completion entries")
  .addStringOption((option) =>
    option
      .setName("habit")
      .setDescription("Select which habit to edit")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("What do you want to edit?")
      .setRequired(true)
      .addChoices(
        { name: "Edit Habit Details", value: "details" },
        { name: "Edit Completion Entry", value: "completion" },
        { name: "Delete Completion Entry", value: "delete_completion" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription(
        "Date of completion to edit/delete (YYYY-MM-DD, for completion actions)"
      )
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    // Handle autocomplete
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
        value: habit.id,
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

    const habitId = interaction.options.getString("habit");
    const action = interaction.options.getString("action");
    const dateStr = interaction.options.getString("date");

    const habits = getUserHabits(userId, guildId);
    const habit = habits.find((h) => h.id === habitId);

    if (!habit) {
      return await interaction.editReply({
        content:
          "Habit not found. Please make sure you've created this habit first.",
      });
    }

    if (action === "details") {
      await handleEditDetails(interaction, habit, userId, guildId);
    } else if (action === "completion") {
      await handleEditCompletion(interaction, habit, userId, guildId, dateStr);
    } else if (action === "delete_completion") {
      await handleDeleteCompletion(
        interaction,
        habit,
        userId,
        guildId,
        dateStr
      );
    }
  } catch (error) {
    console.error("Error in habit-edit command:", error);

    const errorMessage = `There was an error editing your habit: ${error.message}`;

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

async function handleEditDetails(interaction, habit, userId, guildId) {
  const modal = new ModalBuilder()
    .setCustomId(`edit_habit_${habit.id}`)
    .setTitle(`Edit: ${habit.name}`);

  const nameInput = new TextInputBuilder()
    .setCustomId("habit_name")
    .setLabel("Habit Name")
    .setStyle(TextInputStyle.Short)
    .setValue(habit.name)
    .setMaxLength(50)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("habit_description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(habit.description || "")
    .setMaxLength(200)
    .setRequired(false);

  const targetInput = new TextInputBuilder()
    .setCustomId("habit_target")
    .setLabel("Daily Target")
    .setStyle(TextInputStyle.Short)
    .setValue(habit.target.toString())
    .setMaxLength(3)
    .setRequired(true);

  const emojiInput = new TextInputBuilder()
    .setCustomId("habit_emoji")
    .setLabel("Emoji")
    .setStyle(TextInputStyle.Short)
    .setValue(habit.emoji)
    .setMaxLength(2)
    .setRequired(false);

  const nameRow = new ActionRowBuilder().addComponents(nameInput);
  const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
  const targetRow = new ActionRowBuilder().addComponents(targetInput);
  const emojiRow = new ActionRowBuilder().addComponents(emojiInput);

  modal.addComponents(nameRow, descriptionRow, targetRow, emojiRow);

  await interaction.showModal(modal);

  // Wait for modal submission
  try {
    const modalInteraction = await interaction.awaitModalSubmit({
      time: 300000, // 5 minutes
      filter: (i) =>
        i.user.id === userId && i.customId === `edit_habit_${habit.id}`,
    });

    const newName = modalInteraction.fields.getTextInputValue("habit_name");
    const newDescription =
      modalInteraction.fields.getTextInputValue("habit_description");
    const newTarget = parseInt(
      modalInteraction.fields.getTextInputValue("habit_target")
    );
    const newEmoji =
      modalInteraction.fields.getTextInputValue("habit_emoji") || "✅";

    // Validate target
    if (isNaN(newTarget) || newTarget < 1 || newTarget > 100) {
      await modalInteraction.reply({
        content: "Daily target must be a number between 1 and 100.",
        ephemeral: true,
      });
      return;
    }

    // Check for duplicate names (excluding current habit)
    const existingHabits = getUserHabits(userId, guildId);
    const duplicateHabit = existingHabits.find(
      (h) => h.id !== habit.id && h.name.toLowerCase() === newName.toLowerCase()
    );

    if (duplicateHabit) {
      await modalInteraction.reply({
        content: `You already have a habit named "${newName}". Please choose a different name.`,
        ephemeral: true,
      });
      return;
    }

    const updatedHabit = {
      ...habit,
      name: newName,
      description: newDescription,
      target: newTarget,
      emoji: newEmoji,
      updatedAt: new Date().toISOString(),
    };

    const success = updateHabit(userId, guildId, habit.id, updatedHabit);

    if (!success) {
      await modalInteraction.reply({
        content: "Failed to update habit. Please try again.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${newEmoji} Habit Updated Successfully!`)
      .setDescription(`**${newName}**`)
      .addFields(
        {
          name: "Description",
          value: newDescription || "No description",
          inline: false,
        },
        {
          name: "Daily Target",
          value: newTarget.toString(),
          inline: true,
        },
        {
          name: "Current Streak",
          value: `${habit.streak} days`,
          inline: true,
        }
      )
      .setColor(0x00ff00)
      .setTimestamp();

    await modalInteraction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    if (error.code === "InteractionCollectorError") {
      // Timeout - edit the original response since we can't show the modal again
      await interaction.editReply({
        content: "Edit timeout. Please try the command again.",
      });
    } else {
      throw error;
    }
  }
}

async function handleEditCompletion(
  interaction,
  habit,
  userId,
  guildId,
  dateStr
) {
  if (!dateStr) {
    await interaction.editReply({
      content:
        "Please provide a date (YYYY-MM-DD) for the completion entry you want to edit.",
    });
    return;
  }

  // Validate date
  const parsedDate = new Date(dateStr + "T00:00:00");
  if (isNaN(parsedDate.getTime())) {
    await interaction.editReply({
      content: "Invalid date format. Please use YYYY-MM-DD format.",
    });
    return;
  }

  const completion = habit.completions.find((c) => c.date === dateStr);
  if (!completion) {
    await interaction.editReply({
      content: `No completion entry found for ${dateStr}. Use \`/habit-log\` to create a new entry.`,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`edit_completion_${habit.id}_${dateStr}`)
    .setTitle(`Edit Completion: ${habit.name}`);

  const countInput = new TextInputBuilder()
    .setCustomId("completion_count")
    .setLabel("Count")
    .setStyle(TextInputStyle.Short)
    .setValue(completion.count.toString())
    .setMaxLength(3)
    .setRequired(true);

  const notesInput = new TextInputBuilder()
    .setCustomId("completion_notes")
    .setLabel("Notes")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(completion.notes || "")
    .setMaxLength(200)
    .setRequired(false);

  const countRow = new ActionRowBuilder().addComponents(countInput);
  const notesRow = new ActionRowBuilder().addComponents(notesInput);

  modal.addComponents(countRow, notesRow);

  await interaction.showModal(modal);

  try {
    const modalInteraction = await interaction.awaitModalSubmit({
      time: 300000, // 5 minutes
      filter: (i) =>
        i.user.id === userId &&
        i.customId === `edit_completion_${habit.id}_${dateStr}`,
    });

    const newCount = parseInt(
      modalInteraction.fields.getTextInputValue("completion_count")
    );
    const newNotes =
      modalInteraction.fields.getTextInputValue("completion_notes");

    if (isNaN(newCount) || newCount < 1 || newCount > 100) {
      await modalInteraction.reply({
        content: "Count must be a number between 1 and 100.",
        ephemeral: true,
      });
      return;
    }

    // Update the completion entry
    const updatedCompletion = {
      ...completion,
      count: newCount,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    };

    const completionIndex = habit.completions.findIndex(
      (c) => c.date === dateStr
    );
    habit.completions[completionIndex] = updatedCompletion;

    // Recalculate total completions
    habit.totalCompletions = habit.completions.reduce(
      (sum, c) => sum + c.count,
      0
    );

    const success = updateHabit(userId, guildId, habit.id, habit);

    if (!success) {
      await modalInteraction.reply({
        content: "Failed to update completion entry. Please try again.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${habit.emoji} Completion Updated!`)
      .setDescription(`**${habit.name}** - ${dateStr}`)
      .addFields(
        {
          name: "Count",
          value: newCount.toString(),
          inline: true,
        },
        {
          name: "Target Progress",
          value: `${newCount}/${habit.target}${
            newCount >= habit.target ? " ✅" : ""
          }`,
          inline: true,
        },
        {
          name: "Notes",
          value: newNotes || "No notes",
          inline: false,
        }
      )
      .setColor(newCount >= habit.target ? 0x00ff00 : 0xffaa00)
      .setTimestamp();

    await modalInteraction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    if (error.code === "InteractionCollectorError") {
      await interaction.editReply({
        content: "Edit timeout. Please try the command again.",
      });
    } else {
      throw error;
    }
  }
}

async function handleDeleteCompletion(
  interaction,
  habit,
  userId,
  guildId,
  dateStr
) {
  if (!dateStr) {
    await interaction.editReply({
      content:
        "Please provide a date (YYYY-MM-DD) for the completion entry you want to delete.",
    });
    return;
  }

  const completion = habit.completions.find((c) => c.date === dateStr);
  if (!completion) {
    await interaction.editReply({
      content: `No completion entry found for ${dateStr}.`,
    });
    return;
  }

  // Create confirmation embed
  const confirmEmbed = new EmbedBuilder()
    .setTitle("⚠️ Confirm Completion Deletion")
    .setDescription(
      `Are you sure you want to delete the completion entry for **${habit.name}** on **${dateStr}**?\n\n` +
        `This will remove:\n` +
        `• ${completion.count} completion(s)\n` +
        `• Notes: ${completion.notes || "None"}\n\n` +
        `**This action cannot be undone and may affect your streak!**`
    )
    .setColor(0xff0000)
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`delete_completion_confirm_${habit.id}_${dateStr}`)
    .setLabel("Yes, Delete Entry")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🗑️");

  const cancelButton = new ButtonBuilder()
    .setCustomId(`delete_completion_cancel_${habit.id}_${dateStr}`)
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("❌");

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

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

    if (buttonInteraction.customId.startsWith("delete_completion_confirm")) {
      const success = deleteHabitCompletion(userId, guildId, habit.id, dateStr);

      if (!success) {
        await buttonInteraction.update({
          content: "Failed to delete completion entry. Please try again.",
          embeds: [],
          components: [],
        });
        return;
      }

      const successEmbed = new EmbedBuilder()
        .setTitle("🗑️ Completion Deleted")
        .setDescription(
          `Completion entry for **${habit.emoji} ${habit.name}** on **${dateStr}** has been deleted.\n\n` +
            `Your habit streak may have been recalculated.`
        )
        .setColor(0xff0000)
        .setTimestamp();

      await buttonInteraction.update({
        embeds: [successEmbed],
        components: [],
      });
    } else if (
      buttonInteraction.customId.startsWith("delete_completion_cancel")
    ) {
      const cancelEmbed = new EmbedBuilder()
        .setTitle("❌ Deletion Cancelled")
        .setDescription(
          `Completion entry for **${habit.emoji} ${habit.name}** was not deleted.`
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
        .setDescription("Completion deletion cancelled due to timeout.")
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
}
