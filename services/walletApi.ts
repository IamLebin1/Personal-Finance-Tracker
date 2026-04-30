import { config } from '../config/appConfig';
import { getAuthSession, loadAuthSession } from './authSession';
import type { Wallet } from '../types/transaction';

async function getValidSession() {
  let session = getAuthSession();
  if (!session?.token) {
    session = await loadAuthSession();
  }
  return session;
}

function getAuthHeaders(): Record<string, string> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error('Please log in first');
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getWallets(): Promise<Wallet[]> {
  // Ensure session is loaded before making the request
  await getValidSession();
  
  const response = await fetch(`${config.apiBaseUrl}/api/wallets`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return parseResponse<Wallet[]>(response);
}

export async function createWallet(input: { name: string; color?: string; icon?: string; initialBalance?: number }): Promise<Wallet> {
  // Ensure session is loaded before making the request
  const session = await getValidSession();
  if (!session?.userId) {
    throw new Error('User session is not valid');
  }

  const response = await fetch(`${config.apiBaseUrl}/api/wallets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  const payload = await parseResponse<{ id: number | string }>(response);

  return {
    id: String(payload.id),
    name: input.name,
    userId: String(session.userId),
    color: input.color || '#6e57ff',
    icon: input.icon || '👛',
    initialBalance: input.initialBalance || 0,
    createdAt: new Date().toISOString(),
  };
}

export async function updateWallet(id: string, input: { name: string; color?: string; icon?: string; initialBalance?: number }): Promise<void> {
  // Ensure session is loaded before making the request
  await getValidSession();

  const response = await fetch(`${config.apiBaseUrl}/api/wallets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  await parseResponse(response);
}

export async function deleteWallet(id: string): Promise<void> {
  // Ensure session is loaded before making the request
  await getValidSession();

  const response = await fetch(`${config.apiBaseUrl}/api/wallets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  await parseResponse(response);
}
