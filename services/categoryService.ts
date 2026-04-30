import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type CategoryType,
} from '../constants/categories';

type CategoryStore = {
  expense: Category[];
  income: Category[];
  removed?: { expense: string[]; income: string[] };
};

const CATEGORY_KEY = '@custom_categories_v1';

const DEFAULTS: CategoryStore = {
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function randomColor(): string {
  const palette = ['#20CE8F', '#2EC4B6', '#8A6EFF', '#FF9F1C', '#E71D36', '#00B894', '#6C5CE7', '#2A9D8F'];
  return palette[Math.floor(Math.random() * palette.length)];
}

async function getCustomCategoryStore(): Promise<CategoryStore> {
  try {
    const raw = await AsyncStorage.getItem(CATEGORY_KEY);
    if (!raw) {
      return { expense: [], income: [], removed: { expense: [], income: [] } };
    }
    const parsed = JSON.parse(raw);
    return {
      expense: Array.isArray(parsed?.expense) ? parsed.expense : [],
      income: Array.isArray(parsed?.income) ? parsed.income : [],
      removed: parsed?.removed || { expense: [], income: [] },
    };
  } catch {
    return { expense: [], income: [], removed: { expense: [], income: [] } };
  }
}

async function setCustomCategoryStore(store: CategoryStore): Promise<void> {
  await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(store));
}

export function getDefaultCategories(type: CategoryType): Category[] {
  return DEFAULTS[type];
}

export async function getCategories(type: CategoryType): Promise<Category[]> {
  const store = await getCustomCategoryStore();
  const removed = new Set((store.removed && store.removed[type]) || []);
  const defaults = DEFAULTS[type].filter(d => !removed.has(d.key));
  const overriddenDefaults = defaults.map(d => store[type].find(c => c.key === d.key) || d);
  const additional = store[type].filter(c => !DEFAULTS[type].some(d => d.key === c.key));
  return [...overriddenDefaults, ...additional];
}

export async function getCategoryMapByType(): Promise<Record<CategoryType, Category[]>> {
  const store = await getCustomCategoryStore();
  return {
    expense: await getCategories('expense'),
    income: await getCategories('income'),
  };
}

export async function addCustomCategory(input: {
  type: CategoryType;
  label: string;
  icon?: string;
  color?: string;
}): Promise<Category> {
  const safeLabel = input.label.trim();
  if (!safeLabel) {
    throw new Error('Category label is required');
  }

  const keyBase = slugify(safeLabel);
  if (!keyBase) {
    throw new Error('Category label must contain letters or numbers');
  }

  const store = await getCustomCategoryStore();
  const existingKeys = new Set([
    ...DEFAULTS[input.type].map(c => c.key),
    ...store[input.type].map(c => c.key),
  ]);

  let key = keyBase;
  let suffix = 1;
  while (existingKeys.has(key)) {
    key = `${keyBase}_${suffix}`;
    suffix += 1;
  }

  const nextCategory: Category = {
    key,
    label: safeLabel,
    icon: (input.icon || '🏷️').trim() || '🏷️',
    color: input.color || randomColor(),
  };

  const nextStore: CategoryStore = {
    ...store,
    removed: store.removed || { expense: [], income: [] },
    [input.type]: [...store[input.type], nextCategory],
  };

  await setCustomCategoryStore(nextStore);
  return nextCategory;
}

export async function updateCategory(type: CategoryType, key: string, update: { label?: string; icon?: string; color?: string }): Promise<Category> {
  const store = await getCustomCategoryStore();
  const idx = store[type].findIndex(c => c.key === key);
  if (idx >= 0) {
    const existing = store[type][idx];
    const updated = { ...existing, ...update };
    const nextStore = { ...store, [type]: [...store[type]] } as CategoryStore;
    nextStore[type][idx] = updated;
    await setCustomCategoryStore(nextStore);
    return updated;
  }

  const def = DEFAULTS[type].find(d => d.key === key);
  if (!def) throw new Error('Category not found');
  const custom: Category = { key: def.key, label: update.label || def.label, icon: update.icon || def.icon, color: update.color || def.color };
  const nextStore: CategoryStore = { ...store, removed: store.removed || { expense: [], income: [] }, [type]: [...store[type], custom] } as CategoryStore;
  nextStore.removed![type] = (nextStore.removed![type] || []).filter(k => k !== key);
  await setCustomCategoryStore(nextStore);
  return custom;
}

export async function removeCustomCategory(type: CategoryType, key: string): Promise<void> {
  const store = await getCustomCategoryStore();
  const isDefault = DEFAULTS[type].some(c => c.key === key);
  if (isDefault) {
    const removed = store.removed || { expense: [], income: [] };
    removed[type] = Array.from(new Set([...(removed[type] || []), key]));
    const nextStore: CategoryStore = { ...store, removed };
    await setCustomCategoryStore(nextStore);
    return;
  }

  const nextStore: CategoryStore = {
    ...store,
    removed: store.removed || { expense: [], income: [] },
    [type]: store[type].filter(c => c.key !== key),
  } as CategoryStore;

  await setCustomCategoryStore(nextStore);
}
