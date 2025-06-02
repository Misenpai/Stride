import fs from "fs";
import path from "path";

const originalOverwrites = {};
let clientInstance = null;

export function setClientInstance(client) {
  clientInstance = client;
}

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

  if (!clientInstance) {
    console.error("Client instance not set in channelLocker.js");
    return;
  }

  const guild = clientInstance.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error("Guild not found");
    return;
  }

  const overwrites = originalOverwrites[userId];
  for (const [channelId, oldOverwrite] of Object.entries(overwrites)) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) continue;

    try {
      if (oldOverwrite) {
        await channel.permissionOverwrites.edit(userId, {
          allow: oldOverwrite.allow,
          deny: oldOverwrite.deny,
        });
      } else {
        await channel.permissionOverwrites.delete(userId);
      }
    } catch (error) {
      console.error(
        `Error restoring permissions for channel ${channelId}:`,
        error
      );
    }
  }

  delete originalOverwrites[userId];
}
