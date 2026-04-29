import { useEffect, useState } from 'react';
import socketService from './socketService';

export interface Notification {
  id: string;
  type: 'budget_alert' | 'recurring_synced';
  title: string;
  message: string;
  category?: string;
  data?: any;
  timestamp: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to budget alerts
    const unsubscribeBudget = socketService.subscribeToBudgetAlerts((data) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'budget_alert',
        title: `${data.category} Budget Alert`,
        message: data.message,
        category: data.category,
        data,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [notification, ...prev]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    });

    // Subscribe to recurring sync notifications
    const unsubscribeRecurring = socketService.subscribeToRecurringSync((data) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'recurring_synced',
        title: 'Recurring Transactions',
        message: data.message,
        data,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [notification, ...prev]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 4000);
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

  return {
    notifications,
    isConnected,
    dismissNotification,
  };
}
