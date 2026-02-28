# Personal Finance Tracker (UECS3253 Assignment)

This is a mobile application developed for the **UECS3253 Wireless Application Development** course at Universiti Tunku Abdul Rahman (UTAR). The app is built using **React Native** and focuses on providing users with a seamless way to track their daily expenses and income.

---

## Team Members (Group P4)

| Student Name | Student ID | Programme | Role |
| :--- | :--- | :--- | :--- |
| **Chin Lok Bin** | 2400968 | Software Engineering | Team Leader / Developer |
| **Kiu Chun Woon** | 2401624 | Software Engineering | Developer |
| **Tan Yi Wen** | 2400800 | Software Engineering | Developer |
| **Wong Xiang Rou** | 2401634 | Software Engineering | Developer |

---

## Project Overview

The **Personal Finance Tracker** aims to help users manage their personal finances through local data persistence and cloud synchronization. This project fulfills the requirements for CO2, CO3, and CO4 of the course.

### Key Features
* [cite_start]**User Interface (CO2):** Built with custom React Native components and high-quality UI modules[cite: 10, 30, 32].
* [cite_start]**Navigation:** Implementation of Stack, Tab, and Drawer navigators for a smooth user experience[cite: 33].
* [cite_start]**Data Persistence (CO3):** Local storage using **SQLite** for secure and persistent financial records (CRUD operations)[cite: 11, 38, 61].
* [cite_start]**Cloud Connectivity (CO4):** Integration with a Web-based API for real-time currency exchange rates and cloud backup[cite: 12, 41].

---

## Tech Stack
* [cite_start]**Framework:** React Native [cite: 21]
* [cite_start]**Navigation:** React Navigation (Stack, Drawer, Tab) [cite: 33]
* [cite_start]**Database:** SQLite / AsyncStorage [cite: 37, 38]
* [cite_start]**API Connectivity:** Fetch API / Axios [cite: 41]
* **Version Control:** Git & GitHub

---

## Project Structure (Deliverables)
In accordance with the assignment specifications, the final submission will include:
1.  [cite_start]**Technical Report:** Detailed documentation of features, navigation, and CRUD operations[cite: 56, 67].
2.  [cite_start]**Source Code:** The complete React Native project folder (excluding `node_modules`)[cite: 63].

---

## Important Dates
* **Deadline:** 3rd May 2026, 11:59 P.M. (Week 13 Sunday) [cite_start][cite: 16]

---

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone [https://github.com/iamLebin1/Personal-Finance-Tracker.git](https://github.com/iamLebin1/Personal-Finance-Tracker.git)
   ```

2. Install dependencies:
    ```bash
    npm install
    ```
3. Run the application:
    ```bash
    npx react-native run-android
    bash
    ```

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
