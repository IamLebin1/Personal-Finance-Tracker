export interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', icon: '🍔', color: '#FF9F1C' },
  { key: 'transport', label: 'Transport', icon: '🚗', color: '#2EC4B6' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#E71D36' },
  { key: 'bills', label: 'Bills', icon: '📄', color: '#011627' },
  { key: 'health', label: 'Health', icon: '🏥', color: '#20CE8F' },
  { key: 'salary', label: 'Salary', icon: '💰', color: '#20CE8F' },
  { key: 'freelance', label: 'Freelance', icon: '💻', color: '#8A6EFF' },
  { key: 'groceries', label: 'Groceries', icon: '🛒', color: '#FFD700' },
  { key: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#FF4D6D' },
  { key: 'other', label: 'Other', icon: '✨', color: '#8A90C6' },
];

export function getCategoryData(key: string): Category {
  const k = key.toLowerCase();
  return CATEGORIES.find(c => c.key === k) || CATEGORIES[CATEGORIES.length - 1];
}
