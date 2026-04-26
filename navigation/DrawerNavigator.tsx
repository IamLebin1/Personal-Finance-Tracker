import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RootStackNavigator from './RootStackNavigator';

export type DrawerParamList = {
  Home: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: '#111432' },
        drawerActiveTintColor: '#8f79ff',
        drawerInactiveTintColor: '#7f86c0',
        drawerLabelStyle: { fontWeight: '600' },
      }}
    >
      <Drawer.Screen name="Home" component={RootStackNavigator} />
    </Drawer.Navigator>
  );
}
