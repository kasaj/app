import { Activity, DayEntry } from '../types';

const STORAGE_KEY = 'pra_data';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const loadAllData = (): DayEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveAllData = (data: DayEntry[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getDayEntry = (date: string): DayEntry | undefined => {
  const data = loadAllData();
  return data.find((entry) => entry.date === date);
};

export const saveDayEntry = (entry: DayEntry): void => {
  const data = loadAllData();
  const index = data.findIndex((e) => e.date === entry.date);

  if (index >= 0) {
    data[index] = entry;
  } else {
    data.push(entry);
  }

  // Seřadit podle data
  data.sort((a, b) => b.date.localeCompare(a.date));
  saveAllData(data);
};

export const addActivity = (activity: Activity): void => {
  const today = getTodayDate();
  const entry = getDayEntry(today) || { date: today, activities: [] };
  entry.activities.push(activity);
  saveDayEntry(entry);
};

export const getRecentDays = (count: number): DayEntry[] => {
  const data = loadAllData();
  return data.slice(0, count);
};

export const updateActivityById = (id: string, updates: Partial<Activity>): void => {
  const data = loadAllData();
  for (const entry of data) {
    const idx = entry.activities.findIndex((a) => a.id === id);
    if (idx >= 0) {
      entry.activities[idx] = { ...entry.activities[idx], ...updates };
      saveAllData(data);
      return;
    }
  }
};

export const deleteActivitiesByIds = (ids: string[]): void => {
  const data = loadAllData();
  const idSet = new Set(ids);

  const updatedData = data
    .map((entry) => ({
      ...entry,
      activities: entry.activities.filter((a) => !idSet.has(a.id)),
    }))
    .filter((entry) => entry.activities.length > 0);

  saveAllData(updatedData);
};
