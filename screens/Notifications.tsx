import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Animated, 
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'alert';
  isRead: boolean;
}

const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Budget Alert',
    message: 'You have reached 80% of your Monthly Food budget.',
    time: '2h ago',
    type: 'alert',
    isRead: false,
  },
  {
    id: '2',
    title: 'New Feature',
    message: 'You can now switch between multiple wallets in History and Stats!',
    time: '5h ago',
    type: 'info',
    isRead: false,
  },
  {
    id: '3',
    title: 'Income Received',
    message: 'Your Salary for April has been credited to your Main Wallet.',
    time: '1d ago',
    type: 'success',
    isRead: true,
  },
  {
    id: '4',
    title: 'Security Update',
    message: 'Your password was successfully changed yesterday.',
    time: '2d ago',
    type: 'info',
    isRead: true,
  },
];

export default function Notifications() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'success': return '💰';
      default: return '📢';
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={[
      styles.notificationItem, 
      { backgroundColor: colors.card, borderColor: colors.cardBorder },
      !item.isRead && { borderLeftWidth: 4, borderLeftColor: colors.primary }
    ]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
        <Text style={styles.icon}>{getIcon(item.type)}</Text>
      </View>
      <View style={styles.contentBox}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.itemTime, { color: colors.textMuted }]}>{item.time}</Text>
        </View>
        <Text style={[styles.itemMessage, { color: colors.textMuted }]}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <Pressable onPress={markAllAsRead}>
          <Text style={[styles.markRead, { color: colors.primary }]}>Read All</Text>
        </Pressable>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No new notifications</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 24, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: '800' },
  markRead: { fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  notificationItem: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1,
    alignItems: 'center'
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16
  },
  icon: { fontSize: 22 },
  contentBox: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemTime: { fontSize: 12, fontWeight: '500' },
  itemMessage: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 60, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});
