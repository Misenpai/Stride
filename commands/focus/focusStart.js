import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import {
  beginSession,
  checkActive,
  getPomodoroRemaining,
  stopPomodoro,
  lockChannelsForUser,
} from "../../utils/pomodoroManager.js";

export const data = new SlashCommandBuilder()
  .setName("focus-start")
  .setDescription("Begin a Pomodoro focus session")
  .addIntegerOption((option) =>
    option
      .setName("minutes")
      .setDescription("Length of the focus session (default: 25)")
      .setRequired(false)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const minutes = interaction.options.getInteger("minutes") || 25;

  const alreadyRunning = checkActive(userId);
  if (alreadyRunning) {
    return interaction.reply({
      content:
        "You already have an active focus session. Use `/focus-stop` to cancel",
      flags: 64,
    });
  }

  try {
    await lockChannelsForUser(interaction.guild, userId);
    const endTime = Date.now() + minutes * 60 * 1000;
    beginSession(userId, endTime);

    const embed = new EmbedBuilder()
      .setTitle("🔒 Focus Session Started")
      .setDescription(
        `I've locked your configured channels for ${minutes} minutes. Stay focused!`
      )
      .setColor(0x0099ff)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    return interaction.reply({
      content: error.message,
      flags: 64,
    });
  }
}
