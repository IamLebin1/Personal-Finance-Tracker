export type BudgetRecord = {
  id: string;
  userId: string;
  category: string;
  target: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetDraft = {
  category: string;
  target: number;
};
