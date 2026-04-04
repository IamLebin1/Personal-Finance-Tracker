var config = require('../config/Config');
import type { BudgetDraft, BudgetRecord } from '../types/budgets';

const mapApiBudget = (row: any): BudgetRecord => {
  return {
    id: String(row.id),
    userId: String(row.userId ?? ''),
    category: String(row.category ?? ''),
    target: Number(row.target ?? 0),
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
};

export const fetchBudgets = (userId: string) => {
  if (!userId) {
    return Promise.resolve([] as BudgetRecord[]);
  }

  return fetch(config.settings.serverPath + '/api/budgets?userId=' + encodeURIComponent(userId))
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(mapApiBudget);
    });
};

export const saveBudgetTarget = (budgetId: string, draft: BudgetDraft) => {
  return fetch(config.settings.serverPath + '/api/budgets/' + budgetId, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: draft.category,
      target: draft.target,
    }),
  })
    .then(response => response.json())
    .then(() => budgetId);
};
