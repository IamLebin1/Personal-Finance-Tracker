import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabsNavigator from './MainTabsNavigator';
import AddTransaction from '../screens/AddTransaction';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PinEntryScreen from '../screens/PinEntryScreen';
import TransactionDetail from '../screens/TransactionDetail';
import ProfileDetails from '../screens/ProfileDetails';
import SecuritySettings from '../screens/SecuritySettings';
import Notifications from '../screens/Notifications';
import BudgetScreen from '../screens/BudgetScreen';
import WalletManagement from '../screens/WalletManagement';
import OnboardingSetup from '../screens/OnboardingSetup';
import RecurringTransactions from '../screens/RecurringTransactions';
import HelpSupport from '../screens/HelpSupport';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import CategoryManagement from '../screens/CategoryManagement';
import type { Transaction } from '../types/transaction';
import { loadAuthSession } from '../services/authSession';
import { hasCompletedOnboarding, setOnboardingCompleted } from '../services/onboardingService';
import { getWallets } from '../services/walletApi';

export type RootStackParamList = {
  Login: { prefillEmail?: string; registeredName?: string } | undefined;
  Register: undefined;
  ForgotPassword: { prefillUsername?: string } | undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  MainTabs: undefined;
  AddTransaction: { fromFab?: boolean; originX?: number; originY?: number } | undefined;
  TransactionDetail: { transaction: Transaction };
  ProfileDetails: undefined;
  SecuritySettings: undefined;
  Notifications: undefined;
  Budget: undefined;
  WalletManagement: undefined;
  CategoryManagement: undefined;
  OnboardingSetup: undefined;
  RecurringTransactions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await loadAuthSession();
        const isAuthenticated = !!(session && session.token);
        
        if (isAuthenticated && session?.userId) {
          let setupCompleted = await hasCompletedOnboarding(session.userId);

          if (!setupCompleted) {
            try {
              const wallets = await getWallets();
              if (wallets.length > 0) {
                setupCompleted = true;
                await setOnboardingCompleted(session.userId, true);
              }
            } catch {
              // Keep setupCompleted as false if wallets cannot be loaded.
            }
          }

          setInitialRoute(setupCompleted ? 'MainTabs' : 'OnboardingSetup');
        } else {
          setInitialRoute('Login');
        }
      } catch (err) {
        console.error('Session check error:', err);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    void checkSession();
  }, []);

  return (
    isLoading ? (
      <View style={{ flex: 1, backgroundColor: '#090a1f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7f5bff" />
      </View>
    ) : (
      <Stack.Navigator
        initialRouteName={initialRoute}
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
        <Stack.Screen
          name="WalletManagement"
          component={WalletManagement}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CategoryManagement"
          component={CategoryManagement}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OnboardingSetup"
          component={OnboardingSetup}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupport}
          options={{ title: 'Help & Support' }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicy}
          options={{ title: 'Privacy Policy' }}
        />
        <Stack.Screen
          name="RecurringTransactions"
          component={RecurringTransactions}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    )
  );
}
