import { LOCKED_CHANNELS } from "../config.js";
import {
  lockUserOutOfChannels,
  unlockUserInChannels,
  setClientInstance,
} from "./channelLocker.js";

const sessions = new Map();
let clientInstance = null;

export function setClient(client) {
  clientInstance = client;
  setClientInstance(client);
}

export function checkActive(userId) {
  return sessions.has(userId);
}

export function beginSession(userId, endTimestamp) {
  const remainingMs = endTimestamp - Date.now();
  const timeoutId = setTimeout(async () => {
    const session = sessions.get(userId);
    if (!session) return;

    await session.unlockChannels();
    await session.onComplete();

    sessions.delete(userId);
  }, remainingMs);

  const unlockChannels = async () => {
    return unlockUserInChannels(userId);
  };

  const onComplete = async () => {
    if (!clientInstance) {
      console.error("Client instance not available");
      return;
    }

    try {
      const user = await clientInstance.users.fetch(userId);
      await user.send(
        `🎉 Congrats! Your focus session has ended. Time to take a break!`
      );
    } catch (error) {
      console.error("Error sending completion message:", error);
    }
  };

  sessions.set(userId, {
    timeoutId,
    endTimestamp,
    unlockChannels,
    onComplete,
  });
}

export function stopPomodoro(userId) {
  const session = sessions.get(userId);
  if (!session) return null;

  clearTimeout(session.timeoutId);
  sessions.delete(userId);
  return session;
}

export function getPomodoroRemaining(userId) {
  const session = sessions.get(userId);
  if (!session) return null;

  return Math.max(0, session.endTimestamp - Date.now());
}

export async function lockChannelsForUser(guild, userId) {
  await lockUserOutOfChannels(guild, userId, LOCKED_CHANNELS);
}
