import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../constants/theme';

const THEME_KEY = '@finance_tracker_theme';

export async function getSavedTheme(): Promise<ThemeType> {
  try {
    const theme = await AsyncStorage.getItem(THEME_KEY);
    return (theme as ThemeType) || 'dark';
  } catch {
    return 'dark';
  }
}

export async function saveTheme(theme: ThemeType): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}
