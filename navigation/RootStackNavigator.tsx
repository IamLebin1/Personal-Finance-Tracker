import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabsNavigator from './MainTabsNavigator';
import AddTransaction from '../screens/AddTransaction';
import TransactionDetail from '../screens/TransactionDetail';
import type { Transaction } from '../types/transaction';

export type RootStackParamList = {
  MainTabs: undefined;
  AddTransaction: { fromFab?: boolean; originX?: number; originY?: number } | undefined;
  TransactionDetail: { transaction: Transaction };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: '#f5f7ff',
        headerStyle: { backgroundColor: '#090a1f' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#090a1f' },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransaction}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetail}
        options={{ title: 'Transaction Detail' }}
      />
    </Stack.Navigator>
  );
}
