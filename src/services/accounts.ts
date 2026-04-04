var config = require('../config/Config');
import type { AccountDraft, AccountRecord } from '../types/accounts';

const mapApiAccount = (row: any): AccountRecord => {
  return {
    id: String(row.id),
    userId: String(row.userId ?? ''),
    section: String(row.section ?? 'Checking & Savings'),
    institution: String(row.institution ?? 'Linked Account'),
    accountName: String(row.accountName ?? 'Account'),
    accountType: String(row.accountType ?? 'Account'),
    balance: Number(row.balance ?? 0),
    maskedNumber: String(row.maskedNumber ?? ''),
    status: (row.status ?? 'Active') as AccountRecord['status'],
    growthPct: Number(row.growthPct ?? 0),
    accentColor: String(row.accentColor ?? '#4f46e5'),
  };
};

export const fetchAccounts = (userId: string) => {
  if (!userId) {
    return Promise.resolve([] as AccountRecord[]);
  }

  return fetch(config.settings.serverPath + '/api/accounts?userId=' + encodeURIComponent(userId))
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(mapApiAccount);
    });
};

export const saveAccount = (userId: string, draft: AccountDraft) => {
  return fetch(config.settings.serverPath + '/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: Number(userId) || 0,
      section: draft.section,
      institution: draft.institution,
      accountName: draft.accountName,
      accountType: draft.accountType,
      balance: draft.balance,
      maskedNumber: draft.maskedNumber,
      status: draft.status,
      growthPct: draft.growthPct,
      accentColor: draft.accentColor,
    }),
  })
    .then(response => response.json())
    .then(data => String(data.id ?? ''));
};

export const updateAccount = (accountId: string, draft: Partial<AccountDraft>) => {
  return fetch(config.settings.serverPath + '/api/accounts/' + accountId, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })
    .then(response => response.json())
    .then(() => accountId);
};