import AsyncStorage from '@react-native-async-storage/async-storage';

const getPinKey = (userId: string) => `@app_pin_${userId}`;
const getPinEnabledKey = (userId: string) => `@pin_enabled_${userId}`;

export async function setPin(userId: string, pin: string): Promise<void> {
  try {
    await AsyncStorage.setItem(getPinKey(userId), pin);
  } catch (e) {
    console.error('Failed to save PIN', e);
  }
}

export async function getPin(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(getPinKey(userId));
  } catch (e) {
    console.error('Failed to get PIN', e);
    return null;
  }
}

export async function setPinEnabled(userId: string, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(getPinEnabledKey(userId), JSON.stringify(enabled));
  } catch (e) {
    console.error('Failed to set PIN status', e);
  }
}

export async function isPinEnabled(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(getPinEnabledKey(userId));
    return value ? JSON.parse(value) : false;
  } catch (e) {
    console.error('Failed to check PIN status', e);
    return false;
  }
}

export async function validatePin(userId: string, input: string): Promise<boolean> {
  const storedPin = await getPin(userId);
  return storedPin === input;
}

export async function clearPin(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getPinKey(userId));
    await AsyncStorage.removeItem(getPinEnabledKey(userId));
  } catch (e) {
    console.error('Failed to clear PIN', e);
  }
}
