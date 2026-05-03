import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './socketService';

export interface Notification {
  id: string;
  type: 'budget_alert' | 'recurring_synced';
  title: string;
  message: string;
  category?: string;
  data?: any;
  timestamp: number;
  isRead: boolean;
}

const NOTIFICATIONS_KEY = '@app_notifications';
const processedAlertKeys = new Set<string>();
const storeListeners = new Set<() => void>();

let notificationsStore: Notification[] = [];
let isConnectedStore = false;
let isHydratedStore = false;
let isInitializingStore = false;
let hasSocketSubscriptions = false;

async function loadStoredNotifications(): Promise<Notification[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as Notification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load notifications', error);
    return [];
  }
}

async function saveStoredNotifications(notifications: Notification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications', error);
  }
}

function emitStoreChange(): void {
  storeListeners.forEach(listener => listener());
}

function setNotificationsStore(
  next: Notification[] | ((prev: Notification[]) => Notification[]),
): void {
  notificationsStore = typeof next === 'function'
    ? (next as (prev: Notification[]) => Notification[])(notificationsStore)
    : next;

  if (isHydratedStore) {
    void saveStoredNotifications(notificationsStore);
  }

  emitStoreChange();
}

function setIsConnectedStore(next: boolean): void {
  if (isConnectedStore === next) return;
  isConnectedStore = next;
  emitStoreChange();
}

function setupSocketSubscriptions(): void {
  if (hasSocketSubscriptions) return;
  hasSocketSubscriptions = true;

  socketService.subscribeToBudgetAlerts((data) => {
    const category = 'category' in data ? data.category : 'Budget';
    const spent = 'spent' in data ? data.spent : undefined;
    const alertKey = `${category}-${String(spent ?? '')}`;

    if (processedAlertKeys.has(alertKey)) {
      return;
    }
    processedAlertKeys.add(alertKey);

    let didInsert = false;
    setNotificationsStore((prev) => {
      const isDuplicate = prev.some(n =>
        n.type === 'budget_alert' &&
        n.category === category &&
        n.data?.spent === spent
      );

      if (isDuplicate) {
        return prev;
      }

      didInsert = true;
      return [{
        id: Date.now().toString(),
        type: 'budget_alert',
        title: `${category} Budget Alert`,
        message: data.message,
        category,
        data,
        timestamp: Date.now(),
        isRead: false,
      }, ...prev];
    });

    if (didInsert) {
      setTimeout(() => {
        Alert.alert(
          `${category} Budget Alert`,
          data.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK' }
          ]
        );
      }, 0);
    }
  });

  socketService.subscribeToRecurringSync((data) => {
    setNotificationsStore((prev) => [{
      id: Date.now().toString(),
      type: 'recurring_synced',
      title: 'Recurring Transactions',
      message: data.message,
      data,
      timestamp: Date.now(),
      isRead: false,
    }, ...prev]);
  });

  socketService.onConnect(() => {
    setIsConnectedStore(true);
    console.log('[Notifications] Connected to server');
  });

  socketService.onDisconnect(() => {
    setIsConnectedStore(false);
    console.log('[Notifications] Disconnected from server');
  });
}

async function initializeStore(): Promise<void> {
  if (isHydratedStore || isInitializingStore) {
    return;
  }

  isInitializingStore = true;
  try {
    notificationsStore = await loadStoredNotifications();
    isHydratedStore = true;
    emitStoreChange();
  } finally {
    isInitializingStore = false;
    setupSocketSubscriptions();
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(notificationsStore);
  const [isConnected, setIsConnected] = useState(isConnectedStore);

  useEffect(() => {
    const syncFromStore = () => {
      setNotifications(notificationsStore);
      setIsConnected(isConnectedStore);
    };

    storeListeners.add(syncFromStore);
    void initializeStore();

    return () => {
      storeListeners.delete(syncFromStore);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotificationsStore((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotificationsStore((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotificationsStore((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotificationsStore([]);
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return {
    notifications,
    isConnected,
    dismissNotification,
    markAllAsRead,
    markAsRead,
    clearAllNotifications,
    unreadCount,
  };
}
