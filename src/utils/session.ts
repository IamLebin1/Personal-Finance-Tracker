import AsyncStorage from '@react-native-async-storage/async-storage';

const IS_LOGGED_IN_KEY = 'session_isLoggedIn';
const CURRENT_USER_ID_KEY = 'session_currentUserId';
const CURRENT_USER_NAME_KEY = 'session_currentUserName';

export const saveSession = (currentUserId: string, currentUserName: string) => {
  return AsyncStorage.multiSet([
    [IS_LOGGED_IN_KEY, 'true'],
    [CURRENT_USER_ID_KEY, currentUserId],
    [CURRENT_USER_NAME_KEY, currentUserName],
  ]).then(() => undefined);
};

export const loadSession = () => {
  return AsyncStorage.multiGet([
    IS_LOGGED_IN_KEY,
    CURRENT_USER_ID_KEY,
    CURRENT_USER_NAME_KEY,
  ]).then(entries => {
    const sessionMap: Record<string, string> = {};

    entries.forEach(([key, value]) => {
      sessionMap[key] = value ?? '';
    });

    return {
      isLoggedIn: sessionMap[IS_LOGGED_IN_KEY] === 'true',
      currentUserId: sessionMap[CURRENT_USER_ID_KEY] ?? '',
      currentUserName: sessionMap[CURRENT_USER_NAME_KEY] ?? '',
    };
  });
};

export const clearSession = () => {
  return AsyncStorage.multiRemove([
    IS_LOGGED_IN_KEY,
    CURRENT_USER_ID_KEY,
    CURRENT_USER_NAME_KEY,
  ]).then(() => undefined);
};