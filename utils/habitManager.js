import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HABITS_FILE = path.join(__dirname, "..", "data", "habits.json");

function ensureDataDirectory() {
  const dataDir = path.dirname(HABITS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadHabitsData() {
  ensureDataDirectory();
  try {
    if (fs.existsSync(HABITS_FILE)) {
      const data = fs.readFileSync(HABITS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading habits data:", error);
  }
  return {};
}

function saveHabitsData(data) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(HABITS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving habits data:", error);
    return false;
  }
}

export function getUserHabits(userId, guildId) {
  const data = loadHabitsData();
  const guildIdStr = String(guildId);
  const userIdStr = String(userId);
  return data[guildIdStr]?.[userIdStr] || [];
}

export function getAllUsersHabits(guildId) {
  const data = loadHabitsData();
  return data[guildId] || {};
}

export function createHabit(userId, guildId, habit) {
  try {
    const data = loadHabitsData();
    const guildIdStr = String(guildId);
    const userIdStr = String(userId);

    if (!data[guildIdStr]) data[guildIdStr] = {};
    if (!data[guildIdStr][userIdStr]) data[guildIdStr][userIdStr] = [];

    data[guildIdStr][userIdStr].push(habit);
    return saveHabitsData(data);
  } catch (error) {
    console.error("Error creating habit:", error);
    return false;
  }
}

export function deleteHabit(userId, guildId, habitName) {
  try {
    const data = loadHabitsData();
    const guildIdStr = String(guildId);
    const userIdStr = String(userId);

    if (!data[guildIdStr] || !data[guildIdStr][userIdStr]) return false;

    const habits = data[guildIdStr][userIdStr];
    const habitIndex = habits.findIndex(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );

    if (habitIndex === -1) return false;

    habits.splice(habitIndex, 1);
    return saveHabitsData(data);
  } catch (error) {
    console.error("Error deleting habit:", error);
    return false;
  }
}

export function updateHabit(userId, guildId, originalHabitName, updates) {
  try {
    const data = loadHabitsData();
    const guildIdStr = String(guildId);
    const userIdStr = String(userId);

    if (!data[guildIdStr] || !data[guildIdStr][userIdStr]) {
      return { success: false, error: "User habits not found" };
    }

    const habits = data[guildIdStr][userIdStr];
    const habitIndex = habits.findIndex(
      (h) => h.name.toLowerCase() === originalHabitName.toLowerCase()
    );

    if (habitIndex === -1) {
      return { success: false, error: "Habit not found" };
    }

    if (
      updates.name &&
      updates.name.toLowerCase() !== originalHabitName.toLowerCase()
    ) {
      const duplicate = habits.some(
        (h, index) =>
          index !== habitIndex &&
          h.name.toLowerCase() === updates.name.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: "Another habit with this name already exists",
        };
      }
    }

    habits[habitIndex] = { ...habits[habitIndex], ...updates };

    const success = saveHabitsData(data);
    return {
      success,
      habit: habits[habitIndex],
      error: success ? null : "Failed to save data",
    };
  } catch (error) {
    console.error("Error updating habit:", error);
    return { success: false, error: error.message };
  }
}

export function logHabitCompletion(userId, guildId, habitName, completion) {
  try {
    const data = loadHabitsData();
    const guildIdStr = String(guildId);
    const userIdStr = String(userId);

    if (!data[guildIdStr] || !data[guildIdStr][userIdStr]) {
      return { success: false, error: "User habits not found" };
    }

    const habits = data[guildIdStr][userIdStr];
    const habitIndex = habits.findIndex(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );

    if (habitIndex === -1) {
      return { success: false, error: "Habit not found" };
    }

    const habit = habits[habitIndex];

    habit.completions.push(completion);
    habit.totalCompletions += completion.count;
    habit.lastCompleted = completion.date;

    const streakInfo = calculateStreak(habit);
    habit.streak = streakInfo.currentStreak;

    if (habit.streak > habit.longestStreak) {
      habit.longestStreak = habit.streak;
      streakInfo.isNewRecord = true;
    }

    const success = saveHabitsData(data);
    return {
      success,
      habit,
      streakInfo,
      error: success ? null : "Failed to save data",
    };
  } catch (error) {
    console.error("Error logging habit completion:", error);
    return { success: false, error: error.message };
  }
}

function calculateStreak(habit) {
  if (!habit.completions || habit.completions.length === 0) {
    return { currentStreak: 0, streakBroken: false };
  }

  const sortedCompletions = habit.completions.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let streak = 0;
  let currentDate = new Date();
  let streakBroken = false;

  const completedToday = sortedCompletions.some((c) => c.date === today);

  if (!completedToday) {
    const completedYesterday = sortedCompletions.some(
      (c) => c.date === yesterdayStr
    );
    if (!completedYesterday) {
      streakBroken = true;
      return { currentStreak: 0, streakBroken };
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const hasCompletion = sortedCompletions.some((c) => c.date === dateStr);

    if (hasCompletion) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak: streak, streakBroken };
}

export function getHabitsNeedingReminder(guildId) {
  const data = loadHabitsData();
  const guildData = data[guildId] || {};
  const reminders = [];
  const today = new Date().toISOString().split("T")[0];

  for (const [userId, habits] of Object.entries(guildData)) {
    for (const habit of habits) {
      const completedToday = habit.completions.some((c) => c.date === today);

      if (!completedToday) {
        const hour = new Date().getHours();
        let reminderType = "general";

        if (hour >= 6 && hour < 12) reminderType = "morning";
        else if (hour >= 12 && hour < 18) reminderType = "afternoon";
        else if (hour >= 18 && hour < 24) reminderType = "evening";

        reminders.push({
          userId,
          habit,
          reminderType,
        });
      }
    }
  }

  return reminders;
}

export function getUserHabitStats(userId, guildId) {
  const habits = getUserHabits(userId, guildId);

  if (!habits || habits.length === 0) return null;

  const stats = {
    totalHabits: habits.length,
    activeStreaks: habits.filter((h) => h.streak > 0).length,
    totalCompletions: habits.reduce((sum, h) => sum + h.totalCompletions, 0),
    longestStreak: Math.max(...habits.map((h) => h.longestStreak)),
    averageStreak: Math.round(
      habits.reduce((sum, h) => sum + h.streak, 0) / habits.length
    ),
    completedToday: 0,
  };

  const today = new Date().toISOString().split("T")[0];
  stats.completedToday = habits.filter((habit) =>
    habit.completions.some((c) => c.date === today)
  ).length;

  return stats;
}

export function getHabitHistory(userId, guildId, habitName, days = 30) {
  const habits = getUserHabits(userId, guildId);
  const habit = habits.find(
    (h) => h.name.toLowerCase() === habitName.toLowerCase()
  );

  if (!habit) return null;

  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const completion = habit.completions.find((c) => c.date === dateStr);

    history.push({
      date: dateStr,
      completed: !!completion,
      count: completion?.count || 0,
      target: habit.target,
      percentage: completion
        ? Math.min((completion.count / habit.target) * 100, 100)
        : 0,
    });
  }

  return {
    habit: {
      name: habit.name,
      emoji: habit.emoji,
      target: habit.target,
    },
    history,
  };
}

export function cleanupOldData(guildId, daysToKeep = 365) {
  try {
    const data = loadHabitsData();
    const guildData = data[guildId];

    if (!guildData) return true;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    let cleaned = false;

    for (const [userId, habits] of Object.entries(guildData)) {
      for (const habit of habits) {
        const originalLength = habit.completions.length;
        habit.completions = habit.completions.filter(
          (c) => c.date >= cutoffStr
        );

        if (habit.completions.length < originalLength) {
          cleaned = true;
        }
      }
    }

    if (cleaned) return saveHabitsData(data);

    return true;
  } catch (error) {
    console.error("Error cleaning up old data:", error);
    return false;
  }
}

export function exportHabitData(guildId) {
  try {
    const data = loadHabitsData();
    const guildData = data[guildId] || {};

    return {
      guildId,
      exportDate: new Date().toISOString(),
      data: guildData,
    };
  } catch (error) {
    console.error("Error exporting habit data:", error);
    return null;
  }
}

export function importHabitData(guildId, importData) {
  try {
    const data = loadHabitsData();
    data[guildId] = importData.data;

    return saveHabitsData(data);
  } catch (error) {
    console.error("Error importing habit data:", error);
    return false;
  }
}

export function deleteHabitCompletion(userId, guildId, habitName, date) {
  try {
    const data = loadHabitsData();
    const guildIdStr = String(guildId);
    const userIdStr = String(userId);

    if (!data[guildIdStr] || !data[guildIdStr][userIdStr]) return false;

    const habits = data[guildIdStr][userIdStr];
    const habit = habits.find(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );

    if (!habit) return false;

    const completionIndex = habit.completions.findIndex((c) => c.date === date);

    if (completionIndex === -1) return false;

    habit.completions.splice(completionIndex, 1);

    habit.totalCompletions = habit.completions.reduce(
      (sum, c) => sum + c.count,
      0
    );
    const streakInfo = calculateStreak(habit);
    habit.streak = streakInfo.currentStreak;

    return saveHabitsData(data);
  } catch (error) {
    console.error("Error deleting habit completion:", error);
    return false;
  }
}
