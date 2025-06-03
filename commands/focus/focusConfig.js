
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  MessageFlags,
} from "discord.js";
import { setUserChannels, getUserChannels } from "../../utils/userConfig.js";

export const data = new SlashCommandBuilder()
  .setName("focus-config")
  .setDescription("Configure which channels to lock during your focus sessions")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add channels to your lock list")
      .addChannelOption((option) =>
        option
          .setName("channel1")
          .setDescription("First channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("channel2")
          .setDescription("Second channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((option) =>
        option
          .setName("channel3")
          .setDescription("Third channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((option) =>
        option
          .setName("channel4")
          .setDescription("Fourth channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((option) =>
        option
          .setName("channel5")
          .setDescription("Fifth channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a channel from your lock list")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel to remove from lock list")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("View your current locked channels")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Clear all channels from your lock list")
  );

export async function execute(interaction) {
  try {
    console.log(
      `Focus-config command received: ${interaction.options.getSubcommand()}`
    );
    console.log(
      `User ID: ${interaction.user.id}, Guild ID: ${interaction.guild?.id}`
    );

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    console.log("deferReply() succeeded; awaiting editReply later...");

    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return await interaction.editReply({
        content: "This command can only be used in a server.",
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        await handleAdd(interaction, userId, guildId);
        break;
      case "remove":
        await handleRemove(interaction, userId, guildId);
        break;
      case "list":
        await handleList(interaction, userId, guildId);
        break;
      case "clear":
        await handleClear(interaction, userId, guildId);
        break;
      default:
        await interaction.editReply({
          content: "Unknown subcommand.",
        });
    }
  } catch (error) {
    console.error("Error in focus-config command:", error);
    console.error("Error stack:", error.stack);

    const errorMessage = `There was an error processing your request: ${error.message}`;

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

async function handleAdd(interaction, userId, guildId) {
  try {
    console.log(`Adding channels for user ${userId} in guild ${guildId}`);

    const channels = [];


    for (let i = 1; i <= 5; i++) {
      const channel = interaction.options.getChannel(`channel${i}`);
      if (channel) {
        console.log(`Found channel${i}: ${channel.name} (${channel.id})`);
        channels.push(channel.id);
      }
    }

    if (channels.length === 0) {
      console.log("No channels provided");
      return await interaction.editReply({
        content: "Please specify at least one channel to add.",
      });
    }


    const existingChannels = getUserChannels(userId, guildId) || [];
    console.log(`Existing channels: ${JSON.stringify(existingChannels)}`);

    const newChannels = [...new Set([...existingChannels, ...channels])];
    console.log(`New channels list: ${JSON.stringify(newChannels)}`);

    setUserChannels(userId, guildId, newChannels);
    console.log("Channels saved successfully");

    const channelMentions = channels.map((id) => `<#${id}>`).join(", ");

    const embed = new EmbedBuilder()
      .setTitle("✅ Channels Added")
      .setDescription(`Added ${channelMentions} to your focus lock list.`)
      .setColor(0x00ff00)
      .setTimestamp();

    console.log("Sending reply...");
    console.log("About to call editReply({ embeds }) for 'add'...");
    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in handleAdd:", error);
    throw error;
  }
}

async function handleRemove(interaction, userId, guildId) {
  try {
    const channelToRemove = interaction.options.getChannel("channel");
    const existingChannels = getUserChannels(userId, guildId) || [];

    if (!existingChannels.includes(channelToRemove.id)) {
      return await interaction.editReply({
        content: `<#${channelToRemove.id}> is not in your lock list.`,
      });
    }

    const updatedChannels = existingChannels.filter(
      (id) => id !== channelToRemove.id
    );
    setUserChannels(userId, guildId, updatedChannels);

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Channel Removed")
      .setDescription(
        `Removed <#${channelToRemove.id}> from your focus lock list.`
      )
      .setColor(0xff9900)
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in handleRemove:", error);
    throw error;
  }
}

async function handleList(interaction, userId, guildId) {
  try {
    const channels = getUserChannels(userId, guildId) || [];

    if (channels.length === 0) {
      return await interaction.editReply({
        content:
          "You haven't configured any channels to lock yet. Use `/focus-config add` to set them up.",
      });
    }

    const channelList = channels.map((id) => `<#${id}>`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🔒 Your Focus Lock Channels")
      .setDescription(channelList)
      .setColor(0x0099ff)
      .setFooter({ text: `${channels.length} channel(s) configured` })
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in handleList:", error);
    throw error;
  }
}

async function handleClear(interaction, userId, guildId) {
  try {
    const existingChannels = getUserChannels(userId, guildId) || [];

    if (existingChannels.length === 0) {
      return await interaction.editReply({
        content: "Your channel lock list is already empty.",
      });
    }

    setUserChannels(userId, guildId, []);

    const embed = new EmbedBuilder()
      .setTitle("🧹 Channels Cleared")
      .setDescription(
        "All channels have been removed from your focus lock list."
      )
      .setColor(0xff0000)
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error in handleClear:", error);
    throw error;
  }
}
