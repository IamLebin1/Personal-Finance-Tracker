import { Platform } from 'react-native';

// Provide a lightweight declaration for `process` in RN TS builds
declare const process: any;

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
      android: 'http://10.0.2.2:5001',
      ios: 'http://localhost:5001',
      default: 'http://localhost:5001',
    }),
};
