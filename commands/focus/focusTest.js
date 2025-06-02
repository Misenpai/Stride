import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("focus-test")
  .setDescription("Test command to verify bot is working")
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("Select a channel")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    console.log("Focus-test command executed");

    const channel = interaction.options.getChannel("channel");
    console.log(`Selected channel: ${channel.name} (${channel.id})`);

    const embed = new EmbedBuilder()
      .setTitle("✅ Test Successful")
      .setDescription(`You selected: <#${channel.id}>`)
      .setColor(0x00ff00)
      .setTimestamp();

    console.log("Sending reply...");
    await interaction.reply({ embeds: [embed], flags: 64 });
    console.log("Reply sent successfully");
  } catch (error) {
    console.error("Error in focus-test:", error);

    if (!interaction.replied) {
      await interaction.reply({
        content: "An error occurred: " + error.message,
        flags: 64,
      });
    }
  }
}
