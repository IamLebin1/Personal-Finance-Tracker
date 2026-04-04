import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { TransactionsStackParamList } from '../navigation/types';
import { removeTransaction, subscribeToTransactions } from '../services/transactions';
import type { TransactionRecord } from '../types/transactions';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'Transactions'>;

const TransactionsScreen = ({ navigation }: Props) => {
  const { currentUserId, isLoggedIn, signOut, userName } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTransactions(currentUserId, (nextTransactions: TransactionRecord[]) => {
      setTransactions(nextTransactions);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUserId, isLoggedIn]);

  const incomeTotal = useMemo(
    () => transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  const expenseTotal = useMemo(
    () => transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  const totalBalance = incomeTotal - expenseTotal;

  const performancePct = useMemo(() => {
    if (expenseTotal <= 0) {
      return incomeTotal > 0 ? 100 : 0;
    }

    return ((incomeTotal - expenseTotal) / expenseTotal) * 100;
  }, [incomeTotal, expenseTotal]);

  const openEditor = (transactionId?: string) => {
    navigation.navigate('TransactionForm', { transactionId });
  };

  const confirmDelete = (transactionId: string) => {
    Alert.alert('Delete transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeTransaction(transactionId).catch(() => {
            Alert.alert('Delete failed', 'Unable to delete the transaction.');
          });
        },
      },
    ]);
  };

  const dayGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good Morning';
    }

    if (hour < 18) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  };

  const transactionIcon = (category: string) => {
    const c = category.toLowerCase();

    if (c.includes('food') || c.includes('restaurant')) {
      return 'silverware-fork-knife';
    }

    if (c.includes('shop')) {
      return 'shopping-outline';
    }

    if (c.includes('transport')) {
      return 'car-outline';
    }

    if (c.includes('bill')) {
      return 'file-document-outline';
    }

    if (c.includes('health')) {
      return 'heart-pulse';
    }

    if (c.includes('saving')) {
      return 'piggy-bank-outline';
    }

    return 'cash-multiple';
  };

  const renderTransaction = ({ item }: { item: TransactionRecord }) => {
    const isIncome = item.type === 'income';

    return (
      <Pressable
        onPress={() => openEditor(item.id)}
        onLongPress={() => confirmDelete(item.id)}
        style={({ pressed }) => [styles.transactionCard, pressed && styles.transactionCardPressed]}>
        <View style={styles.transactionLeft}>
          <View style={styles.transactionIconWrap}>
            <MaterialCommunityIcons
              name={transactionIcon(item.category)}
              size={22}
              color="#F8FAFC"
            />
          </View>

          <View style={styles.transactionTextWrap}>
            <Text style={styles.transactionTitle}>{item.category}</Text>
            <Text style={styles.transactionMeta} numberOfLines={1}>
              {item.occurredOn} • {item.note || 'No description'}
            </Text>
          </View>
        </View>

        <Text style={[styles.transactionAmount, isIncome && styles.incomeAmount]}>
          {isIncome ? '+' : '-'}RM {Math.abs(item.amount).toFixed(2)}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.ambientHalo} />
      <View style={styles.ambientFade} />

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.welcomeLabel}>Welcome back,</Text>
                <Text style={styles.welcomeTitle}>{dayGreeting()}, {userName || 'User'}</Text>
              </View>

              <Pressable style={styles.notifyButton} onPress={() => signOut()}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#E2E8F0" />
                <View style={styles.notifyDot} />
              </Pressable>
            </View>

            <View style={styles.balanceCard}>
              <View style={styles.balanceGlowOne} />
              <View style={styles.balanceGlowTwo} />

              <View style={styles.balanceTop}>
                <View>
                  <Text style={styles.balanceLabel}>Total Balance</Text>
                  <Text style={styles.balanceValue}>RM {totalBalance.toFixed(2)}</Text>
                </View>

                <View style={styles.balanceIconWrap}>
                  <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.balanceBottom}>
                <View style={styles.trendPill}>
                  <MaterialCommunityIcons
                    name={performancePct >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={performancePct >= 0 ? '#4ADE80' : '#F87171'}
                  />
                  <Text style={[styles.trendText, performancePct < 0 && styles.negativeTrendText]}>
                    {performancePct >= 0 ? '+' : ''}
                    {performancePct.toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.vsText}>vs current cycle</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHead}>
                  <View style={[styles.statIconWrap, styles.incomeIconWrap]}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color="#4ADE80" />
                  </View>
                  <Text style={styles.statLabel}>Income</Text>
                </View>
                <Text style={styles.statValue}>RM {incomeTotal.toFixed(2)}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHead}>
                  <View style={[styles.statIconWrap, styles.expenseIconWrap]}>
                    <MaterialCommunityIcons name="arrow-up" size={16} color="#F87171" />
                  </View>
                  <Text style={styles.statLabel}>Expenses</Text>
                </View>
                <Text style={styles.statValue}>RM {expenseTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Pressable style={styles.sectionActionRow} onPress={() => openEditor()}>
                <MaterialCommunityIcons name="plus-circle" size={18} color="#A78BFA" />
                <Text style={styles.sectionAction}>Add New</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{loading ? 'Loading...' : 'No transactions yet'}</Text>
            <Text style={styles.emptyText}>Tap the add button to create your first record.</Text>
          </View>
        }
      />

      <View
        style={styles.bottomNavWrap}
        pointerEvents="box-none">
        <View style={styles.bottomNav}>
          {[
            {
              label: 'Home',
              icon: 'home',
              activeIcon: 'home',
              action: () => navigation.navigate('TransactionsStack' as never),
              active: true,
            },
            {
              label: 'History',
              icon: 'time-outline',
              activeIcon: 'time',
              action: () => navigation.navigate('TransactionsStack' as never),
            },
            {
              label: '',
              icon: 'add',
              activeIcon: 'add',
              action: () => openEditor(),
              fab: true,
            },
            {
              label: 'Analytics',
              icon: 'analytics-outline',
              activeIcon: 'analytics',
              action: () => navigation.navigate('Analytics' as never),
            },
            {
              label: 'Profile',
              icon: 'person-outline',
              activeIcon: 'person',
              action: () => navigation.navigate('Accounts' as never),
            },
          ].map(item => {
            if (item.fab) {
              return (
                <View key="fab" style={styles.fabSlot}>
                  <Pressable style={styles.fabButton} onPress={item.action}>
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            }

            const active = item.active;

            return (
              <Pressable key={item.label} style={styles.tabItem} onPress={item.action}>
                <Ionicons
                  name={(active ? item.activeIcon : item.icon) as any}
                  size={24}
                  color={active ? '#A78BFA' : '#64748B'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                {active ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  ambientHalo: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    top: -190,
    right: -140,
    backgroundColor: 'rgba(107, 70, 193, 0.22)',
  },
  ambientFade: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -140,
    left: -90,
    backgroundColor: 'rgba(67, 56, 202, 0.16)',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  welcomeLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  notifyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  balanceCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107,70,193,0.30)',
    backgroundColor: 'rgba(38, 21, 66, 0.60)',
    marginBottom: 14,
  },
  balanceGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    top: -70,
    right: -60,
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
  },
  balanceGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -52,
    left: -36,
    backgroundColor: 'rgba(107, 70, 193, 0.24)',
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    marginTop: 6,
  },
  balanceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
  },
  trendText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '800',
  },
  negativeTrendText: {
    color: '#F87171',
  },
  vsText: {
    color: '#A1A1AA',
    fontSize: 11,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  incomeIconWrap: {
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
  },
  expenseIconWrap: {
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionAction: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  transactionMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  transactionAmount: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  incomeAmount: {
    color: '#4ADE80',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(19,18,33,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#A78BFA',
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
    marginTop: 2,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#251dc9',
    borderWidth: 4,
    borderColor: '#131221',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
});

export default TransactionsScreen;
