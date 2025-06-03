import fs from "fs";
import path from "path";

// File path for storing habit data
const HABITS_FILE = path.join(process.cwd(), "data", "habits.json");

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(HABITS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load habits data from file
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

// Save habits data to file
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

// Get user's habits for a specific guild
export function getUserHabits(userId, guildId) {
  const data = loadHabitsData();
  const guildData = data[guildId] || {};
  return guildData[userId] || [];
}

// Get all users' habits for a guild (for leaderboards)
export function getAllUsersHabits(guildId) {
  const data = loadHabitsData();
  return data[guildId] || {};
}

// Create a new habit
export function createHabit(userId, guildId, habit) {
  try {
    const data = loadHabitsData();

    // Initialize guild data if it doesn't exist
    if (!data[guildId]) {
      data[guildId] = {};
    }

    // Initialize user data if it doesn't exist
    if (!data[guildId][userId]) {
      data[guildId][userId] = [];
    }

    // Add the habit
    data[guildId][userId].push(habit);

    return saveHabitsData(data);
  } catch (error) {
    console.error("Error creating habit:", error);
    return false;
  }
}

// Delete a habit
export function deleteHabit(userId, guildId, habitId) {
  try {
    const data = loadHabitsData();

    if (!data[guildId] || !data[guildId][userId]) {
      return false;
    }

    const habits = data[guildId][userId];
    const habitIndex = habits.findIndex((h) => h.id === habitId);

    if (habitIndex === -1) {
      return false;
    }

    // Remove the habit
    habits.splice(habitIndex, 1);

    return saveHabitsData(data);
  } catch (error) {
    console.error("Error deleting habit:", error);
    return false;
  }
}

// Update a habit
export function updateHabit(userId, guildId, habitId, updates) {
  try {
    const data = loadHabitsData();

    if (!data[guildId] || !data[guildId][userId]) {
      return { success: false, error: "User habits not found" };
    }

    const habits = data[guildId][userId];
    const habitIndex = habits.findIndex((h) => h.id === habitId);

    if (habitIndex === -1) {
      return { success: false, error: "Habit not found" };
    }

    // Update the habit
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

// Log habit completion
export function logHabitCompletion(userId, guildId, habitId, completion) {
  try {
    const data = loadHabitsData();

    if (!data[guildId] || !data[guildId][userId]) {
      return { success: false, error: "User habits not found" };
    }

    const habits = data[guildId][userId];
    const habitIndex = habits.findIndex((h) => h.id === habitId);

    if (habitIndex === -1) {
      return { success: false, error: "Habit not found" };
    }

    const habit = habits[habitIndex];

    // Add the completion
    habit.completions.push(completion);
    habit.totalCompletions += completion.count;
    habit.lastCompleted = completion.date;

    // Calculate streak
    const streakInfo = calculateStreak(habit);
    habit.streak = streakInfo.currentStreak;

    // Update longest streak if necessary
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

// Calculate current streak for a habit
function calculateStreak(habit) {
  if (!habit.completions || habit.completions.length === 0) {
    return { currentStreak: 0, streakBroken: false };
  }

  // Sort completions by date (newest first)
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

  // Check if completed today
  const completedToday = sortedCompletions.some((c) => c.date === today);

  // If not completed today, check if completed yesterday to continue streak
  if (!completedToday) {
    const completedYesterday = sortedCompletions.some(
      (c) => c.date === yesterdayStr
    );
    if (!completedYesterday) {
      // Streak is broken if not completed today or yesterday
      streakBroken = true;
      return { currentStreak: 0, streakBroken };
    }
    // Start counting from yesterday
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count consecutive days
  for (let i = 0; i < 365; i++) {
    // Limit to prevent infinite loops
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

// Get habits that need reminders (not completed today)
export function getHabitsNeedingReminder(guildId) {
  const data = loadHabitsData();
  const guildData = data[guildId] || {};
  const reminders = [];
  const today = new Date().toISOString().split("T")[0];

  for (const [userId, habits] of Object.entries(guildData)) {
    for (const habit of habits) {
      // Check if habit is completed today
      const completedToday = habit.completions.some((c) => c.date === today);

      if (!completedToday) {
        // Determine reminder type based on time of day
        const hour = new Date().getHours();
        let reminderType = "general";

        if (hour >= 6 && hour < 12) {
          reminderType = "morning";
        } else if (hour >= 12 && hour < 18) {
          reminderType = "afternoon";
        } else if (hour >= 18 && hour < 24) {
          reminderType = "evening";
        }

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

// Get habit statistics for a user
export function getUserHabitStats(userId, guildId) {
  const habits = getUserHabits(userId, guildId);

  if (!habits || habits.length === 0) {
    return null;
  }

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

  // Check how many habits completed today
  const today = new Date().toISOString().split("T")[0];
  stats.completedToday = habits.filter((habit) =>
    habit.completions.some((c) => c.date === today)
  ).length;

  return stats;
}

// Get habit completion history for charts/graphs
export function getHabitHistory(userId, guildId, habitId, days = 30) {
  const habits = getUserHabits(userId, guildId);
  const habit = habits.find((h) => h.id === habitId);

  if (!habit) {
    return null;
  }

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
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      target: habit.target,
    },
    history,
  };
}

// Clean up old completion data (optional maintenance function)
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
          console.log(
            `Cleaned ${
              originalLength - habit.completions.length
            } old completions for habit ${habit.name}`
          );
        }
      }
    }

    if (cleaned) {
      return saveHabitsData(data);
    }

    return true;
  } catch (error) {
    console.error("Error cleaning up old data:", error);
    return false;
  }
}

// Export habit data for backup
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

// Import habit data from backup
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

// Delete a habit completion
export function deleteHabitCompletion(userId, guildId, habitId, date) {
  try {
    const data = loadHabitsData();

    if (!data[guildId] || !data[guildId][userId]) {
      return false;
    }

    const habits = data[guildId][userId];
    const habit = habits.find((h) => h.id === habitId);

    if (!habit) {
      return false;
    }

    const completionIndex = habit.completions.findIndex((c) => c.date === date);

    if (completionIndex === -1) {
      return false;
    }

    // Remove the completion entry
    habit.completions.splice(completionIndex, 1);

    // Recalculate total completions and streak
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
