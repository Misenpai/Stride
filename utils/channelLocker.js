import fs from "fs";
import path from "path";

const originalOverwrites = {};
let clientInstance = null;

export function setClientInstance(client) {
  clientInstance = client;
  console.log("Client instance set in channelLocker.js");
}

export async function lockUserOutOfChannels(guild, userId, channelIds) {
  console.log(`Locking user ${userId} out of ${channelIds.length} channels`);
  originalOverwrites[userId] = {};

  for (const channelId of channelIds) {
    try {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.log(`Channel ${channelId} not found, skipping`);
        continue;
      }

      console.log(`Processing channel: ${channel.name} (${channelId})`);


      const existingOverwrite = channel.permissionOverwrites.cache.get(userId);


      if (existingOverwrite) {

        originalOverwrites[userId][channelId] = {
          allow: existingOverwrite.allow.bitfield,
          deny: existingOverwrite.deny.bitfield,
        };
        console.log(
          `Stored existing permissions for user in channel ${channel.name}`
        );
      } else {
        originalOverwrites[userId][channelId] = null;
        console.log(
          `No existing permissions for user in channel ${channel.name}`
        );
      }


      await channel.permissionOverwrites.edit(userId, {
        SendMessages: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
      });

      console.log(`✅ Locked user out of channel: ${channel.name}`);
    } catch (error) {
      console.error(`Error locking channel ${channelId}:`, error);

    }
  }

  console.log(
    `Successfully processed ${channelIds.length} channels for locking`
  );
}

export async function unlockUserInChannels(userId) {
  console.log(`Unlocking channels for user ${userId}`);

  if (!originalOverwrites[userId]) {
    console.log(`No stored overwrites found for user ${userId}`);
    return;
  }

  if (!clientInstance) {
    console.error("Client instance not set in channelLocker.js");
    return;
  }

  const guild = clientInstance.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error("Guild not found when trying to unlock channels");
    return;
  }

  const overwrites = originalOverwrites[userId];
  let successCount = 0;
  let totalCount = Object.keys(overwrites).length;

  for (const [channelId, oldOverwrite] of Object.entries(overwrites)) {
    try {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.log(`Channel ${channelId} not found during unlock, skipping`);
        continue;
      }

      if (oldOverwrite) {

        await channel.permissionOverwrites.edit(userId, {
          allow: BigInt(oldOverwrite.allow),
          deny: BigInt(oldOverwrite.deny),
        });
        console.log(
          `✅ Restored original permissions for channel: ${channel.name}`
        );
      } else {

        await channel.permissionOverwrites.delete(userId);
        console.log(
          `✅ Removed permission overwrite for channel: ${channel.name}`
        );
      }

      successCount++;
    } catch (error) {
      console.error(
        `Error restoring permissions for channel ${channelId}:`,
        error
      );

    }
  }


  delete originalOverwrites[userId];
  console.log(
    `Successfully unlocked ${successCount}/${totalCount} channels for user ${userId}`
  );
}
