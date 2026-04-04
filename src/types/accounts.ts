export type AccountStatus = 'Active' | 'Due Soon' | 'Growing' | 'Inactive';

export type AccountRecord = {
  id: string;
  userId: string;
  section: string;
  institution: string;
  accountName: string;
  accountType: string;
  balance: number;
  maskedNumber: string;
  status: AccountStatus;
  growthPct: number;
  accentColor: string;
};

export type AccountDraft = {
  section: string;
  institution: string;
  accountName: string;
  accountType: string;
  balance: number;
  maskedNumber: string;
  status: AccountStatus;
  growthPct: number;
  accentColor: string;
};