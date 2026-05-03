# Personal Finance Tracker

A premium, dark-themed React Native application for tracking wealth, expenses, and financial insights. Features smooth animations, data visualization, and a secure backend.

# IMPORTANT:
- MUST EDIT `config/appConfig.ts` to point to your local backend URL (e.g., `http://10.0.2.2:5001`) for Android Emulators.
- The backend must be running (`node db/service.js`) for the app to function properly.
- Do not start `db/tracker.js` or `db/user.js` for the main app; they do not include the full auth + socket backend.
- Run `npm run android` to keep your app/device on 8081
- Run `npm start` to start the Metro bundler on 8082 (websocket server )


## 🚀 Features

- **Dashboard**: Real-time balance overview with interactive Income/Expense cards.
- **Recent Activity**: Modern transaction list with detailed date formatting and descending sorting.
- **Financial Insights**: 
  - Bezier Curve spending graph (Newest data on the left).
  - Monthly spending trend indicators.
  - Interactive calendar showing daily net surplus/expense totals.
- **Transaction Management**: Add transactions with a built-in calculator and circular reveal transition.
- **Profile Management**: Functional personal details editor (username, email, phone) synced with the backend.
- **Smooth Transitions**: Optimized with `InteractionManager` for a lag-free experience.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v22.11.0 or higher
- **Java JDK**: 17 (for Android)
- **Android Studio**: Configured with SDK, Platform Tools, and Emulator.
- **Git**: To clone the repository.

---

## 📦 Installation & Setup

Follow these steps in order to get the app running.

### 1. Clone the Repository
```bash
git clone https://github.com/iamLebin1/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

If you run into dependency issues, make sure to install the packages before starting the app or backend.

### 3. Setup Configuration
The app requires a local configuration file. Copy the example to create your own:
```bash
# Windows
copy config\appConfig.example.ts config\appConfig.ts

# Mac / Linux
cp config/appConfig.example.ts config/appConfig.ts
```
*Note: Open `config/appConfig.ts` and ensure `apiBaseUrl` points to the correct backend host for your device:
- Android emulator: `http://10.0.2.2:5001`
- Real Android device via USB: `http://localhost:5001` plus `adb reverse tcp:5001 tcp:5001`
- Physical device over Wi-Fi: `http://<PC_LOCAL_IP>:5001`*

---

## 🖥️ Running the Backend (Required for Auth & Data)

The app uses a Node.js/SQLite backend for data persistence and profile management.

1. **Navigate to the root directory** (if not already there).
2. **Start the server**:
   ```bash
   node db/service.js
   ```
3. **Verify**: You should see `Server running on port 5001`. The backend will automatically create and seed the SQLite database if it doesn't exist.

---

## 📱 Running the Mobile App

### 1. Android
Ensure an emulator is running or a device is connected via ADB.
```bash
# In a new terminal window
npm run android
```

### 2. iOS (Mac Only)
```bash
# Install pods first
cd ios && pod install && cd ..
# Run the app
npm run ios
```

---

## 🔧 Troubleshooting

### "Failed to load profile details"
1. **Restart Backend**: Stop the `node db/service.js` process and restart it.
2. **Port Check**: Ensure the server is on `5001` and the app config matches.
3. **ADB Reverse**: If using a real Android device via USB:
   ```bash
   adb reverse tcp:5001 tcp:5001
   ```

### "JSRangeErrorException" (Intl Error)
This error occurs on older Hermes versions. I have patched the app to use `en-US` and lowercase options (e.g., `{ month: 'long' }`) to fix this. Ensure you are using the latest code.

### App is Laggy
The app is optimized to wait for transitions. If it feels slow, it's often the debugger. Try running without the debugger or in Release mode for best performance.

---

## 📂 Project Structure

- `screens/`: UI screens (Dashboard, Analytics, History, Profile).
- `navigation/`: Navigation stacks and tab definitions.
- `services/`: API communication and transaction business logic.
- `db/`: Backend server and SQLite database logic.
- `components/`: Custom UI elements like the `FinanceTabBar`.

---

## 📜 License
This project is for educational purposes.
