import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TransactionsScreen from '../screens/Transactions';
import TransactionFormScreen from '../screens/TransactionForm';
import HistoryScreen from '../screens/History';
import AccountsScreen from '../screens/Accounts';
import AnalyticsScreen from '../screens/Analytics';

import type { MainTabParamList, TransactionsStackParamList } from './types';

const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TransactionsStackNavigator = () => (
  <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
    <TransactionsStack.Screen name="Transactions" component={TransactionsScreen} />
    <TransactionsStack.Screen name="TransactionForm" component={TransactionFormScreen} />
  </TransactionsStack.Navigator>
);

interface TabItem {
  label: string;
  icon: string;
  activeIcon: string;
  route: keyof MainTabParamList;
  fab?: boolean;
}

const TAB_ITEMS: TabItem[] = [
  {
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    route: 'TransactionsStack',
  },
  {
    label: 'History',
    icon: 'time-outline',
    activeIcon: 'time',
    route: 'History',
  },
  {
    label: '',
    icon: 'add',
    activeIcon: 'add',
    route: 'TransactionsStack',
    fab: true,
  },
  {
    label: 'Analytics',
    icon: 'analytics-outline',
    activeIcon: 'analytics',
    route: 'Analytics',
  },
  {
    label: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    route: 'Accounts',
  },
];

const CustomTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNavWrap, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]} pointerEvents="box-none">
      <View style={styles.bottomNav}>
        {TAB_ITEMS.map((item, index) => {
          const isFocused = state.index === index;

          if (item.fab) {
            return (
              <View key={`fab-${index}`} style={styles.fabSlot}>
                <Pressable
                  style={styles.fabButton}
                  onPress={() => {
                    navigation.navigate('TransactionsStack', { screen: 'TransactionForm' });
                  }}>
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={`tab-${index}`}
              style={styles.tabItem}
              onPress={() => {
                navigation.navigate(item.route);
              }}>
              <Ionicons
                name={(isFocused ? item.activeIcon : item.icon) as any}
                size={24}
                color={isFocused ? '#A78BFA' : '#64748B'}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {item.label}
              </Text>
              {isFocused ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const MainTabsNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
    }}
    tabBar={(props) => <CustomTabBar {...props} />}
  > 
    <Tab.Screen
      name="TransactionsStack"
      component={TransactionsStackNavigator}
      options={{ title: 'Home' }}
    />
    <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(19,18,33,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#A78BFA',
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
    marginTop: 2,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#251dc9',
    borderWidth: 4,
    borderColor: '#0f0e17',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
});
