import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type {
  AuthStackParamList,
  MainTabParamList,
  TransactionsStackParamList,
} from './types';
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
import TransactionsScreen from '../screens/Transactions.tsx';
import TransactionFormScreen from '../screens/TransactionForm';
import AccountsScreen from '../screens/Accounts';
import AnalyticsScreen from '../screens/Analytics.tsx';
import { loadSession } from '../utils/session';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const MainStack = createNativeStackNavigator<MainTabParamList>();

const AuthFlow = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const TransactionsStackNavigator = () => (
  <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
    <TransactionsStack.Screen name="Transactions" component={TransactionsScreen} />
    <TransactionsStack.Screen name="TransactionForm" component={TransactionFormScreen} />
  </TransactionsStack.Navigator>
);

const MainStackNavigator = () => (
  <MainStack.Navigator
    screenOptions={{
      headerShown: false,
      animationEnabled: false,
    }}>
    <MainStack.Screen
      name="TransactionsStack"
      component={TransactionsStackNavigator}
    />
    <MainStack.Screen name="Accounts" component={AccountsScreen} />
    <MainStack.Screen name="Analytics" component={AnalyticsScreen} />
    <MainStack.Screen name="AddTransaction" component={TransactionsStackNavigator} />
  </MainStack.Navigator>
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
      {isLoggedIn ? <MainStackNavigator /> : <AuthFlow />}
    </NavigationContainer>
  );
};