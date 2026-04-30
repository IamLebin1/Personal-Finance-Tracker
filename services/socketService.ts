import { config } from '../config/appConfig';
import { getAuthSession } from './authSession';

interface BudgetAlert {
  category: string;
  spent: number;
  limit: number;
  percentUsed: number;
  message: string;
}

interface RecurringSynced {
  syncedCount: number;
  message: string;
  timestamp: string;
}

type NotificationListener = (data: BudgetAlert | RecurringSynced) => void;

type SocketClientModule = {
  io: typeof import('socket.io-client').io;
};

let socketClientModule: SocketClientModule | null = null;

function loadSocketClient(): SocketClientModule | null {
  if (socketClientModule) {
    return socketClientModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    socketClientModule = require('socket.io-client');
    return socketClientModule;
  } catch (error) {
    console.warn('[Socket] socket.io-client is unavailable. Running without live socket features.', error);
    socketClientModule = null;
    return null;
  }
}

class SocketService {
  private socket: any | null = null;
  private budgetAlertListeners: Set<NotificationListener> = new Set();
  private recurringListeners: Set<NotificationListener> = new Set();
  private connectListeners: Set<() => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();

  connect(serverUrl: string = config.apiBaseUrl): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const socketClient = loadSocketClient();
        if (!socketClient?.io) {
          this.socket = null;
          resolve();
          return;
        }

        const normalizedUrl = String(serverUrl || '').trim();
        const baseUrl = normalizedUrl ? normalizedUrl.replace(/\/api\/?$/, '') : 'http://localhost:5001';
        
        this.socket = socketClient.io(`${baseUrl}/finance`, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('[Socket] Connected to server');
          
          // Send user login event with userId
          const session = getAuthSession();
          if (session?.userId) {
            this.socket?.emit('user_login', { userId: session.userId });
            console.log(`[Socket] Emitted user_login for userId: ${session.userId}`);
          }

          this.connectListeners.forEach(listener => listener());
          resolve();
        });

        this.socket.on('error', (error) => {
          console.error('[Socket] Connection error:', error);
          reject(error);
        });

        // Listen for budget alerts
        this.socket.on('budget_alert', (data: BudgetAlert) => {
          console.log('[Socket] Budget alert received:', data);
          this.budgetAlertListeners.forEach(listener => listener(data));
        });

        // Listen for recurring sync notifications
        this.socket.on('recurring_synced', (data: RecurringSynced) => {
          console.log('[Socket] Recurring sync notification:', data);
          this.recurringListeners.forEach(listener => listener(data));
        });

        this.socket.on('disconnect', () => {
          console.log('[Socket] Disconnected from server');
          this.disconnectListeners.forEach(listener => listener());
        });
      } catch (error) {
        console.warn('[Socket] Connection skipped or failed; continuing in offline mode.', error);
        this.socket = null;
        resolve();
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Manually disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Send budget check to server
  checkBudget(userId: string, category: string, spent: number, limit: number): void {
    if (this.socket) {
      this.socket.emit('check_budget', {
        userId,
        category,
        spent,
        limit,
      });
      console.log(`[Socket] Sent check_budget for ${category}`);
    } else {
      console.warn('[Socket] Not connected. Cannot send check_budget');
    }
  }

  // Send recurring sync notification
  syncRecurring(userId: string, syncedCount: number): void {
    if (this.socket) {
      this.socket.emit('sync_recurring', {
        userId,
        syncedCount,
      });
      console.log(`[Socket] Sent sync_recurring: ${syncedCount} transactions`);
    } else {
      console.warn('[Socket] Not connected. Cannot send sync_recurring');
    }
  }

  // Subscribe to budget alerts
  subscribeToBudgetAlerts(listener: NotificationListener): () => void {
    this.budgetAlertListeners.add(listener);
    console.log('[Socket] Budget alert listener added');

    // Return unsubscribe function
    return () => {
      this.budgetAlertListeners.delete(listener);
      console.log('[Socket] Budget alert listener removed');
    };
  }

  // Subscribe to recurring sync notifications
  subscribeToRecurringSync(listener: NotificationListener): () => void {
    this.recurringListeners.add(listener);
    console.log('[Socket] Recurring sync listener added');

    // Return unsubscribe function
    return () => {
      this.recurringListeners.delete(listener);
      console.log('[Socket] Recurring sync listener removed');
    };
  }

  // Subscribe to connection status
  onConnect(listener: () => void): () => void {
    this.connectListeners.add(listener);
    return () => {
      this.connectListeners.delete(listener);
    };
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => {
      this.disconnectListeners.delete(listener);
    };
  }
}

export default new SocketService();
