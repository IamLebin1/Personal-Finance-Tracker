import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  ActivityIndicator, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  Animated, 
  StatusBar,
  InteractionManager
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import { formatCurrency, getSpendingByCategory } from '../services/transactionService';
import type { Transaction } from '../types/transaction';
import type { CategorySpending } from '../services/transactionService';

const { width } = Dimensions.get('window');

function getMonthKey(dateValue: Date): string {
  return `${dateValue.getFullYear()}-${dateValue.getMonth()}`;
}

function toSignedAmount(transaction: Transaction): number {
  return transaction.type === 'income' ? transaction.amount : -transaction.amount;
}

function calculateMonthOverMonthTrend(transactions: Transaction[]): number {
  const now = new Date();
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentKey = getMonthKey(currentMonthDate);
  const previousKey = getMonthKey(previousMonthDate);

  let currentMonthNet = 0;
  let previousMonthNet = 0;

  transactions.forEach(item => {
    const itemDate = new Date(item.date);
    if (Number.isNaN(itemDate.getTime())) {
      return;
    }

    const itemMonthKey = getMonthKey(itemDate);
    const signedAmount = toSignedAmount(item);

    if (itemMonthKey === currentKey) {
      currentMonthNet += signedAmount;
    } else if (itemMonthKey === previousKey) {
      previousMonthNet += signedAmount;
    }
  });

  if (previousMonthNet === 0) {
    return currentMonthNet === 0 ? 0 : (currentMonthNet > 0 ? 100 : -100);
  }

  return ((currentMonthNet - previousMonthNet) / Math.abs(previousMonthNet)) * 100;
}

