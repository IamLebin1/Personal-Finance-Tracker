import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootStackNavigator from './navigation/RootStackNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { loadCurrencyPreference, startCurrencyRateFeed, stopCurrencyRateFeed } from './services/currencyService';
import { loadAuthSession } from './services/authSession';
import socketService from './services/socketService';
import { startTransactionSync, stopTransactionSync } from './services/transactionApi';

function AppContent() {
  const { isDark, colors } = useTheme();

  const navigationTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.cardBorder,
      text: colors.text,
      primary: colors.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.cardBorder,
      text: colors.text,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <RootStackNavigator />
    </NavigationContainer>
  );
}

function App() {
  useEffect(() => {
    void (async () => {
      await loadAuthSession();
      await loadCurrencyPreference();
      startCurrencyRateFeed().catch(console.warn);
      await socketService.connect();
      startTransactionSync();
    })().catch((error) => {
      console.warn('Failed to start app services:', error);
    });

    return () => {
      stopCurrencyRateFeed();
      socketService.disconnect();
      stopTransactionSync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
