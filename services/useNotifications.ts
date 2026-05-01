import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    void loadStoredNotifications().then((stored) => {
      setNotifications(stored);
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void saveStoredNotifications(notifications);
  }, [isHydrated, notifications]);

  const addNotification = (notification: Omit<Notification, 'isRead'>) => {
    const nextNotification: Notification = {
      ...notification,
      isRead: false,
    };

    setNotifications((prev) => [nextNotification, ...prev]);
  };

  useEffect(() => {
    // Subscribe to budget alerts
    const unsubscribeBudget = socketService.subscribeToBudgetAlerts((data) => {
      const category = 'category' in data ? data.category : 'Budget';
      const alertKey = `${category}-${data.spent}`;

      if (processedAlertKeys.has(alertKey)) {
        return; // Handled by another instance of this hook
      }
      processedAlertKeys.add(alertKey);

      setNotifications((prev) => {
        const isDuplicate = prev.some(n => 
          n.type === 'budget_alert' && 
          n.category === category && 
          n.data?.spent === data.spent
        );

        if (isDuplicate) {
          return prev;
        }

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
    });

    // Subscribe to recurring sync notifications
    const unsubscribeRecurring = socketService.subscribeToRecurringSync((data) => {
      addNotification({
        id: Date.now().toString(),
        type: 'recurring_synced',
        title: 'Recurring Transactions',
        message: data.message,
        data,
        timestamp: Date.now(),
      });
    });

    // Subscribe to connection status
    const unsubscribeConnect = socketService.onConnect(() => {
      setIsConnected(true);
      console.log('[Notifications] Connected to server');
    });

    const unsubscribeDisconnect = socketService.onDisconnect(() => {
      setIsConnected(false);
      console.log('[Notifications] Disconnected from server');
    });

    return () => {
      unsubscribeBudget();
      unsubscribeRecurring();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
