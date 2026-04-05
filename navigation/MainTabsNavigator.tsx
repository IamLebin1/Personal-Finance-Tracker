import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../screens/Dashboard';
import History from '../screens/History';
import Analytics from '../screens/Analytics';
import Profile from '../screens/Profile';
import FinanceTabBar from '../components/FinanceTabBar';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export type MainTabsParamList = {
  Dashboard: undefined;
  History: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function renderFinanceTabBar(props: BottomTabBarProps) {
  return <FinanceTabBar {...props} />;
}

export default function MainTabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderFinanceTabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#090a1f' },
      }}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="History" component={History} />
      <Tab.Screen name="Analytics" component={Analytics} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
