import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabsNavigator from './MainTabsNavigator';
import AddTransaction from '../screens/AddTransaction';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TransactionDetail from '../screens/TransactionDetail';
import ProfileDetails from '../screens/ProfileDetails';
import SecuritySettings from '../screens/SecuritySettings';
import Notifications from '../screens/Notifications';
import BudgetScreen from '../screens/BudgetScreen';
import type { Transaction } from '../types/transaction';
import { loadAuthSession } from '../services/authSession';

export type RootStackParamList = {
  Login: { prefillEmail?: string; registeredName?: string } | undefined;
  Register: undefined;
  ForgotPassword: { prefillUsername?: string } | undefined;
  MainTabs: undefined;
  AddTransaction: { fromFab?: boolean; originX?: number; originY?: number } | undefined;
  TransactionDetail: { transaction: Transaction };
  ProfileDetails: undefined;
  SecuritySettings: undefined;
  Notifications: undefined;
  Budget: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await loadAuthSession();
        setIsAuthenticated(!!(session && session.token));
      } catch (err) {
        console.error('Session check error:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090a1f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7f5bff" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
      screenOptions={{
        headerTintColor: '#f5f7ff',
        headerStyle: { backgroundColor: '#090a1f' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#090a1f' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransaction}
        options={{ 
          headerShown: false,
          animation: 'none',
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' }
        }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetail}
        options={{ title: 'Transaction Detail' }}
      />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetails}
        options={{ title: 'Personal Details' }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettings}
        options={{ title: 'Security' }}
      />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
