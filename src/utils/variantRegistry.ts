import { loadActivities, saveActivities } from './activities';

const STORAGE_KEY = 'pra_variant_registry';

export function loadVariantRegistry(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* default */ }
  // Initialize from all existing activity variants
  return rebuildRegistry();
}

export function saveVariantRegistry(variants: string[]): void {
  const unique = [...new Set(variants)].sort((a, b) => a.localeCompare(b, 'cs'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function addToRegistry(variant: string): void {
  const registry = loadVariantRegistry();
  if (!registry.includes(variant)) {
    registry.push(variant);
    saveVariantRegistry(registry);
  }
}

export function removeFromRegistry(variant: string): void {
  const registry = loadVariantRegistry().filter(v => v !== variant);
  saveVariantRegistry(registry);

  // Also remove from all activities
  const activities = loadActivities();
  let changed = false;
  activities.forEach(a => {
    if (a.variants?.includes(variant)) {
      a.variants = a.variants.filter(v => v !== variant);
      if (a.variants.length === 0) a.variants = undefined;
      changed = true;
    }
  });
  if (changed) saveActivities(activities);
}

export function rebuildRegistry(): string[] {
  const activities = loadActivities();
  const all = new Set<string>();
  activities.forEach(a => a.variants?.forEach(v => all.add(v)));
  const sorted = [...all].sort((a, b) => a.localeCompare(b, 'cs'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
}
