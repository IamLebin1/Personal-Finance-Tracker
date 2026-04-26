# Personal Finance Tracker

Personal Finance Tracker is a React Native app for tracking income, expenses, history, and spending analytics.

## Features

- Dashboard with balance and recent transactions
- Add, edit, and delete transactions
- Transaction history with filters and search
- Analytics for spending trends and categories
- Local SQLite data storage

## Tech Stack

- React Native + TypeScript
- React Navigation
- SQLite
- Express demo backend (optional)

## Project Structure

- `App.tsx` - App entry and root navigation
- `screens/` - Main app screens
- `navigation/` - Stack, tab, and drawer navigators
- `components/` - Reusable UI components
- `services/` - App services and API helpers
- `db/` - Optional Node.js backend demo
- `config/` - Local app configuration

## Prerequisites

- Node.js 22.11.0 or higher
- React Native development environment (Android Studio / Xcode)

<<<<<<< HEAD
## Setup Instructions
1. Clone and enter the project:
   ```bash
   git clone https://github.com/iamLebin1/Personal-Finance-Tracker.git
   cd Personal-Finance-Tracker
   ```

2. Install dependencies:
    ```bash
    npm install --legacy-peer-deps
    ```

3. Create your local app config (required):
    ```bash
    copy config\appConfig.example.ts config\appConfig.ts
    ```
    *Note: `config/appConfig.ts` is gitignored, so each developer must create their own local copy.*

4. Edit `config/appConfig.ts` for your environment:
    - `APP_MODE` (for example: `local`)
    - `SQLITE_DB_NAME` (for example: `db/finance_tracker.sqlite`)
    - `SQLITE_SEED_DEMO` (`true` or `false`)
    - `API_BASE_URL` (if using backend mode)

5. Run the application:
    ```bash
    npx react-native run-android
    ```
=======
## Quick Start

1. Clone and enter the project:

```bash
git clone https://github.com/iamLebin1/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker
```

2. Install dependencies:
>>>>>>> 35d555e7e9f430e0a4ff385d572955c3a02f1ca4

```bash
npm install --legacy-peer-deps
```

3. Create your local app config (required):

```bash
copy config\appConfig.example.ts config\appConfig.ts
```

`config/appConfig.ts` is gitignored, so each developer must create their own local copy.

4. Edit `config/appConfig.ts` for your environment:

- `APP_MODE` (for example: `local`)
- `SQLITE_DB_NAME` (for example: `db/finance_tracker.sqlite`)
- `SQLITE_SEED_DEMO` (`true` or `false`)
- `API_BASE_URL` (if using backend mode)

## Run the App

Start Metro:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

## Optional Backend Demo

If you want to run the demo API server in `db/service.js`:

1. Start backend:

```bash
cd db
node service.js
```

2. Test endpoint:

```text
http://localhost:5000/api/transactions
```

## API Base URL Guide

Use the correct URL for your device target:

- Android emulator: `http://10.0.2.2:5000`
- iOS simulator: `http://localhost:5000`
- Real device: `http://<your-lan-ip>:5000` (example: `http://192.168.1.10:5000`)

## Troubleshooting

### App does not build

- Confirm React Native environment is fully set up
- Reinstall dependencies if needed (remove `node_modules` manually, then run):

```bash
npm install --legacy-peer-deps
```

### Registration fails

1. Confirm backend is running:

```bash
cd db
node service.js
node user.js
```

2. Confirm `API_BASE_URL` in `config/appConfig.ts` matches your device target.

3. If username is duplicated, register with a different username.

4. Optional quick register test:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/register" -ContentType "application/json" -Body (@{ username = "testuser_new"; password = "123456" } | ConvertTo-Json)
```
