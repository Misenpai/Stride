// commands/focus/focusConfig.js
import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import { setUserChannels, getUserChannels } from "../../utils/userConfig.js";

export const data = new SlashCommandBuilder()
  .setName("focus-config")
  .setDescription("Configure which channels to lock during your focus sessions")
  .addSubcommand(subcommand =>
    subcommand
      .setName("add")
      .setDescription("Add channels to your lock list")
      .addChannelOption(option =>
        option
          .setName("channel1")
          .setDescription("First channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true))
      .addChannelOption(option =>
        option
          .setName("channel2")
          .setDescription("Second channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false))
      .addChannelOption(option =>
        option
          .setName("channel3")
          .setDescription("Third channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false))
      .addChannelOption(option =>
        option
          .setName("channel4")
          .setDescription("Fourth channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false))
      .addChannelOption(option =>
        option
          .setName("channel5")
          .setDescription("Fifth channel to lock")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)))
  .addSubcommand(subcommand =>
    subcommand
      .setName("remove")
      .setDescription("Remove a channel from your lock list")
      .addChannelOption(option =>
        option
          .setName("channel")
          .setDescription("Channel to remove from lock list")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName("list")
      .setDescription("View your current locked channels"))
  .addSubcommand(subcommand =>
    subcommand
      .setName("clear")
      .setDescription("Clear all channels from your lock list"));

export async function execute(interaction) {
  try {
    console.log(`Focus-config command received: ${interaction.options.getSubcommand()}`);
    
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
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
        await interaction.reply({
          content: "Unknown subcommand.",
          flags: 64
        });
    }
  } catch (error) {
    console.error("Error in focus-config command:", error);
    
    const errorMessage = "There was an error processing your request. Please try again.";
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: errorMessage,
        flags: 64
      });
    } else {
      await interaction.followUp({
        content: errorMessage,
        flags: 64
      });
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
      return await interaction.reply({
        content: "Please specify at least one channel to add.",
        flags: 64
      });
    }

    const existingChannels = getUserChannels(userId, guildId) || [];
    console.log(`Existing channels: ${existingChannels}`);
    
    const newChannels = [...new Set([...existingChannels, ...channels])];
    console.log(`New channels list: ${newChannels}`);
    
    setUserChannels(userId, guildId, newChannels);
    console.log("Channels saved successfully");

    const channelMentions = channels.map(id => `<#${id}>`).join(", ");
    
    const embed = new EmbedBuilder()
      .setTitle("✅ Channels Added")
      .setDescription(`Added ${channelMentions} to your focus lock list.`)
      .setColor(0x00ff00)
      .setTimestamp();

    console.log("Sending reply...");
    return await interaction.reply({ embeds: [embed], flags: 64 });
  } catch (error) {
    console.error("Error in handleAdd:", error);
    throw error;
  }
}

async function handleRemove(interaction, userId, guildId) {
  const channelToRemove = interaction.options.getChannel("channel");
  const existingChannels = getUserChannels(userId, guildId) || [];
  
  if (!existingChannels.includes(channelToRemove.id)) {
    return interaction.reply({
      content: `<#${channelToRemove.id}> is not in your lock list.`,
      flags: 64
    });
  }

  const updatedChannels = existingChannels.filter(id => id !== channelToRemove.id);
  setUserChannels(userId, guildId, updatedChannels);

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Channel Removed")
    .setDescription(`Removed <#${channelToRemove.id}> from your focus lock list.`)
    .setColor(0xff9900)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleList(interaction, userId, guildId) {
  const channels = getUserChannels(userId, guildId) || [];
  
  if (channels.length === 0) {
    return interaction.reply({
      content: "You haven't configured any channels to lock yet. Use `/focus-config add` to set them up.",
      flags: 64
    });
  }

  const channelList = channels.map(id => `<#${id}>`).join("\n");
  
  const embed = new EmbedBuilder()
    .setTitle("🔒 Your Focus Lock Channels")
    .setDescription(channelList)
    .setColor(0x0099ff)
    .setFooter({ text: `${channels.length} channel(s) configured` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleClear(interaction, userId, guildId) {
  const existingChannels = getUserChannels(userId, guildId) || [];
  
  if (existingChannels.length === 0) {
    return interaction.reply({
      content: "Your channel lock list is already empty.",
      flags: 64
    });
  }

  setUserChannels(userId, guildId, []);

  const embed = new EmbedBuilder()
    .setTitle("🧹 Channels Cleared")
    .setDescription("All channels have been removed from your focus lock list.")
    .setColor(0xff0000)
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 });
}
