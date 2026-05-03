import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainTabsNavigator from './MainTabsNavigator';
import ProfileDetails from '../screens/ProfileDetails';
import SecuritySettings from '../screens/SecuritySettings';
import HelpSupport from '../screens/HelpSupport';
import { useTheme } from '../context/ThemeContext';

export type DrawerParamList = {
  MainTabs: undefined;
  ProfileDetails: undefined;
  SecuritySettings: undefined;
  HelpSupport: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  const { colors } = useTheme();
  
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.card },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
        drawerLabelStyle: { fontWeight: '600' },
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabsNavigator} 
        options={{ title: 'Home' }}
      />
      <Drawer.Screen 
        name="ProfileDetails" 
        component={ProfileDetails} 
        options={{ title: 'Profile Settings' }}
      />
      <Drawer.Screen 
        name="SecuritySettings" 
        component={SecuritySettings} 
        options={{ title: 'Security' }}
      />
      <Drawer.Screen 
        name="HelpSupport" 
        component={HelpSupport} 
        options={{ title: 'Help & Support' }}
      />
    </Drawer.Navigator>
  );
}
