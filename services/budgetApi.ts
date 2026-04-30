import { config } from '../config/appConfig';
import { getAuthSession } from './authSession';

export interface Budget {
  id: string;
  category: string;
  month: string; // YYYY-MM
  amount: number;
  createdAt: string;
}

export interface BudgetVsActual {
  category: string;
  budget: number;
  actual: number;
}

function getAuthHeaders(): Record<string, string> {
  const session = getAuthSession();
  return {
    'Content-Type': 'application/json',
    Authorization: session?.token ? `Bearer ${session.token}` : '',
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  return response.json();
}

export async function getBudgets(month: string): Promise<Budget[]> {
  const response = await fetch(`${config.apiBaseUrl}/api/budgets?month=${encodeURIComponent(month)}`, {
    headers: getAuthHeaders(),
  });
  return parseResponse<Budget[]>(response);
}

export async function setBudget(category: string, month: string, amount: number): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/api/budgets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ category, month, amount }),
  });
  await parseResponse(response);
}

export async function getBudgetVsActual(month: string): Promise<BudgetVsActual[]> {
  const response = await fetch(`${config.apiBaseUrl}/api/analytics/budget-vs-actual?month=${encodeURIComponent(month)}`, {
    headers: getAuthHeaders(),
  });
  return parseResponse<BudgetVsActual[]>(response);
}
