import { app, Notification, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NoteEntry } from '../../shared/ipc-types';
import { settingsStore } from '../vault/file-ops';

interface ActiveTimer {
  targetTime: number;
  timeoutId: NodeJS.Timeout;
}

let globalMainWindow: BrowserWindow | null = null;
let firedReminders: Record<string, string> = {};
let cachedReminders: NoteEntry[] = [];
const activeTimers = new Map<string, ActiveTimer>();
const remindersJsonPath = path.join(app.getPath('userData'), 'reminders.json');

async function loadFiredReminders() {
  try {
    const data = await fs.readFile(remindersJsonPath, 'utf8');
    firedReminders = JSON.parse(data);
  } catch (err) {
    firedReminders = {};
  }
}

async function saveFiredReminders() {
  try {
    await fs.mkdir(path.dirname(remindersJsonPath), { recursive: true });
    await fs.writeFile(remindersJsonPath, JSON.stringify(firedReminders, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save fired reminders:', err);
  }
}

function clearAllTimers() {
  for (const active of activeTimers.values()) {
    clearTimeout(active.timeoutId);
  }
  activeTimers.clear();
}

function cancelReminder(notePath: string) {
  const active = activeTimers.get(notePath);
  if (active) {
    clearTimeout(active.timeoutId);
    activeTimers.delete(notePath);
  }
}

function triggerReminderNotification(notePath: string, reminderTimeStr: string, title: string, preview: string) {
  activeTimers.delete(notePath);

  // Mark as fired
  firedReminders[notePath] = reminderTimeStr;
  saveFiredReminders();

  // Check if reminders are enabled globally before showing notification
  if (!settingsStore.get('remindersEnabled')) {
    return;
  }

  const notification = new Notification({
    title: `Reminder: ${title}`,
    body: preview || 'You have a scheduled reminder.',
  });

  notification.on('click', () => {
    if (globalMainWindow) {
      if (globalMainWindow.isMinimized()) {
        globalMainWindow.restore();
      }
      globalMainWindow.show();
      globalMainWindow.focus();
      globalMainWindow.webContents.send('navigate:note', notePath);
    }
  });

  notification.show();
}

function scheduleReminder(notePath: string, reminderTimeStr: string, title: string, preview: string) {
  const targetTime = new Date(reminderTimeStr).getTime();
  if (isNaN(targetTime)) {
    console.warn(`Ignoring invalid reminder date for note "${title}": ${reminderTimeStr}`);
    return;
  }
  const now = Date.now();
  const delay = targetTime - now;

  if (delay <= 0) {
    triggerReminderNotification(notePath, reminderTimeStr, title, preview);
    return;
  }

  cancelReminder(notePath);

  const scheduleTimeout = (remainingDelay: number) => {
    const MAX_TIMEOUT_MS = 2147483647; // Node's 32-bit limit (~24.8 days)
    const isDistant = remainingDelay > MAX_TIMEOUT_MS;
    const currentDelay = isDistant ? MAX_TIMEOUT_MS : remainingDelay;

    const timeoutId = setTimeout(() => {
      const nextRemaining = targetTime - Date.now();
      if (nextRemaining > 1000) { // Keep buffer of 1s
        scheduleTimeout(nextRemaining);
      } else {
        triggerReminderNotification(notePath, reminderTimeStr, title, preview);
      }
    }, currentDelay);

    activeTimers.set(notePath, {
      targetTime,
      timeoutId,
    });
  };

  scheduleTimeout(delay);
}

export function updateSchedulerReminders(reminders: NoteEntry[]) {
  cachedReminders = reminders;

  if (!settingsStore.get('remindersEnabled')) {
    clearAllTimers();
    return;
  }

  const currentNotesWithReminders = new Set<string>();

  for (const note of reminders) {
    if (!note.reminder || note.completed) {
      continue;
    }

    currentNotesWithReminders.add(note.path);

    const targetTime = new Date(note.reminder).getTime();
    if (isNaN(targetTime)) {
      continue;
    }

    // Check if it's already fired for this exact timestamp
    if (firedReminders[note.path] === note.reminder) {
      continue;
    }

    const active = activeTimers.get(note.path);
    if (active) {
      if (active.targetTime === targetTime) {
        continue;
      } else {
        cancelReminder(note.path);
      }
    }

    scheduleReminder(note.path, note.reminder, note.title, note.preview);
  }

  // Cancel any scheduled timers for notes that no longer have active reminders or are not in the list
  for (const path of activeTimers.keys()) {
    if (!currentNotesWithReminders.has(path)) {
      cancelReminder(path);
    }
  }
}

export async function initializeScheduler(mainWindow: BrowserWindow) {
  globalMainWindow = mainWindow;
  await loadFiredReminders();

  // Re-evaluate settings
  settingsStore.onDidChange('remindersEnabled', (enabled) => {
    if (enabled) {
      updateSchedulerReminders(cachedReminders);
    } else {
      clearAllTimers();
    }
  });
}
