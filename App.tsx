import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootStackNavigator from './navigation/RootStackNavigator';
import { loadCurrencyPreference, startCurrencyRateFeed, stopCurrencyRateFeed } from './services/currencyService';

const financeDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#090a1f',
    card: '#101230',
    border: '#1f2357',
    text: '#f2f4ff',
    primary: '#7f5bff',
    notification: '#16ca8e',
  },
};

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
      <StatusBar barStyle="light-content" backgroundColor="#090a1f" />
      <NavigationContainer theme={financeDarkTheme}>
        <RootStackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
