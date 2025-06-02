import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getPomodoroRemaining } from "../../utils/pomodoroManager.js";

export const data = new SlashCommandBuilder()
  .setName("focus-status")
  .setDescription("Check remaining time on your active focus session");

export async function execute(interaction) {
  const userId = interaction.user.id;
  const remainingMs = getPomodoroRemaining(userId);

  if (remainingMs === null) {
    return interaction.reply({
      content: "You don't have an active focus session right now.",
      flags: 64, // MessageFlags.Ephemeral
    });
  }

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const embed = new EmbedBuilder()
    .setTitle("⏱️ Focus Session Status")
    .setDescription(`Time remaining: **${minutes}m ${seconds}s**`)
    .setColor(0x00ff00)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
}
