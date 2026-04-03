import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('firebase/app', () => ({
  getApps: () => [],
  initializeApp: () => ({}),
}));

jest.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  initializeAuth: () => ({}),
  getReactNativePersistence: () => ({}),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
  signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
  signOut: () => Promise.resolve(),
  onAuthStateChanged: (_auth, callback) => {
    callback(null);
    return () => {};
  },
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: (_query, callback) => {
    callback({ docs: [] });
    return () => {};
  },
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false }),
  addDoc: async () => ({ id: 'test-id' }),
  updateDoc: async () => undefined,
  deleteDoc: async () => undefined,
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    NavigationContainer: ({ children }) => React.createElement(View, null, children),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) => React.createElement(View, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }) => React.createElement(View, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    PieChart: props => React.createElement(View, props, null),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: View,
    Pressable: View,
    RectButton: View,
    TouchableOpacity: View,
    TouchableHighlight: View,
    ScrollView: View,
    FlatList: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    DrawerLayout: View,
    LongPressGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    NativeViewGestureHandler: View,
    GestureHandler: View,
    Directions: {},
    gestureHandlerRootHOC: component => component,
    createNativeWrapper: component => component,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);