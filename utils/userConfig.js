import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "..", "data", "userConfig.json");

const dataDir = path.dirname(configPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function initializeConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      console.log("Creating new userConfig.json file...");
      fs.writeFileSync(configPath, JSON.stringify({}));
      return;
    }

    const data = fs.readFileSync(configPath, "utf8");
    if (data.trim() === "") {
      console.log("Empty userConfig.json file detected, initializing...");
      fs.writeFileSync(configPath, JSON.stringify({}));
      return;
    }

    JSON.parse(data);
    console.log("userConfig.json is valid");
  } catch (error) {
    console.log("Corrupted userConfig.json detected, recreating...");
    console.log("Error was:", error.message);
    fs.writeFileSync(configPath, JSON.stringify({}));
  }
}

initializeConfig();

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf8");

    if (data.trim() === "") {
      console.log("Empty config file, returning empty object");
      return {};
    }

    const parsed = JSON.parse(data);
    return parsed || {};
  } catch (error) {
    console.error("Error loading user config:", error);
    console.log("Attempting to recreate config file...");

    try {
      fs.writeFileSync(configPath, JSON.stringify({}));
      return {};
    } catch (writeError) {
      console.error("Failed to recreate config file:", writeError);
      return {};
    }
  }
}

function saveConfig(config) {
  try {
    if (typeof config !== "object" || config === null) {
      console.error("Invalid config object passed to saveConfig");
      return false;
    }

    const jsonString = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, jsonString);
    console.log("Config saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving user config:", error);
    return false;
  }
}

export function getUserChannels(userId, guildId) {
  try {
    const config = loadConfig();
    const key = `${userId}-${guildId}`;
    const userConfig = config[key];

    if (!userConfig || !userConfig.channels) {
      console.log(`No channels found for user ${userId} in guild ${guildId}`);
      return null;
    }

    console.log(
      `Found ${userConfig.channels.length} channels for user ${userId}`
    );
    return userConfig.channels;
  } catch (error) {
    console.error("Error getting user channels:", error);
    return null;
  }
}

export function setUserChannels(userId, guildId, channels) {
  try {
    const config = loadConfig();
    const key = `${userId}-${guildId}`;

    if (!config[key]) {
      config[key] = {};
    }

    if (!Array.isArray(channels)) {
      console.error("Channels must be an array");
      return false;
    }

    config[key].channels = channels;
    const success = saveConfig(config);

    if (success) {
      console.log(
        `Successfully saved ${channels.length} channels for user ${userId}`
      );
    }

    return success;
  } catch (error) {
    console.error("Error setting user channels:", error);
    return false;
  }
}

export function removeUserConfig(userId, guildId) {
  try {
    const config = loadConfig();
    const key = `${userId}-${guildId}`;

    if (config[key]) {
      delete config[key];
      const success = saveConfig(config);

      if (success) {
        console.log(`Successfully removed config for user ${userId}`);
      }

      return success;
    }

    console.log(`No config found to remove for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error removing user config:", error);
    return false;
  }
}
