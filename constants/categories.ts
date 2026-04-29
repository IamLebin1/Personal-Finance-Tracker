export interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export type CategoryType = 'expense' | 'income';

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', icon: '🍔', color: '#FF9F1C' },
  { key: 'transport', label: 'Transport', icon: '🚗', color: '#2EC4B6' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#E71D36' },
  { key: 'bills', label: 'Bills', icon: '📄', color: '#011627' },
  { key: 'health', label: 'Health', icon: '🏥', color: '#20CE8F' },
  { key: 'groceries', label: 'Groceries', icon: '🛒', color: '#FFD700' },
  { key: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#FF4D6D' },
  { key: 'utilities', label: 'Utilities', icon: '💡', color: '#2A9D8F' },
  { key: 'other_expense', label: 'Other Expense', icon: '📦', color: '#8A90C6' },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary', label: 'Salary', icon: '💰', color: '#20CE8F' },
  { key: 'freelance', label: 'Freelance', icon: '💻', color: '#8A6EFF' },
  { key: 'bonus', label: 'Bonus', icon: '🎁', color: '#00B894' },
  { key: 'investment', label: 'Investment', icon: '📈', color: '#6C5CE7' },
  { key: 'other_income', label: 'Other Income', icon: '✨', color: '#8A90C6' },
];

export const CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoriesByType(type: CategoryType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function fallbackLabelFromKey(key: string): string {
  const normalized = key.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return 'Other';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getCategoryData(key: string): Category {
  const k = key.toLowerCase();
  const found = CATEGORIES.find(c => c.key === k);
  if (found) return found;
  return {
    key: k || 'other',
    label: fallbackLabelFromKey(k),
    icon: '🏷️',
    color: '#8A90C6',
  };
}
