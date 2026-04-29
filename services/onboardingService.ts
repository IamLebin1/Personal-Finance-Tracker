import AsyncStorage from '@react-native-async-storage/async-storage';

function getOnboardingKey(userId: string): string {
  return `@onboarding_completed_${userId}`;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const value = await AsyncStorage.getItem(getOnboardingKey(userId));
    return value === '1';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
  if (!userId) return;

  try {
    if (completed) {
      await AsyncStorage.setItem(getOnboardingKey(userId), '1');
      return;
    }

    await AsyncStorage.removeItem(getOnboardingKey(userId));
  } catch {
    // Ignore persistence errors for onboarding flag.
  }
}
