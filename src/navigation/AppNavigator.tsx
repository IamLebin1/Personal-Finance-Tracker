import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from './types';
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
import { MainTabsNavigator } from './MainTabs';
import { loadSession } from '../utils/session';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthFlow = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

export const AppNavigator = () => {
  const { isLoggedIn, login } = useAuth();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    loadSession()
      .then(session => {
        if (session.isLoggedIn) {
          login(session.currentUserId, session.currentUserName);
        }

        setBootstrapped(true);
      })
      .catch(() => {
        setBootstrapped(true);
      });
  }, [login]);

  if (!bootstrapped) {
    return null;
  }

  return (
    <NavigationContainer key={isLoggedIn ? 'main' : 'auth'}>
      {isLoggedIn ? <MainTabsNavigator /> : <AuthFlow />}
    </NavigationContainer>
  );
};