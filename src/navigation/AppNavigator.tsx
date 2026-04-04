import React from 'react';
import { Pressable, Text } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

  const baseTabBarStyle = {
    backgroundColor: 'rgba(22,21,31,0.95)',
    borderTopColor: 'rgba(255,255,255,0.07)',
    height: 74,
    paddingTop: 6,
    paddingBottom: 8,
  };

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#F8FAFC',
        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: baseTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="TransactionsStack"
        component={TransactionsStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Transactions';
          const isFormRoute = routeName === 'TransactionForm';

          return {
          title: 'Home',
          headerShown: false,
          headerRight: () => signOutButton(() => signOut()),
          tabBarStyle: isFormRoute ? { display: 'none' } : baseTabBarStyle,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size + 2} />
          ),
        }}}
      />
      <Tabs.Screen
        name="AddTransaction"
        component={TransactionsStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('TransactionsStack', {
              screen: 'TransactionForm',
            } as never);
          },
        })}
        options={{
          title: 'Add',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              color={focused ? '#A78BFA' : '#64748B'}
              size={size + 8}
            />
          ),
          tabBarLabelStyle: {
            marginTop: -2,
          },
        }}
      />
      <Tabs.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerRight: () => signOutButton(() => signOut()),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
              size={size + 2}
            />
          ),
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