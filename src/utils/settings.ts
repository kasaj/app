import { UserSettings } from '../types';

const SETTINGS_KEY = 'pra_settings';

export const loadSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Při chybě vrátíme výchozí
  }
  return {
    language: 'cs',
    name: '',
  };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
