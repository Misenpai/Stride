import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "..", "data", "userConfig.json");

// Ensure data directory exists
const dataDir = path.dirname(configPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({}));
}

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading user config:", error);
    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving user config:", error);
  }
}

export function getUserChannels(userId, guildId) {
  const config = loadConfig();
  return config[`${userId}-${guildId}`]?.channels || null;
}

export function setUserChannels(userId, guildId, channels) {
  const config = loadConfig();
  const key = `${userId}-${guildId}`;

  if (!config[key]) {
    config[key] = {};
  }

  config[key].channels = channels;
  saveConfig(config);
}

export function removeUserConfig(userId, guildId) {
  const config = loadConfig();
  const key = `${userId}-${guildId}`;

  if (config[key]) {
    delete config[key];
    saveConfig(config);
  }
}
