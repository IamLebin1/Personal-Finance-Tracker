import React, { useRef, useState, useMemo, useEffect, createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import Dashboard from '../screens/Dashboard';
import History from '../screens/History';
import Analytics from '../screens/Analytics';
import Profile from '../screens/Profile';
import FinanceTabBar from '../components/FinanceTabBar';

export type MainTabsParamList = {
  Dashboard: undefined;
  History: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const PagerContext = createContext<{ jumpTo: (name: string) => void } | null>(null);

// Helper to bridge focus events to screens in PagerView
function PageWrapper({ 
  component: Component, 
  isFocused, 
  navigation, 
  route 
}: { 
  component: any, 
  isFocused: boolean, 
  navigation: any, 
  route: any 
}) {
  const focusListeners = useRef<Array<() => void>>([]);
  const blurListeners = useRef<Array<() => void>>([]);
  const pager = useContext(PagerContext);
  
  // Use ref to keep track of current focus without triggering useMemo re-runs
  const isFocusedRef = useRef(isFocused);
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const mockedNavigation = useMemo(() => ({
    ...navigation,
    navigate: (name: string, params?: any) => {
      const tabNames = ['Dashboard', 'History', 'Analytics', 'Profile'];
      if (tabNames.includes(name)) {
        pager?.jumpTo(name);
      } else {
        navigation.navigate(name, params);
      }
    },
    addListener: (type: string, callback: () => void) => {
      if (type === 'focus') {
        focusListeners.current.push(callback);
      } else if (type === 'blur') {
        blurListeners.current.push(callback);
      }
      return navigation.addListener(type, callback);
    },
    removeListener: (type: string, callback: () => void) => {
      if (type === 'focus') {
        focusListeners.current = focusListeners.current.filter(l => l !== callback);
      } else if (type === 'blur') {
        blurListeners.current = blurListeners.current.filter(l => l !== callback);
      }
      return navigation.removeListener(type, callback);
    },
    isFocused: () => isFocusedRef.current,
  }), [navigation, pager]); // Removed isFocused from dependencies

  useEffect(() => {
    if (isFocused) {
      focusListeners.current.forEach(l => l());
    } else {
      blurListeners.current.forEach(l => l());
    }
  }, [isFocused]);

  return <Component navigation={mockedNavigation} route={route} />;
}

export default function MainTabsNavigator({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const routes = useMemo(() => [
    { name: 'Dashboard', key: 'Dashboard' },
    { name: 'History', key: 'History' },
    { name: 'Analytics', key: 'Analytics' },
    { name: 'Profile', key: 'Profile' },
  ], []);

  const state = {
    index,
    routes,
  };

  const jumpTo = (name: string) => {
    const idx = routes.findIndex(r => r.name === name);
    if (idx !== -1) {
      setIndex(idx);
      pagerRef.current?.setPage(idx);
    }
  };

  const onTabPress = (idx: number) => {
    setIndex(idx);
    pagerRef.current?.setPage(idx);
  };

  const mockTabBarNavigation = {
    navigate: (name: string, params?: any) => {
      const idx = routes.findIndex(r => r.name === name);
      if (idx !== -1) {
        onTabPress(idx);
      } else {
        navigation.navigate(name, params);
      }
    },
    emit: ({ type }: { type: string }) => {
      if (type === 'tabPress') {
        return { defaultPrevented: false };
      }
      return { defaultPrevented: false };
    },
    getParent: () => navigation,
  };

  return (
    <PagerContext.Provider value={{ jumpTo }}>
      <View style={styles.container}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e) => {
            const newIndex = e.nativeEvent.position;
            setIndex(newIndex);
          }}
        >
          <View key="Dashboard" style={styles.page}>
            <PageWrapper 
              component={Dashboard} 
              isFocused={index === 0} 
              navigation={navigation} 
              route={routes[0]} 
            />
          </View>
          <View key="History" style={styles.page}>
            <PageWrapper 
              component={History} 
              isFocused={index === 1} 
              navigation={navigation} 
              route={routes[1]} 
            />
          </View>
          <View key="Analytics" style={styles.page}>
            <PageWrapper 
              component={Analytics} 
              isFocused={index === 2} 
              navigation={navigation} 
              route={routes[2]} 
            />
          </View>
          <View key="Profile" style={styles.page}>
            <PageWrapper 
              component={Profile} 
              isFocused={index === 3} 
              navigation={navigation} 
              route={routes[3]} 
            />
          </View>
        </PagerView>
        
        <FinanceTabBar
          state={state as any}
          descriptors={{} as any}
          navigation={mockTabBarNavigation as any}
        />
      </View>
    </PagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a1f',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
