import React, { useState, useCallback } from 'react';
import { 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { config } from '../config/appConfig';
import { clearAuthSession, getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import { formatCurrency } from '../services/transactionService';

const settingsRows = [
  { id: 'details', icon: '👤', title: 'Personal Details', subtitle: 'Name, Email, Phone' },
  { id: 'security', icon: '🔒', title: 'Security & Credentials', subtitle: 'Password, 2FA, FaceID' },
  { id: 'notifications', icon: '🔔', title: 'Notification Preferences', subtitle: 'Alerts, Reminders' },
  { id: 'subscription', icon: '💳', title: 'Subscription', subtitle: 'Manage plan & billing' },
];

export default function Profile() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ count: 0, totalIncome: 0, totalExpense: 0 });
  const session = getAuthSession();

  const loadProfileStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const txs = await getTransactionsByUser();
      const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setStats({
        count: txs.length,
        totalIncome: income,
        totalExpense: expense
      });
    } catch (error) {
      console.error('Failed to load profile stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileStats();
    }, [loadProfileStats])
  );

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            const currentSession = getAuthSession();
            if (currentSession?.token) {
              try {
                await fetch(`${config.apiBaseUrl}/api/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentSession.token}`,
                  },
                });
              } catch (e) {
                // Fail silently
              }
            }
            await clearAuthSession();
            navigation.navigate('Login' as never);
          }
        }
      ]
    );
  };

  const handleRowPress = (item: typeof settingsRows[0]) => {
    if (item.id === 'details') {
      navigation.navigate('ProfileDetails' as never);
    } else {
      Alert.alert(item.title, `The ${item.title.toLowerCase()} feature will be available in the next update.`);
    }
  };

  const displayName = session?.username || 'User';
  const profileInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>My Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatar}>{profileInitial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{session?.userId ? `User ID: ${session.userId}` : 'Not logged in'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium Member</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Txns</Text>
            <Text style={styles.statValue}>{isLoading ? '...' : stats.count}</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: '#20ce8f' }]}>{isLoading ? '...' : formatCurrency(stats.totalIncome)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: '#ff4d6d' }]}>{isLoading ? '...' : formatCurrency(stats.totalExpense)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        {settingsRows.map(row => (
          <Pressable key={row.id} style={styles.rowCard} onPress={() => handleRowPress(row)}>
            <View style={styles.rowIconBg}>
              <Text style={styles.rowIcon}>{row.icon}</Text>
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}

        <Pressable style={styles.signOutWrap} onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070817',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    color: '#f4f6ff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#16193b',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#232859',
    paddingVertical: 24,
    marginBottom: 20,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#232859',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8a6eff',
    marginBottom: 14,
    shadowColor: '#8a6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatar: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  email: {
    color: '#8a90c6',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(138, 110, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(138, 110, 255, 0.3)',
  },
  badgeText: {
    color: '#8a6eff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232859',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#232859',
  },
  statLabel: {
    color: '#8a90c6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16193b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#232859',
    padding: 14,
    marginBottom: 12,
  },
  rowIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#232859',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowIcon: {
    fontSize: 18,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#f4f6ff',
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#636781',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  chevron: {
    color: '#232859',
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 8,
  },
  signOutWrap: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.3)',
    backgroundColor: 'rgba(255, 77, 109, 0.05)',
    paddingVertical: 16,
  },
  signOut: {
    color: '#ff4d6d',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
