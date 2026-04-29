import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
}

let currentSession: AuthSession | null = null;
const SESSION_KEY = '@auth_session';

export async function setAuthSession(session: AuthSession): Promise<void> {
  currentSession = session;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session to storage', e);
  }
}

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(SESSION_KEY);
    if (jsonValue != null) {
      currentSession = JSON.parse(jsonValue);
      console.log('Session loaded successfully');
      return currentSession;
    }
  } catch (e) {
    console.error('DEBUG - AsyncStorage Error Details:', e);
    // If it's a [missing native module] error, it means the app needs a full rebuild
  }
  return null;
}

export async function clearAuthSession(): Promise<void> {
  currentSession = null;
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    console.log('Session cleared from storage');
  } catch (e) {
    console.error('Failed to clear session from storage:', e);
    // We don't re-throw here so the UI can still proceed with logout
  }
}
