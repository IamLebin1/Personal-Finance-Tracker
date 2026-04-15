export interface AuthSession {
  token: string;
  userId: string;
  username: string;
}

let currentSession: AuthSession | null = null;

export function setAuthSession(session: AuthSession): void {
  currentSession = session;
}

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export function clearAuthSession(): void {
  currentSession = null;
}
