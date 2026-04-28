import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootStackNavigator from './navigation/RootStackNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

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
    void loadCurrencyPreference();
    void startCurrencyRateFeed();

    return () => {
      stopCurrencyRateFeed();
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
