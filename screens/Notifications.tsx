import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications, type Notification } from '../services/useNotifications';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Notifications() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { notifications, markAllAsRead, clearAllNotifications, dismissNotification } = useNotifications();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    // Automatically mark all notifications as read when viewing this screen
    const hasUnread = notifications.some(n => !n.isRead);
    if (hasUnread) {
      markAllAsRead();
    }
  }, [notifications, markAllAsRead]);

  const getRealIcon = (type: Notification['type']) => {
    switch (type) {
      case 'budget_alert': return '⚠️';
      case 'recurring_synced': return '🔄';
      default: return '🔔';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={[
      styles.notificationItem,
      { backgroundColor: colors.card, borderColor: colors.cardBorder }
    ]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
        <Text style={styles.icon}>{getRealIcon(item.type)}</Text>
      </View>
      <View style={styles.contentBox}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemTime, { color: colors.textMuted }]}>{formatRelativeTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.itemMessage, { color: colors.textMuted }]}>{item.message}</Text>
      </View>
      <Pressable
        onPress={() => dismissNotification(item.id)}
        style={({ pressed }) => [
          styles.deleteBtn,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          pressed && { opacity: 0.6 }
        ]}
      >
        <Text style={[styles.deleteIcon, { color: colors.textMuted }]}>✕</Text>
      </Pressable>
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
        <Pressable
          style={styles.clearBtn}
          onPress={() => {
            if (notifications.length === 0) {
              Alert.alert('Notifications', 'There are no notifications to clear.');
              return;
            }
            Alert.alert(
              'Clear Notifications',
              'Are you sure you want to delete all notifications?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: clearAllNotifications }
              ]
            );
          }}
        >
          <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
        </Pressable>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>🔔</Text>
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>All Caught Up!</Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>You have no new notifications.</Text>
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
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  clearText: { fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  notificationItem: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2
  },
  icon: { fontSize: 20 },
  contentBox: { flex: 1, marginRight: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11, fontWeight: '600' },
  itemMessage: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  deleteIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: { alignItems: 'center', marginTop: 120 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIcon: { fontSize: 44, opacity: 0.8 },
  emptyText: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptySubText: { fontSize: 15, fontWeight: '500' },
});
