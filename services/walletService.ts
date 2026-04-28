import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_WALLET_KEY = '@finance_tracker_selected_wallet';

export async function getSelectedWalletId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_WALLET_KEY);
  } catch {
    return null;
  }
}

export async function setSelectedWalletId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_WALLET_KEY, id);
  } catch {
    // Ignore
  }
}

export async function clearSelectedWalletId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SELECTED_WALLET_KEY);
  } catch {
    // Ignore
  }
}
