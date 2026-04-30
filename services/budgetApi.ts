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

async function fetchWithTimeout<T>(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = 10000, ...rest } = init;

  // Abort stuck network calls so UI doesn't stay in a loading state forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
    return parseResponse<T>(response);
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  return response.json();
}

export async function getBudgets(month: string): Promise<Budget[]> {
  return fetchWithTimeout<Budget[]>(`${config.apiBaseUrl}/api/budgets?month=${encodeURIComponent(month)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    timeoutMs: 12000,
  });
}

export async function setBudget(category: string, month: string, amount: number): Promise<void> {
  await fetchWithTimeout<void>(`${config.apiBaseUrl}/api/budgets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ category, month, amount }),
    timeoutMs: 12000,
  });
}

export async function getBudgetVsActual(month: string): Promise<BudgetVsActual[]> {
  return fetchWithTimeout<BudgetVsActual[]>(`${config.apiBaseUrl}/api/analytics/budget-vs-actual?month=${encodeURIComponent(month)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    timeoutMs: 12000,
  });
}
