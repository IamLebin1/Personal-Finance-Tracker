# Personal Finance Tracker

Personal Finance Tracker is a React Native mobile application for managing income, expenses, transaction history, and analytics for the UECS3253 Wireless Application Development course.

## Overview

The app provides:

- Dashboard summaries for balances and recent activity
- Add, edit, and delete transactions
- Transaction history with filtering and search
- Analytics screens for spending trends and category breakdowns
- Local persistence using SQLite

## Tech Stack

- React Native
- TypeScript
- React Navigation
- SQLite / `react-native-sqlite-storage`
- SVG charts and custom UI components

## Project Structure

- `App.tsx`: app entry point and navigation setup
- `navigation/`: stack, drawer, and tab navigation
- `screens/`: dashboard, analytics, history, profile, and transaction screens
- `services/`: transaction and analytics helpers
- `db/`: SQLite access layer
- `types/`: shared TypeScript types

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/iamLebin1/Personal-Finance-Tracker.git
    cd Personal-Finance-Tracker
    ```

2. Install the React Native app dependencies:

    ```bash
    npm install --legacy-peer-deps
    ```

3. If you are setting up the optional Node.js backend / API layer, install the requested packages:

    ```bash
    npm install sqlite
    npm install sqlite3
    npm install cors
    npm install express body-parser cors
    npm install express socket.io
    ```

    If you want a cleaner install flow, the first four commands can be combined into one package install command, but the lines above are kept exactly as requested for project setup notes.

4. Create the local environment file if your setup uses one:

    ```bash
    copy .env.example .env
    ```

5. Configure SQLite local settings if needed:

    - `APP_MODE=local`
    - `SQLITE_DB_NAME=finance_tracker.sqlite`
    - `SQLITE_SEED_DEMO=true`

## Run the App

Start Metro:

```bash
npm start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
npm run ios
```

## Run Backend Demo (db folder)

Use one terminal from the project root.

1. Start the backend API server (schema + seed are created automatically):

```bash
cd db
node service.js
```

2. Test in browser or API client:

```text
http://localhost:5000/api/transactions
```

Expected response (pretty print):

```json
[
    {
        "id": "seed-2",
        "amount": 84.2,
        "type": "expense",
        "category": "groceries",
        "date": "2026-04-04T11:45:00Z",
        "note": "Weekend grocery run",
        "receiptUrl": "",
        "userId": "demo-user"
    },
    {
        "id": "seed-1",
        "amount": 4200,
        "type": "income",
        "category": "salary",
        "date": "2026-04-04T08:30:00Z",
        "note": "Monthly salary",
        "receiptUrl": "",
        "userId": "demo-user"
    },
    {
        "id": "seed-3",
        "amount": 14.9,
        "type": "expense",
        "category": "transport",
        "date": "2026-04-03T15:15:00Z",
        "note": "Grab ride",
        "receiptUrl": "",
        "userId": "demo-user"
    },
    {
        "id": "seed-4",
        "amount": 120,
        "type": "expense",
        "category": "utilities",
        "date": "2026-04-02T09:00:00Z",
        "note": "Water bill",
        "receiptUrl": "",
        "userId": "demo-user"
    },
    {
        "id": "seed-5",
        "amount": 250,
        "type": "income",
        "category": "freelance",
        "date": "2026-04-01T19:00:00Z",
        "note": "Side project payment",
        "receiptUrl": "",
        "userId": "demo-user"
    }
]
```

## Notes

- This repository is primarily a React Native mobile app.
- Packages like `express`, `cors`, `body-parser`, and `socket.io` are typically used for a separate backend service if you decide to extend the project.
- The app uses local SQLite storage for transaction data and analytics.

## Troubleshooting

If installation or native build steps fail, make sure your React Native environment is correctly configured for Android and iOS, and reinstall dependencies after updating native modules.

### Register Fails (Login/Register Screen)

If registration fails in the app, check these first:

1. Backend server is running:

```bash
cd db
node service.js
```

2. API URL is reachable from your device:
- Android emulator: `http://10.0.2.2:5000`
- iOS simulator: `http://localhost:5000`
- Real phone: use your PC LAN IP, for example `http://192.168.1.10:5000`

You can set it with environment variable:

```env
API_BASE_URL=http://192.168.1.10:5000
```

3. Username may already exist:
- The API returns `username already exists` for duplicates.
- Try a new username.

4. Quick backend test for register:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/register" -ContentType "application/json" -Body (@{ username = "testuser_new"; password = "123456" } | ConvertTo-Json)
```
