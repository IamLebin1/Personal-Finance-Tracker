import { Platform } from 'react-native';

const appMode = process.env.APP_MODE ?? 'local';

export const config = {
  appMode,
  isLocalMode: appMode === 'local',
  demoUserId: process.env.DEFAULT_USER_ID ?? 'demo-user',
  currencyCode: process.env.DEFAULT_CURRENCY_CODE ?? 'USD',
  sqliteDbName: process.env.SQLITE_DB_NAME ?? 'db/finance_tracker.sqlite',
  sqliteSeedDemoData: (process.env.SQLITE_SEED_DEMO ?? 'true') === 'true',
  apiBaseUrl:
    process.env.API_BASE_URL ??
    Platform.select({
      android: 'http://192.168.100.7:5001',
      ios: 'http://192.168.0.6:5001',
      default: 'http://localhost:5001',
    }),
};
