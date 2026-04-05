import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

const tabMeta: Record<string, { label: string }> = {
  Dashboard: { label: 'Home' },
  History: { label: 'History' },
  Analytics: { label: 'Analytics' },
  Profile: { label: 'Profile' },
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  if (routeName === 'Dashboard') {
    return (
      <View style={styles.iconSlot}>
        <View style={[styles.homeRoof, { borderBottomColor: color }]} />
        <View style={[styles.homeBody, { borderColor: color }]} />
      </View>
    );
  }

  if (routeName === 'History') {
    return (
      <View style={styles.iconSlot}>
        <View style={[styles.historyRing, { borderColor: color }]} />
        <View style={[styles.historyHead, { borderTopColor: color, borderRightColor: color }]} />
      </View>
    );
  }

  if (routeName === 'Analytics') {
    return (
      <View style={[styles.iconSlot, styles.analyticsRow]}>
        <View style={[styles.bar, styles.barShort, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.barTall, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.barMid, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={styles.iconSlot}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

function AnimatedTabButton({
  isFocused,
  label,
  onPress,
  accessibilityLabel,
  routeName,
}: {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  routeName: string;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const animateTo = (nextScale: number, nextOpacity: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        mass: 0.9,
      }),
      Animated.timing(opacity, {
        toValue: nextOpacity,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => animateTo(0.93, 0.88)}
      onPressOut={() => animateTo(1, 1)}
      style={styles.tabButtonShell}
    >
      <Animated.View style={[styles.tabButton, { transform: [{ scale }], opacity }]}>
        <TabIcon routeName={routeName} color={isFocused ? '#8f7bff' : '#8c94ab'} />
        <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.label, isFocused && styles.focusedText]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function FinanceTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const currentRoute = state.routes[state.index]?.name;

  return (
    <View style={styles.outerWrap}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const insertFabGap = index === 2;
          const isFocused = state.index === index;
          const meta = tabMeta[route.name] ?? { label: route.name };
          const iconColor = isFocused ? '#8f7bff' : '#8c94ab';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <React.Fragment key={route.key}>
              {insertFabGap ? <View style={styles.fabGap} /> : null}
              <AnimatedTabButton
                isFocused={isFocused}
                label={meta.label}
                onPress={onPress}
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                routeName={route.name}
              />
            </React.Fragment>
          );
        })}
      </View>

      <Pressable
        style={styles.fab}
        onPress={() => {
          const parentNav = navigation.getParent();
          if (parentNav) {
            const { width, height } = Dimensions.get('window');
            (parentNav as never as {
              navigate: (routeName: string, params?: { fromFab?: boolean; originX?: number; originY?: number }) => void;
            }).navigate(
              'AddTransaction',
              {
                fromFab: true,
                originX: width / 2,
                originY: height - 36,
              },
            );
          }
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {currentRoute === 'Dashboard' ? <View style={styles.glowLine} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBar: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#232633',
    backgroundColor: '#101218',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabButtonShell: {
    flex: 1,
    minWidth: 60,
    maxWidth: 84,
    marginHorizontal: 2,
  },
  tabButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGap: {
    width: 78,
    flexShrink: 0,
  },
  iconSlot: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#8c94ab',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  focusedText: {
    color: '#8f7bff',
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  homeBody: {
    width: 12,
    height: 8,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  historyRing: {
    width: 14,
    height: 14,
    borderWidth: 1.8,
    borderRadius: 7,
  },
  historyHead: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    transform: [{ rotate: '42deg' }],
    right: 1,
    top: 3,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  bar: {
    width: 4,
    borderRadius: 1,
  },
  barShort: {
    height: 9,
  },
  barTall: {
    height: 14,
  },
  barMid: {
    height: 11,
  },
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.8,
    marginBottom: 2,
  },
  profileBody: {
    width: 13,
    height: 7,
    borderWidth: 1.8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 0,
  },
  fab: {
    position: 'absolute',
    top: -20,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6f51ff',
    borderWidth: 4,
    borderColor: '#0d0f16',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6f51ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 12,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 36,
    marginTop: -1,
    fontWeight: '400',
  },
  glowLine: {
    position: 'absolute',
    bottom: 0,
    left: '7%',
    width: 58,
    height: 2,
    borderRadius: 3,
    backgroundColor: '#725dff',
  },
});
