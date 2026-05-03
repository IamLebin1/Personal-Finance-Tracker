# 💸 Personal Finance Tracker

A premium, dark-themed React Native application for tracking wealth, expenses, and financial insights. This application features a robust **Local-First architecture** with SQLite persistence, real-time **WebSocket** notifications, and a dedicated Node.js backend.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js**: v22.11.0 or higher
- **Java JDK**: 17 (Required for Android builds)
- **Android Studio**: Configured with SDK, Platform Tools, and an active Emulator.
- **Git**: To clone the repository.

---

## 📦 Step-by-Step Setup

Follow these steps in order to get the application running.

### 1. Clone the Repository
```bash
git clone https://github.com/iamLebin1/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker
```

### 2. Install Dependencies
This project uses modern React Native versions. Use the `--legacy-peer-deps` flag to ensure compatibility:
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy the sample environment file to create your local `.env`:
```bash
# Windows
copy .env.sample .env

# Mac / Linux
cp .env.sample .env
```

### 4. Application Configuration
Ensure your frontend can communicate with the backend. Check the file `E:\Github\Personal-Finance-Tracker\config\appConfig.ts`:
- **Android Emulator**: Uses `http://10.0.2.2:5001` (Default)
- **iOS Simulator / Real Device**: Uses `http://localhost:5001`

---

## 🖥️ Phase 1: Running the Backend

The backend server manages user authentication, data synchronization, and real-time alerts.

1. **Open a new terminal** in the project root.
2. **Start the service**:
   ```bash
   node db/service.js
   ```
3. **Confirmation**: You should see:
   - `✓ Database tables created`
   - `✓ WebSocket listening on /finance namespace`
   - `✓ Backend ready for connections on port 5001`

---

## 📱 Phase 2: Running the Mobile App

### 1. Start the Metro Bundler
Metro is the JavaScript bundler for React Native. Keep this running in its own window.
```bash
npm start
```
*Note: This project is configured to run on port **8107**.*

### 2. Launch on Android
Ensure your Android Emulator is open and running.
```bash
# In another terminal window
npm run android
```

### 3. Launch on iOS (Mac Only)
```bash
# Install native pods first
cd ios && pod install && cd ..

# Run the app
npm run ios
```

---

## 🔗 Connecting a Physical Device

If you are running the app on a **real Android device** connected via USB:

1. Enable USB Debugging in Developer Options.
2. Run the ADB reverse command to bridge the backend port:
   ```bash
   adb reverse tcp:5001 tcp:5001
   ```
3. Start the app using `npm run android`.

---

## 🔧 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Network Request Failed"** | Ensure the backend is running (`node db/service.js`) and that your `appConfig.ts` uses `10.0.2.2` for emulators. |
| **"Port 8107 already in use"** | Kill the existing process or restart your machine. |
| **Build Failures** | Run `cd android && ./gradlew clean` then try again. |
| **Intl Errors** | The app is patched for older Hermes engines. Ensure you are using the latest code from the repository. |

---

## 📂 Project Highlights

- **3-Tier Navigation**: Nested Stack, Drawer, and Tab navigation.
- **Offline-First**: Uses local SQLite with background synchronization.
- **Theming**: Fully integrated Dark/Light mode via `ThemeContext`.
- **Performance**: Optimized with `InteractionManager` and `FlatList` recycling.

---

## 📜 License
This project is for educational purposes.
