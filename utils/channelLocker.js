import fs from "fs";
import path from "path";

const originalOverwrites = {};

export async function lockUserOutOfChannels(guild, userId, channelIds) {
  originalOverwrites[userId] = {};
  for (const channelId of channelIds) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) continue;

    const existingOverwrite = channel.permissionOverwrites.cache.get(userId);
    originalOverwrites[userId][channelId] = existingOverwrite
      ? existingOverwrite.raw()
      : null;

    await channel.permissionOverwrites.edit(userId, {
      SendMessages: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
    });
  }
}

export async function unlockUserInChannels(userId) {
  if (!originalOverwrites[userId]) return;

  const guild = require("discord.js").Client.instance.guilds.cache.get(
    process.env.GUILD_ID
  );

  const overwrites = originalOverwrites[userId];
  for (const [channelId, oldOverwrite] of Object.entries(overwrites)) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) continue;

    if (oldOverwrite) {
      await channel.permissionOverwrites.edit(userId, {
        allowed: oldOverwrite.allow,
        denied: oldOverwrite.deny,
      });
    } else {
      await channel.permissionOverwrites.delete(userId);
    }
  }

  delete originalOverwrites[userId];
}
