import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { stopPomodoro } from "../../utils/pomodoroManager.js";

export const data = new SlashCommandBuilder()
  .setName("focus-stop")
  .setDescription("Cancel your active focus session");

export async function execute(interaction) {
  const userId = interaction.user.id;

  const session = stopPomodoro(userId);
  if (!session) {
    return interaction.reply({
      content: "You don't have an active focus session to stop.",
      flags: 64, // MessageFlags.Ephemeral
    });
  }

  await session.unlockChannels();

  const embed = new EmbedBuilder()
    .setTitle("⏹️ Focus Session Cancelled")
    .setDescription("Your focus session has been stopped. You can relax now!")
    .setColor(0xff0000)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
