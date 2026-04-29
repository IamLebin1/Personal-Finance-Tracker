import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const tabMeta: Record<string, { label: string }> = {
  Dashboard: { label: 'Home' },
  History: { label: 'History' },
  Analytics: { label: 'Stats' },
  Profile: { label: 'Profile' },
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  const iconSize = 22;
  if (routeName === 'Dashboard') {
    return (
      <View style={styles.iconSlot}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      </View>
    );
  }

  if (routeName === 'History') {
    return (
      <View style={styles.iconSlot}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
      </View>
    );
  }

  if (routeName === 'Analytics') {
    return (
      <View style={styles.iconSlot}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 20V10" />
          <Path d="M12 20V4" />
          <Path d="M6 20V14" />
        </Svg>
      </View>
    );
  }

  return (
    <View style={styles.iconSlot}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
      </Svg>
    </View>
  );
}

function AnimatedTabButton({
  isFocused,
  label,
  onPress,
  routeName,
  onLayout,
  activeColor,
  inactiveColor,
  indicatorBg,
}: {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  routeName: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  activeColor: string;
  inactiveColor: string;
  indicatorBg: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isFocused ? -4 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      style={styles.tabButtonShell}
    >
      <Animated.View style={[styles.tabButton, { transform: [{ scale }, { translateY }] }]}>
        <View style={[styles.activeIndicatorBg, isFocused && styles.activeIndicatorBgVisible, { backgroundColor: indicatorBg }]} />
        <TabIcon routeName={routeName} color={isFocused ? activeColor : inactiveColor} />
        <Text numberOfLines={1} style={[styles.label, { color: isFocused ? activeColor : inactiveColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function FinanceTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;

  const handleLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => ({ ...prev, [index]: { x, width } }));
  };

  useEffect(() => {
    const layout = tabLayouts[state.index];
    if (layout) {
      Animated.spring(indicatorX, {
        toValue: layout.x + layout.width / 2 - 20,
        useNativeDriver: true,
        damping: 18,
        stiffness: 150,
      }).start();
    }
  }, [state.index, tabLayouts]);

  return (
    <View style={styles.outerWrap}>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <Animated.View 
          style={[
            styles.slidingLine, 
            { 
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              transform: [{ translateX: indicatorX }] 
            }
          ]} 
        />
        
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const meta = tabMeta[route.name] ?? { label: route.name };

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
              {index === 2 ? <View style={styles.fabGap} /> : null}
              <AnimatedTabButton
                isFocused={isFocused}
                label={meta.label}
                onPress={onPress}
                routeName={route.name}
                onLayout={(e) => handleLayout(index, e)}
                activeColor={colors.accent}
                inactiveColor={colors.textMuted}
                indicatorBg={colors.primaryBg}
              />
            </React.Fragment>
          );
        })}
      </View>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.card }]}
        onPress={() => {
          const parentNav = navigation.getParent();
          if (parentNav) {
            const { width, height } = Dimensions.get('window');
            const fabCenterY = height - (Platform.OS === 'ios' ? 76 : 72);
            (parentNav as any).navigate('AddTransaction', {
              fromFab: true,
              originX: width / 2,
              originY: fabCenterY,
              fast: true, // Hint for snappier animation
            });
          }
        }}
      >
        <View style={[styles.fabInner, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <Text style={styles.fabIcon}>+</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tabBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  tabButtonShell: {
    flex: 1,
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    width: '100%',
  },
  activeIndicatorBg: {
    position: 'absolute',
    top: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0,
  },
  activeIndicatorBgVisible: {
    opacity: 1,
  },
  fabGap: {
    width: 70,
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  slidingLine: {
    position: 'absolute',
    top: 0,
    height: 3,
    width: 40,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  fab: {
    position: 'absolute',
    top: -28,
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
});
