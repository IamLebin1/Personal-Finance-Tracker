import React from 'react';
import { Pressable, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import type {
  AuthStackParamList,
  MainTabParamList,
  TransactionsStackParamList,
} from './types';
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
import TransactionsScreen from '../screens/Transactions';
import TransactionFormScreen from '../screens/TransactionForm';
import AnalyticsScreen from '../screens/Analytics.tsx';
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const signOutButton = (onPress: () => void) => (
  <Pressable onPress={onPress} style={{ marginRight: 14 }}>
    <Text style={{ color: '#38BDF8', fontWeight: '700' }}>Sign Out</Text>
  </Pressable>
);

const AuthFlow = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const TransactionsStackNavigator = () => {
  const { signOut } = useAuth();

  return (
    <TransactionsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        contentStyle: { backgroundColor: '#F4F7FB' },
      }}>
      <TransactionsStack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transactions',
          headerRight: () => signOutButton(() => signOut()),
        }}
      />
      <TransactionsStack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={({ route }) => ({
          title: route.params?.transactionId ? 'Edit Transaction' : 'New Transaction',
        })}
      />
    </TransactionsStack.Navigator>
  );
};

const MainTabs = () => {
  const { signOut } = useAuth();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#F8FAFC',
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0' },
      }}>
      <Tabs.Screen
        name="TransactionsStack"
        component={TransactionsStackNavigator}
        options={{
          title: 'Home',
          headerShown: false,
          headerRight: () => signOutButton(() => signOut()),
        }}
      />
      <Tabs.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerRight: () => signOutButton(() => signOut()),
        }}
      />
    </Tabs.Navigator>
  );
};

export const AppNavigator = () => {
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer key={isLoggedIn ? 'main' : 'auth'}>
      {isLoggedIn ? <MainTabs /> : <AuthFlow />}
    </NavigationContainer>
  );
};