function formatTrendPercent(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getDaytimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTransactionDate(dateValue: string): string {
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return dateValue;
  
  return parsedDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function Dashboard({ navigation }: { navigation: any }) {
  // 1. All Hooks at the top
  const [totalBalance, setTotalBalance] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [monthTrend, setMonthTrend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const refreshCallback = useCallback(() => {
    let isMounted = true;
    
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const [allTransactions, categoryData] = await Promise.all([
          getTransactionsByUser(),
          getSpendingByCategory()
        ]);

        // Sort transactions by date descending (newest first)
        const sortedTransactions = [...allTransactions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const income = allTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const expenses = allTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

        if (!isMounted) return;

        setIncomeTotal(income);
        setExpenseTotal(expenses);
        setTotalBalance(income - expenses);
        setRecentTransactions(sortedTransactions.slice(0, 5));
        setCategories(categoryData.slice(0, 4));
        setMonthTrend(calculateMonthOverMonthTrend(allTransactions));
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    setIsLoading(true);
    return () => {
      isMounted = false;
      task.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, slideAnim]);

  useFocusEffect(refreshCallback);

  // 2. Non-hook logic
  const session = getAuthSession();
  const displayName = session?.username?.trim() || 'User';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Premium Header */}
        <Animated.View style={[styles.headerRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greetingText}>{getDaytimeGreeting()}</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#8a90c6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Svg>
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable style={styles.profileButton}>
              <View style={styles.avatarGradient}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Unified Wealth Section */}
        <View style={styles.wealthSection}>
          {/* Main Balance Card */}
          <Animated.View style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={StyleSheet.absoluteFill}>
              <Svg height="100%" width="100%" viewBox="0 0 350 170" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#8a6eff" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#5d3fd3" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#grad)" />
                <Circle cx="320" cy="30" r="60" fill="rgba(255,255,255,0.1)" />
              </Svg>
            </View>
            
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeaderLine}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <View style={[styles.trendBadge, monthTrend < 0 && styles.trendBadgeNeg]}>
                  <Text style={[styles.trendText, monthTrend < 0 && styles.trendTextNeg]}>
                    {monthTrend >= 0 ? '↗' : '↘'} {formatTrendPercent(monthTrend)}
                  </Text>
                </View>
              </View>
              <Text style={styles.balanceValue}>
                {isLoading ? '...' : formatCurrency(totalBalance)}
              </Text>
            </View>
          </Animated.View>

          {/* Income & Expense Stats Row */}
          <View style={styles.statsContainer}>
            <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={[styles.statIconBox, { backgroundColor: 'rgba(32, 206, 143, 0.12)' }]}>
                <Text style={[styles.statArrow, { color: '#20ce8f' }]}>↓</Text>
              </View>
              <View style={styles.statInfoWrap}>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statValue, { color: '#20ce8f' }]}>{formatCurrency(incomeTotal)}</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={[styles.statIconBox, { backgroundColor: 'rgba(255, 77, 109, 0.12)' }]}>
                <Text style={[styles.statArrow, { color: '#ff4d6d' }]}>↑</Text>
              </View>
              <View style={styles.statInfoWrap}>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statValue, { color: '#ff4d6d' }]}>{formatCurrency(expenseTotal)}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Quick Category Overview */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
            <Pressable onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.seeAll}>See Trends</Text>
            </Pressable>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat, idx) => (
              <View key={cat.category} style={[styles.categoryCard, { marginLeft: idx === 0 ? 0 : 12 }]}>
                <View style={styles.categoryCardHeader}>
                  <View style={styles.catIconBox}>
                    <Text style={styles.catEmoji}>{cat.category.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.catPercent}>{Math.round((cat.amount / (expenseTotal || 1)) * 100)}%</Text>
                </View>
                <Text style={styles.catName}>{formatCategoryLabel(cat.category)}</Text>
                <Text style={styles.catAmount}>{formatCurrency(cat.amount)}</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (cat.amount / (expenseTotal || 1)) * 100)}%` }]} />
                </View>
              </View>
            ))}
            {categories.length === 0 && !isLoading && (
              <View style={styles.emptyCategories}>
                <Text style={styles.mutedText}>No data available</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Transactions Section */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>History</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#8a6eff" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.txList}>
              {recentTransactions.map((tx, idx) => (
                <Pressable 
                  key={tx.id} 
                  style={[styles.txItem, idx === recentTransactions.length - 1 && styles.txItemLast]}
                  onPress={() => navigation.navigate('TransactionDetail', { transaction: tx })}
                >
                  <View style={[styles.txIconWrap, { backgroundColor: tx.type === 'income' ? '#20ce8f15' : '#ff4d6d15' }]}>
                    <Text style={[styles.txIcon, { color: tx.type === 'income' ? '#20ce8f' : '#ff4d6d' }]}>
                      {tx.type === 'income' ? '↓' : '↑'}
                    </Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txCategory}>{formatCategoryLabel(tx.category)}</Text>
                    <Text style={styles.txDate} numberOfLines={1}>
                      {formatTransactionDate(tx.date)} {tx.note ? `• ${tx.note}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#20ce8f' : '#f8f9ff' }]}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </Pressable>
              ))}
              {recentTransactions.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Text style={styles.emptyIcon}>💰</Text>
                  </View>
                  <Text style={styles.emptyText}>No recent activity found.{"\n"}Time to track your first expense!</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
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
    paddingTop: 50,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greetingText: {
    color: '#8a90c6',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  userName: {
    color: '#f7f8ff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16193b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4d6d',
    borderWidth: 1.5,
    borderColor: '#16193b',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    backgroundColor: '#232859',
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#8a6eff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  wealthSection: {
    marginBottom: 32,
  },
  balanceCard: {
    height: 170,
    borderRadius: 28,
    padding: 24,
    justifyContent: 'center',
    shadowColor: '#8a6eff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  balanceContent: {
    alignItems: 'flex-start',
  },
  balanceHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  trendBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  trendBadgeNeg: {
    backgroundColor: 'rgba(255,77,109,0.2)',
  },
  trendText: {
    color: '#3dffb1',
    fontSize: 12,
    fontWeight: '700',
  },
  trendTextNeg: {
    color: '#ff7d9a',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232859',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statInfoWrap: {
    flex: 1,
  },
  statArrow: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#8a90c6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#f4f5ff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  seeAll: {
    color: '#8a6eff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryScroll: {
    marginBottom: 32,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: 150,
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232859',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(138, 110, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8a6eff',
  },
  catPercent: {
    color: '#8a90c6',
    fontSize: 12,
    fontWeight: '700',
  },
  catName: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '600',
  },
  catAmount: {
    color: '#f4f5ff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 12,
  },
  progressBg: {
    height: 6,
    backgroundColor: '#0a0c1f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8a6eff',
    borderRadius: 3,
  },
  txList: {
    backgroundColor: '#16193b',
    borderRadius: 28,
    padding: 8,
    borderWidth: 1,
    borderColor: '#232859',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#232859',
  },
  txItemLast: {
    borderBottomWidth: 0,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  txInfo: {
    flex: 1,
  },
  txCategory: {
    color: '#f4f6ff',
    fontSize: 16,
    fontWeight: '700',
  },
  txDate: {
    color: '#636781',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emptyCategories: {
    padding: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a0c1f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyText: {
    color: '#636781',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  mutedText: {
    color: '#636781',
    fontSize: 14,
    fontWeight: '500',
  },
});
