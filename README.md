# Personal Finance Tracker

Mobile app for tracking income and expenses, built with React Native and a simple Node.js + SQLite backend API.

## Team (Group P4)

| Student Name | Student ID | Programme | Role |
| :--- | :--- | :--- | :--- |
| Chin Lok Bin | 2400968 | Software Engineering | Team Leader / Developer |
| Kiu Chun Woon | 2401624 | Software Engineering | Developer |
| Tan Yi Wen | 2400800 | Software Engineering | Developer |
| Wong Xiang Rou | 2401634 | Software Engineering | Developer |

## Features

- Email/password registration and login
- Add, edit, delete, and list transactions
- Analytics pie chart by spending category
- Login-first navigation flow

## Tech Stack

- React Native (TypeScript)
- React Navigation (stack + tabs)
- Express.js backend
- SQLite database (`membership.sqlite`)
- Fetch API for client-server communication

## Project Structure

- Frontend app: [App.tsx](App.tsx)
- Backend server: [server.js](server.js)
- API base URL config: [src/config/Config.tsx](src/config/Config.tsx)
- Screens: [src/screens](src/screens)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start backend server (from this project folder):

```bash
npm run server
```

3. In another terminal, start Metro:

```bash
npm start
```

4. Run Android app:

```bash
npm run android
```

## Server URL Setup

The app reads backend URL from [src/config/Config.tsx](src/config/Config.tsx) and [src/config/Config.ts](src/config/Config.ts).

- Android emulator: `http://10.0.2.2:5000`
- Physical Android device: `http://YOUR_PC_LAN_IP:5000` (example: `http://192.168.000.0:5000`)

See [SERVER_SETUP.md](SERVER_SETUP.md) for full steps and troubleshooting.

## Important Notes

- Run backend in the correct folder (`Personal-Finance-Tracker`).
- If backend is started in a parent directory, npm cannot find `package.json`.
- If physical device cannot connect, check Windows Firewall and ensure phone/PC are on same Wi-Fi.

## API Endpoints

- `POST /api/register`
- `POST /api/login`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
