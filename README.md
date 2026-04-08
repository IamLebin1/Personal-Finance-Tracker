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

## Notes

- This repository is primarily a React Native mobile app.
- Packages like `express`, `cors`, `body-parser`, and `socket.io` are typically used for a separate backend service if you decide to extend the project.
- The app uses local SQLite storage for transaction data and analytics.

## Troubleshooting

If installation or native build steps fail, make sure your React Native environment is correctly configured for Android and iOS, and reinstall dependencies after updating native modules.
