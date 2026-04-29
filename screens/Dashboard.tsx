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
  InteractionManager,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import { getWallets, createWallet } from '../services/walletApi';
import { getSelectedWalletId, setSelectedWalletId } from '../services/walletService';
import { formatCurrency } from '../services/transactionService';
import type { Transaction, Wallet } from '../types/transaction';
import type { CategorySpending } from '../services/transactionService';
import { getCategoryData } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';
import { getBudgets } from '../services/budgetApi';
import { config } from '../config/appConfig';

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
    if (Number.isNaN(itemDate.getTime())) return;
    const itemMonthKey = getMonthKey(itemDate);
    const signedAmount = toSignedAmount(item);
    if (itemMonthKey === currentKey) currentMonthNet += signedAmount;
    else if (itemMonthKey === previousKey) previousMonthNet += signedAmount;
  });

  if (previousMonthNet === 0) return currentMonthNet === 0 ? 0 : (currentMonthNet > 0 ? 100 : -100);
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
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCategoryLabel(category: string): string {
  return category.split(/[-_\s]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function isInPeriod(dateValue: Date, periodMode: 'month' | 'year' | 'all', selectedMonth: number, selectedYear: number): boolean {
  if (periodMode === 'all') return true;
  if (periodMode === 'year') return dateValue.getFullYear() === selectedYear;
  return dateValue.getFullYear() === selectedYear && dateValue.getMonth() === selectedMonth;
}

function getPeriodLabel(periodMode: 'month' | 'year' | 'all', selectedMonth: number, selectedYear: number): string {
  if (periodMode === 'all') return 'All Time';
  if (periodMode === 'year') return String(selectedYear);
  return new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function Dashboard({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  
  const [totalBalance, setTotalBalance] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [monthTrend, setMonthTrend] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const hasLoadedRef = useRef(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletAmount, setNewWalletAmount] = useState('');
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'all'>('month');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState(new Date().getMonth());
  const [selectedPeriodYear, setSelectedPeriodYear] = useState(new Date().getFullYear());
  const [isPeriodModalVisible, setIsPeriodModalVisible] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const refreshCallback = useCallback(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(null)));
        
        const fetchedWallets = await getWallets();
        const savedWalletId = await getSelectedWalletId();
        const isAllWallets = !savedWalletId || savedWalletId === 'all';
        const currentWallet = isAllWallets ? null : (fetchedWallets.find(w => String(w.id) === String(savedWalletId)) || null);
        
        const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        
        const [scopedTransactions, globalTransactions, budgetData, profData] = await Promise.all([
          getTransactionsByUser(undefined, currentWallet?.id),
          getTransactionsByUser(),
          getBudgets(currentMonthKey),
          fetch(`${config.apiBaseUrl}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${getAuthSession()?.token}` }
          }).then(res => res.ok ? res.json() : null).catch(() => null)
        ]);

        if (!isMounted) return;

        const periodTransactions = scopedTransactions.filter(item => {
          const date = new Date(item.date);
          return !Number.isNaN(date.getTime()) && isInPeriod(date, periodMode, selectedPeriodMonth, selectedPeriodYear);
        });
        const sortedTransactions = [...periodTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const income = periodTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const expenses = periodTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        const budgetVal = periodMode === 'month' ? (budgetData.find(b => b.category === 'Total')?.amount || 0) : 0;

        const nextWalletBalances: Record<string, number> = {};
        fetchedWallets.forEach(wallet => {
          nextWalletBalances[String(wallet.id)] = Number(wallet.initialBalance || 0);
        });
        globalTransactions.forEach(tx => {
          if (!tx.walletId) return;
          const key = String(tx.walletId);
          if (nextWalletBalances[key] === undefined) {
            nextWalletBalances[key] = 0;
          }
          nextWalletBalances[key] += tx.type === 'income' ? tx.amount : -tx.amount;
        });

        const categoryLookup = new Map<string, number>();
        periodTransactions
          .filter(item => item.type === 'expense')
          .forEach(item => {
            categoryLookup.set(item.category, (categoryLookup.get(item.category) || 0) + item.amount);
          });
        const categoryData = Array.from(categoryLookup.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount);
        const totalCategoryAmount = categoryData.reduce((s, c) => s + c.amount, 0);
        const categoryWithPercent = categoryData.map(c => ({ ...c, percentage: totalCategoryAmount > 0 ? (c.amount / totalCategoryAmount) * 100 : 0 }));
        
        // Calculate balance including initial wallet balance
        let totalWalletBalance = income - expenses;
        if (periodMode === 'all' && !isAllWallets && currentWallet?.initialBalance) {
          totalWalletBalance += currentWallet.initialBalance;
        } else if (periodMode === 'all' && isAllWallets) {
          // For all wallets view, sum initial balances from all wallets
          const allInitialBalance = fetchedWallets.reduce((sum, w) => sum + (w.initialBalance || 0), 0);
          totalWalletBalance += allInitialBalance;
        }

        setProfileData(profData);
        setWallets(fetchedWallets);
        setWalletBalances(nextWalletBalances);
        setSelectedWallet(currentWallet);
        setIncomeTotal(income);
        setExpenseTotal(expenses);
        setTotalBalance(totalWalletBalance);
        setTotalBudget(budgetVal);
        setRecentTransactions(sortedTransactions.slice(0, 5));
        setCategories(categoryWithPercent.slice(0, 4));
        setMonthTrend(periodMode === 'month' ? calculateMonthOverMonthTrend(scopedTransactions) : 0);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    fetchData();
    return () => { isMounted = false; };
  }, [periodMode, selectedPeriodMonth, selectedPeriodYear]);

  const handleSelectWallet = async (wallet: Wallet) => {
    await setSelectedWalletId(String(wallet.id));
    setSelectedWallet(wallet);
    setIsWalletModalVisible(false);
    refreshCallback();
  };

  const handleAddWallet = async () => {
    if (!newWalletName.trim()) return;
    try {
      const initialBalance = newWalletAmount.trim() ? Number(newWalletAmount.replace(/,/g, '')) : 0;
      if (Number.isNaN(initialBalance) || initialBalance < 0) {
        Alert.alert('Invalid amount', 'Please enter a valid amount.');
        return;
      }
      const wallet = await createWallet({ name: newWalletName.trim(), initialBalance });
      setWallets(prev => [...prev, wallet]);
      setNewWalletName('');
      setNewWalletAmount('');
      setIsAddingWallet(false);
      refreshCallback();
      handleSelectWallet(wallet);
    } catch (err) { 
      Alert.alert('Error', 'Could not create wallet. Try again.');
      console.error(err);
    }
  };

  const handleDeleteWallet = async (wallet: Wallet) => {
    Alert.alert('Delete Wallet', `Are you sure you want to delete "${wallet.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Final Confirmation', 'Transactions will be unassigned. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete Permanently', style: 'destructive', onPress: async () => {
                try {
                  await (require('../services/walletApi').deleteWallet)(wallet.id);
                  if (selectedWallet?.id === wallet.id) { await setSelectedWalletId(''); setSelectedWallet(null); }
                  setWallets(prev => prev.filter(w => w.id !== wallet.id));
                  refreshCallback();
                } catch (err) { console.error(err); Alert.alert('Error', 'Could not delete wallet.'); }
              }
            }
          ]);
        }
      }
    ]);
  };

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

  useFocusEffect(refreshCallback);

  const session = getAuthSession();
  const displayName = session?.username?.trim() || 'User';

  const budgetProgress = totalBudget > 0 ? Math.min(100, (expenseTotal / totalBudget) * 100) : 0;
  const isNearBudget = budgetProgress > 85;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>{getDaytimeGreeting()}</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable 
              onPress={() => navigation.navigate('Notifications')}
              style={[styles.iconButton, { backgroundColor: colors.card }]}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Svg>
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable 
              onPress={() => navigation.navigate('Profile')}
              style={[styles.profileButton, { backgroundColor: colors.cardBorder }]}
            >
              <View style={[styles.avatarGradient, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
                {profileData?.profilePic && profileData.profilePic.startsWith('http') ? (
                  <Image source={{ uri: profileData.profilePic }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={styles.avatarText}>{profileData?.profilePic || (profileData?.username || displayName).charAt(0).toUpperCase()}</Text>
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.wealthSection}>
          <Animated.View style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={StyleSheet.absoluteFill}>
              <Svg height="100%" width="100%" viewBox="0 0 350 220" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={isDark ? "#2D2D44" : "#ffffff"} stopOpacity="1" />
                    <Stop offset="50%" stopColor={isDark ? "#1C1C2E" : "#f0f2ff"} stopOpacity={1} />
                    <Stop offset="100%" stopColor={isDark ? "#0F0F1A" : "#e0e4ff"} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#grad)" />
                <Circle cx="350" cy="0" r="180" fill={isDark ? "rgba(138, 110, 255, 0.05)" : "rgba(110, 87, 255, 0.03)"} />
                <Circle cx="0" cy="220" r="120" fill={isDark ? "rgba(93, 63, 211, 0.05)" : "rgba(93, 63, 211, 0.03)"} />
              </Svg>
            </View>
            <View style={styles.balanceContentWrapper}>
              <View style={styles.balanceMetaRow}>
                <Pressable style={[styles.periodSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setIsPeriodModalVisible(true)}>
                  <Text style={[styles.periodText, { color: colors.textMuted }]}>{getPeriodLabel(periodMode, selectedPeriodMonth, selectedPeriodYear)}</Text>
                  <Text style={[styles.periodChevron, { color: colors.textMuted }]}>▼</Text>
                </Pressable>
                <Pressable style={[styles.eyeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setIsBalanceVisible(prev => !prev)}>
                  <Text style={styles.eyeButtonIcon}>{isBalanceVisible ? '👁️' : '🙈'}</Text>
                </Pressable>
              </View>
              <View style={styles.balanceHeader}>
                <Pressable style={[styles.walletSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setIsWalletModalVisible(true)}>
                  <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>{selectedWallet?.name || 'Total Balance'}</Text>
                  <Text style={[styles.walletChevron, { color: colors.textMuted }]}>▼</Text>
                </Pressable>
                <View style={[styles.trendBadge, { backgroundColor: monthTrend < 0 ? colors.danger + '20' : colors.success + '20' }]}>
                  <Text style={[styles.trendText, { color: monthTrend < 0 ? colors.danger : colors.success }]}>{monthTrend >= 0 ? '↗' : '↘'} {formatTrendPercent(monthTrend)}</Text>
                </View>
              </View>
              <Text style={[styles.balanceValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{isLoading ? '...' : (isBalanceVisible ? formatCurrency(totalBalance, true) : '••••••')}</Text>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Text style={[styles.statLabelSmall, { color: colors.textMuted }]}>INCOME</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.miniIndicator, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statValueSmall, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(incomeTotal)}</Text>
                </View>
              </View>
              <View style={styles.statColumn}>
                <Text style={[styles.statLabelSmall, { color: colors.textMuted }]}>EXPENSES</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.miniIndicator, { backgroundColor: colors.danger }]} />
                  <Text style={[styles.statValueSmall, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(expenseTotal)}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Budget Section */}
          {totalBudget > 0 && (
            <Animated.View style={[styles.budgetCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.budgetHeader}>
                <View>
                  <Text style={[styles.budgetLabel, { color: colors.textMuted }]}>MONTHLY BUDGET</Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(expenseTotal)} / {formatCurrency(totalBudget)}</Text>
                </View>
                <View style={[styles.budgetPercentBadge, { backgroundColor: isNearBudget ? colors.danger + '20' : colors.primaryBg }]}>
                  <Text style={[styles.budgetPercentText, { color: isNearBudget ? colors.danger : colors.primary }]}>{Math.round(budgetProgress)}%</Text>
                </View>
              </View>
              <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={[styles.progressFill, { width: `${budgetProgress}%`, backgroundColor: isNearBudget ? colors.danger : colors.primary }]} />
              </View>
              <Text style={[styles.budgetRemaining, { color: colors.textMuted }]}>
                {totalBudget >= expenseTotal ? `${formatCurrency(totalBudget - expenseTotal)} remaining` : `Over budget by ${formatCurrency(expenseTotal - totalBudget)}`}
              </Text>
            </Animated.View>
          )}
        </View>

        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics Overview</Text>
            <Pressable onPress={() => navigation.navigate('Analytics')}><Text style={[styles.seeAll, { color: colors.primary }]}>See Trends</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat, idx) => (
              <View key={cat.category} style={[styles.categoryCard, { marginLeft: idx === 0 ? 0 : 12, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.categoryCardHeader}>
                  <View style={[styles.catIconBox, { backgroundColor: colors.primaryBg }]}><Text style={[styles.catEmoji, { color: colors.primary }]}>{cat.category.charAt(0).toUpperCase()}</Text></View>
                  <Text style={[styles.catPercent, { color: colors.textMuted }]}>{Math.round((cat.amount / (expenseTotal || 1)) * 100)}%</Text>
                </View>
                <Text style={[styles.catName, { color: colors.textMuted }]}>{formatCategoryLabel(cat.category)}</Text>
                <Text style={[styles.catAmount, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(cat.amount)}</Text>
                <View style={[styles.progressBg, { backgroundColor: isDark ? '#0a0c1f' : '#f0f2ff' }]}><View style={[styles.progressFill, { width: `${Math.min(100, (cat.amount / (expenseTotal || 1)) * 100)}%`, backgroundColor: colors.primary }]} /></View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <Pressable onPress={() => navigation.navigate('History')}><Text style={[styles.seeAll, { color: colors.primary }]}>History</Text></Pressable>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={[styles.txList, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {recentTransactions.map((tx, idx) => {
                const catData = getCategoryData(tx.category);
                return (
                  <Pressable key={tx.id} style={[styles.txItem, idx === recentTransactions.length - 1 && styles.txItemLast, { borderBottomColor: colors.cardBorder }]} onPress={() => navigation.navigate('TransactionDetail', { transaction: tx })}>
                    <View style={[styles.txIconWrap, { backgroundColor: catData.color + '20' }]}><Text style={styles.categoryIconText}>{catData.icon}</Text></View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txCategory, { color: colors.text }]}>{catData.label}</Text>
                      <Text style={[styles.txDate, { color: colors.textMuted }]} numberOfLines={1}>{formatTransactionDate(tx.date)} {tx.note ? `• ${tx.note}` : ''}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.success : colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal visible={isWalletModalVisible} transparent animationType="slide" onRequestClose={() => setIsWalletModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => { setIsWalletModalVisible(false); setIsAddingWallet(false); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{isAddingWallet ? 'Create New Wallet' : 'Select Wallet'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {!isAddingWallet && (
                    <Pressable onPress={() => { setIsWalletModalVisible(false); setIsAddingWallet(false); navigation.navigate('WalletManagement'); }} style={[styles.manageBtn, { backgroundColor: colors.primaryBg }]}>
                      <Text style={[styles.manageBtnText, { color: colors.primary }]}>Manage</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => { setIsWalletModalVisible(false); setIsAddingWallet(false); }}><Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text></Pressable>
                </View>
              </View>

              {!isAddingWallet ? (
                <ScrollView style={styles.walletList} showsVerticalScrollIndicator={false}>
                  <Pressable 
                    style={[styles.walletItem, !selectedWallet && styles.walletItemActive, { backgroundColor: !selectedWallet ? colors.primaryBg : colors.background, borderColor: !selectedWallet ? colors.primary : 'transparent' }]}
                    onPress={() => { setSelectedWalletId(''); setSelectedWallet(null); setIsWalletModalVisible(false); refreshCallback(); }}
                  >
                    <View style={[styles.walletIconBox, { backgroundColor: colors.primaryBg }]}><Text style={styles.walletIcon}>🌐</Text></View>
                    <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>All Wallets</Text><Text style={[styles.walletCreatedText, { color: colors.textMuted }]}>Combined view</Text></View>
                    {!selectedWallet && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                  </Pressable>
                  {wallets.map(wallet => (
                    <Pressable key={wallet.id} style={[styles.walletItem, selectedWallet?.id === wallet.id && styles.walletItemActive, { backgroundColor: selectedWallet?.id === wallet.id ? colors.primaryBg : colors.background, borderColor: selectedWallet?.id === wallet.id ? colors.primary : 'transparent' }]} onPress={() => handleSelectWallet(wallet)}>
                      <View style={[styles.walletIconBox, { backgroundColor: wallet.color + '20' }]}><Text style={styles.walletIcon}>{wallet.icon}</Text></View>
                      <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>{wallet.name}</Text><Text style={[styles.walletCreatedText, { color: colors.textMuted }]}>Balance {formatCurrency(walletBalances[String(wallet.id)] || 0, true)}</Text></View>
                      {selectedWallet?.id === wallet.id && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                    </Pressable>
                  ))}
                  <Pressable style={[styles.addWalletBtn, { borderColor: colors.textMuted + '40' }]} onPress={() => setIsAddingWallet(true)}>
                    <View style={[styles.addWalletIconBox, { backgroundColor: colors.primaryBg }]}><Text style={[styles.addWalletIcon, { color: colors.primary }]}>+</Text></View>
                    <Text style={[styles.addWalletText, { color: colors.primary }]}>Add New Wallet</Text>
                  </Pressable>
                </ScrollView>
              ) : (
                <View style={styles.addWalletForm}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Wallet Name</Text>
                  <TextInput style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]} placeholder="e.g., Savings, Business" placeholderTextColor={colors.textMuted + '60'} value={newWalletName} onChangeText={setNewWalletName} autoFocus />
                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 16 }]}>Initial Balance (Optional)</Text>
                  <TextInput style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]} placeholder="0" placeholderTextColor={colors.textMuted + '60'} value={newWalletAmount} onChangeText={setNewWalletAmount} keyboardType="decimal-pad" />
                  <View style={styles.modalActionRow}>
                    <Pressable style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => { setIsAddingWallet(false); setNewWalletAmount(''); }}><Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text></Pressable>
                    <Pressable style={[styles.modalSaveBtn, { backgroundColor: colors.primary }, !newWalletName.trim() && { opacity: 0.5 }]} onPress={handleAddWallet} disabled={!newWalletName.trim()}><Text style={styles.modalSaveText}>Create Wallet</Text></Pressable>
                  </View>
                </View>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal visible={isPeriodModalVisible} transparent animationType="fade" onRequestClose={() => setIsPeriodModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsPeriodModalVisible(false)}>
          <Pressable style={[styles.periodModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.periodModalTitle, { color: colors.text, textAlign: 'center' }]}>Financial Data Period</Text>
            <Text style={[styles.periodModalSubtitle, { color: colors.textMuted, textAlign: 'center' }]}>Choose a month, a year, or all time.</Text>

            <View style={styles.periodChoiceList}>
              {(['month', 'year', 'all'] as const).map(option => {
                const isActive = periodMode === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.periodChoiceCard,
                      {
                        backgroundColor: isActive ? colors.primaryBg : colors.background,
                        borderColor: isActive ? colors.primary : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setPeriodMode(option)}
                  >
                    <View style={styles.periodChoiceTextWrap}>
                      <Text style={[styles.periodChoiceTitle, { color: isActive ? colors.primary : colors.text }]}>
                        {option === 'month' ? 'Pick Month' : option === 'year' ? 'Pick Year' : 'All Time'}
                      </Text>
                      <Text style={[styles.periodChoiceDescription, { color: colors.textMuted }]}>
                        {option === 'month'
                          ? getPeriodLabel('month', selectedPeriodMonth, selectedPeriodYear)
                          : option === 'year'
                            ? getPeriodLabel('year', selectedPeriodMonth, selectedPeriodYear)
                            : 'Everything in your wallet history'}
                      </Text>
                    </View>
                    <Text style={[styles.periodChoiceChevron, { color: isActive ? colors.primary : colors.textMuted }]}>▾</Text>
                  </Pressable>
                );
              })}
            </View>

            {periodMode === 'month' && (
              <View style={styles.periodPickerBlock}>
                <View style={styles.periodPickerHeaderRow}>
                  <Pressable
                    onPress={() => setSelectedPeriodYear(prev => prev - 1)}
                    style={[styles.periodArrowButton, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.periodArrowText, { color: colors.text }]}>‹</Text>
                  </Pressable>
                  <Text style={[styles.periodPickerHeading, { color: colors.text }]}>{selectedPeriodYear}</Text>
                  <Pressable
                    onPress={() => setSelectedPeriodYear(prev => prev + 1)}
                    style={[styles.periodArrowButton, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.periodArrowText, { color: colors.text }]}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.monthGrid}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                    const isSelected = selectedPeriodMonth === index;
                    return (
                      <Pressable
                        key={month}
                        onPress={() => {
                          setSelectedPeriodMonth(index);
                          setPeriodMode('month');
                        }}
                        style={[
                          styles.monthCell,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.monthCellText, { color: isSelected ? '#fff' : colors.text }]}>{month}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={[styles.periodApplyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsPeriodModalVisible(false)}
                >
                  <Text style={styles.periodApplyText}>Apply Month</Text>
                </Pressable>
              </View>
            )}

            {periodMode === 'year' && (
              <View style={styles.periodPickerBlock}>
                <View style={styles.periodPickerHeaderRow}>
                  <Pressable
                    onPress={() => setSelectedPeriodYear(prev => prev - 1)}
                    style={[styles.periodArrowButton, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.periodArrowText, { color: colors.text }]}>‹</Text>
                  </Pressable>
                  <Text style={[styles.periodPickerHeading, { color: colors.text }]}>{selectedPeriodYear}</Text>
                  <Pressable
                    onPress={() => setSelectedPeriodYear(prev => prev + 1)}
                    style={[styles.periodArrowButton, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.periodArrowText, { color: colors.text }]}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.yearGrid}>
                  {Array.from({ length: 9 }, (_, index) => selectedPeriodYear - 4 + index).map(year => {
                    const isSelected = year === selectedPeriodYear;
                    return (
                      <Pressable
                        key={year}
                        onPress={() => setSelectedPeriodYear(year)}
                        style={[
                          styles.yearCell,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.yearCellText, { color: isSelected ? '#fff' : colors.text }]}>{year}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={[styles.periodApplyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsPeriodModalVisible(false)}
                >
                  <Text style={styles.periodApplyText}>Apply Year</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingText: { fontSize: 14, fontWeight: '500', letterSpacing: 0.5 },
  userName: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4d6d', borderWidth: 1.5, borderColor: '#16193b' },
  profileButton: { width: 44, height: 44, borderRadius: 22, padding: 2 },
  avatarGradient: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  wealthSection: { marginBottom: 32 },
  balanceCard: { height: 220, borderRadius: 24, padding: 24, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, overflow: 'hidden', borderWidth: 1 },
  balanceContentWrapper: { flex: 1, justifyContent: 'center' },
  balanceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  periodSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  periodText: { fontSize: 12, fontWeight: '700' },
  periodChevron: { fontSize: 10, marginLeft: 6 },
  eyeButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyeButtonIcon: { fontSize: 16 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  walletSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  balanceLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  walletChevron: { fontSize: 10, marginLeft: 6 },
  balanceValue: { fontSize: 42, fontWeight: '800', letterSpacing: -0.5 },
  cardDivider: { height: 1, marginVertical: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statColumn: { flex: 1 },
  statLabelSmall: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  miniIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statValueSmall: { fontSize: 16, fontWeight: '700' },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  trendText: { fontSize: 12, fontWeight: '700' },
  budgetCard: { marginTop: 16, padding: 20, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  budgetValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  budgetPercentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  budgetPercentText: { fontSize: 12, fontWeight: '800' },
  budgetRemaining: { fontSize: 12, fontWeight: '600', marginTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  seeAll: { fontSize: 14, fontWeight: '700' },
  categoryScroll: { marginBottom: 32, marginHorizontal: -20, paddingHorizontal: 20 },
  categoryCard: { width: 150, borderRadius: 24, padding: 18, borderWidth: 1 },
  categoryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  catIconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 16, fontWeight: '800' },
  catPercent: { fontSize: 12, fontWeight: '700' },
  catName: { fontSize: 13, fontWeight: '600' },
  catAmount: { fontSize: 17, fontWeight: '800', marginTop: 4, marginBottom: 12 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  txList: { borderRadius: 28, padding: 8, borderWidth: 1 },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  txItemLast: { borderBottomWidth: 0 },
  txIconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  categoryIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 16, fontWeight: '700' },
  txDate: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  txAmount: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { width: '100%' },
  modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalCloseText: { fontSize: 18, fontWeight: '300' },
  manageBtn: { marginRight: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  manageBtnText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  deleteWalletBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteWalletIcon: { fontSize: 16 },
  walletList: { maxHeight: 400 },
  walletItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  walletItemActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  walletIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletIcon: { fontSize: 22 },
  walletInfo: { flex: 1 },
  walletNameText: { fontSize: 16, fontWeight: '700' },
  walletCreatedText: { fontSize: 12, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
  addWalletBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', marginTop: 8 },
  addWalletIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  addWalletIcon: { fontSize: 24, fontWeight: '300' },
  addWalletText: { fontSize: 16, fontWeight: '700' },
  addWalletForm: { paddingBottom: 20 },
  modalInput: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 24, borderWidth: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16 },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  modalSaveBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 16 },
  modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  periodModalCard: { width: '88%', borderRadius: 24, borderWidth: 1, padding: 18 },
  periodModalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  periodModalSubtitle: { fontSize: 12, fontWeight: '600', marginBottom: 16 },
  periodChoiceList: { gap: 12 },
  periodChoiceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 },
  periodChoiceTextWrap: { flex: 1, paddingRight: 10 },
  periodChoiceTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  periodChoiceDescription: { fontSize: 12, fontWeight: '600' },
  periodChoiceChevron: { fontSize: 14, fontWeight: '800' },
  periodPickerBlock: { marginTop: 18 },
  periodPickerHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  periodPickerHeading: { fontSize: 16, fontWeight: '800' },
  periodArrowButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodArrowText: { fontSize: 26, fontWeight: '300' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: { width: '31%', borderWidth: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  monthCellText: { fontSize: 13, fontWeight: '800' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearCell: { width: '31%', borderWidth: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  yearCellText: { fontSize: 13, fontWeight: '800' },
  periodApplyBtn: { marginTop: 14, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  periodApplyText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

export default React.memo(Dashboard);
