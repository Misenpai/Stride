import { LOCKED_CHANNELS } from "../config.js";
import {
  lockUserOutOfChannels,
  unlockUserInChannels,
} from "./channelLocker.js";

const sessions = new Map();

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
    const client = require("discord.js").Client.instance;
    const user = await client.users.fetch(userId);
    user.send(
      `🎉 Congrats! Your focus session has ended. Time to take a break!`
    );
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
