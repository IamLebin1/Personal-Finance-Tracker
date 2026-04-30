import React, { useCallback, useState, useRef, useEffect } from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  TextInput,
  Animated,
  StatusBar,
  InteractionManager,
  Modal,
  Platform,
  ScrollView
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getTransactionsByUser, updateTransaction } from '../services/transactionApi';
import { subscribeToTransactions } from '../db/sqlite';
import { getWallets } from '../services/walletApi';
import { getSelectedWalletId, setSelectedWalletId } from '../services/walletService';
import { formatCurrency } from '../services/transactionService';
import type { Transaction, Wallet } from '../types/transaction';
import { getCategoryData } from '../constants/categories';
import type { Category } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';
import { getCategoryMapByType } from '../services/categoryService';

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateInput = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
};

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getMonthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

function History() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isFilterCategoryModalVisible, setIsFilterCategoryModalVisible] = useState(false);
  const [isDateRangeModalVisible, setIsDateRangeModalVisible] = useState(false);
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [filterCategoryKey, setFilterCategoryKey] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<'expense' | 'income', Category[]>>({ expense: [], income: [] });
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(null)));

        const [fetchedWallets, allTransactions, categoryData] = await Promise.all([
          getWallets(),
          getTransactionsByUser(),
          getCategoryMapByType(),
        ]);
        const savedWalletId = await getSelectedWalletId();
        const isAllWallets = !savedWalletId || savedWalletId === 'all';
        const currentWallet = isAllWallets ? null : (fetchedWallets.find(w => String(w.id) === String(savedWalletId)) || null);

        const nextWalletBalances: Record<string, number> = {};
        fetchedWallets.forEach(wallet => {
          nextWalletBalances[String(wallet.id)] = Number(wallet.initialBalance || 0);
        });
        allTransactions.forEach(tx => {
          if (!tx.walletId) return;
          const key = String(tx.walletId);
          if (nextWalletBalances[key] === undefined) {
            nextWalletBalances[key] = 0;
          }
          nextWalletBalances[key] += tx.type === 'income' ? tx.amount : -tx.amount;
        });
        
        if (!isMounted) return;
        setWallets(fetchedWallets);
        setWalletBalances(nextWalletBalances);
        setCategoryMap(categoryData);
        setSelectedWallet(currentWallet);

        const rows = await getTransactionsByUser(undefined, currentWallet?.id);
        if (isMounted) {
          setTransactions(rows);
          setFilteredTransactions(rows);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(loadData);

  useEffect(() => {
    const unsubscribe = subscribeToTransactions(() => {
      if (hasLoadedRef.current) {
        loadData();
      }
    });

    return unsubscribe;
  }, [loadData]);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading, fadeAnim, slideAnim]);

  useEffect(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(tx => 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.note || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeFilter === 'Income') {
      filtered = filtered.filter(tx => tx.type === 'income');
    } else if (activeFilter === 'Expense') {
      filtered = filtered.filter(tx => tx.type === 'expense');
    } else if (activeFilter === 'Transfer') {
      filtered = filtered.filter(tx => tx.type === 'transfer');
    }
    // Date range filter
    if (fromDateFilter) {
      const from = new Date(fromDateFilter);
      if (!Number.isNaN(from.getTime())) {
        filtered = filtered.filter(tx => new Date(tx.date) >= from);
      }
    }
    if (toDateFilter) {
      const to = new Date(toDateFilter);
      if (!Number.isNaN(to.getTime())) {
        filtered = filtered.filter(tx => new Date(tx.date) <= to);
      }
    }
    // Category filter
    if (filterCategoryKey) {
      filtered = filtered.filter(tx => tx.category === filterCategoryKey);
    }
    setFilteredTransactions(filtered);
  }, [searchQuery, activeFilter, transactions, fromDateFilter, toDateFilter, filterCategoryKey]);

  const handleSelectWallet = async (wallet: Wallet | null) => {
    const id = wallet ? String(wallet.id) : '';
    await setSelectedWalletId(id);
    setSelectedWallet(wallet);
    setIsWalletModalVisible(false);
    loadData();
  };

  const handleUpdateCategory = async (nextCategoryKey: string) => {
    if (!editingTransaction) return;
    try {
      const updated = await updateTransaction(editingTransaction.id, { category: nextCategoryKey }, editingTransaction);
      const target = updated || { ...editingTransaction, category: nextCategoryKey };
      setTransactions(prev => prev.map(item => (item.id === target.id ? target : item)));
      setFilteredTransactions(prev => prev.map(item => (item.id === target.id ? target : item)));
      setIsCategoryModalVisible(false);
      setEditingTransaction(null);
    } catch (err) {
      console.error(err);
    }
  };

  const applyPresetRange = (preset: '7' | '30' | '90' | 'thisMonth' | 'lastMonth' | 'clear') => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    if (preset === 'clear') {
      setFromDateFilter('');
      setToDateFilter('');
      return;
    }

    let start: Date;
    let end: Date;

    if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      end = getMonthEnd(today);
    } else if (preset === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 12);
    } else {
      const days = Number(preset);
      end = today;
      start = new Date(today);
      start.setDate(today.getDate() - days + 1);
    }

    setFromDateFilter(formatDateInput(start));
    setToDateFilter(formatDateInput(end));
    setCalendarMonth(getMonthStart(start));
    setIsDateRangeModalVisible(false);
  };

  const handleCalendarDatePress = (date: Date) => {
    const selectedValue = formatDateInput(date);
    const selectedFrom = parseDateInput(fromDateFilter);
    const selectedTo = parseDateInput(toDateFilter);

    if (!selectedFrom || (selectedFrom && selectedTo)) {
      setFromDateFilter(selectedValue);
      setToDateFilter('');
      return;
    }

    if (date.getTime() < selectedFrom.getTime()) {
      setToDateFilter(formatDateInput(selectedFrom));
      setFromDateFilter(selectedValue);
      return;
    }

    setToDateFilter(selectedValue);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const catData = getCategoryData(item.category);
    const date = new Date(item.date);
    
    return (
      <Pressable 
        style={[styles.txItem, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}
        onPress={() => (navigation as any).navigate('TransactionDetail', { transaction: item })}
      >
        <View style={[styles.txIconWrap, { backgroundColor: catData.color + '15' }]}>
          <Text style={styles.categoryIcon}>{catData.icon}</Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={[styles.txCategory, { color: colors.text }]}>{catData.label}</Text>
          <Text style={[styles.txDate, { color: colors.textMuted }]}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        {/* Edit button removed; tap the transaction to open detail/edit screen */}
        <View style={styles.txAmountWrap}>
          <Text style={[styles.txAmount, { color: item.type === 'income' ? colors.success : colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          {item.note ? <Text numberOfLines={1} style={[styles.txNote, { color: colors.textMuted }]}>{item.note}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
          <Pressable 
            style={[styles.walletBadge, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]} 
            onPress={() => setIsWalletModalVisible(true)}
          >
            <Text style={[styles.walletBadgeText, { color: colors.primary }]}>{selectedWallet?.name || 'All Wallets'}</Text>
            <Text style={[styles.walletChevron, { color: colors.primary }]}>▼</Text>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search categories or notes..."
            placeholderTextColor={colors.textMuted + '80'}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {['All', 'Income', 'Expense', 'Transfer'].map(filter => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  activeFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textMuted },
                    activeFilter === filter && { color: '#fff' },
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.filterControlsRow}>
            <Pressable style={[styles.filterChip, styles.dateRangeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setIsDateRangeModalVisible(true)}>
              <View style={styles.filterButtonTextWrap}>
                <Text style={[styles.filterButtonLabel, { color: colors.textMuted }]}>Date Range</Text>
                <Text style={[styles.filterButtonValue, { color: colors.text }]} numberOfLines={1}>
                  {fromDateFilter && toDateFilter ? `${fromDateFilter} - ${toDateFilter}` : fromDateFilter ? `${fromDateFilter} - ...` : 'Choose dates'}
                </Text>
              </View>
              <Text style={[styles.filterButtonChevron, { color: colors.textMuted }]}>▾</Text>
            </Pressable>
            <Pressable style={[styles.filterChip, styles.categoryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setIsFilterCategoryModalVisible(true)}>
              <View style={styles.filterButtonTextWrap}>
                <Text style={[styles.filterButtonLabel, { color: colors.textMuted }]}>Category</Text>
                <Text style={[styles.filterButtonValue, { color: colors.text }]} numberOfLines={1}>
                  {filterCategoryKey ? filterCategoryKey : 'All categories'}
                </Text>
              </View>
              <Text style={[styles.filterButtonChevron, { color: colors.textMuted }]}>▾</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <FlatList
            data={filteredTransactions}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📂</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {searchQuery ? "Try a different search term" : `Start by adding your first transaction in ${selectedWallet?.name || 'your wallets'}`}
                </Text>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* Shared Wallet Modal */}
      <Modal visible={isWalletModalVisible} transparent animationType="slide" onRequestClose={() => setIsWalletModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsWalletModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Wallet</Text>
              <Pressable onPress={() => setIsWalletModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.walletList} showsVerticalScrollIndicator={false}>
              <Pressable 
                style={[styles.walletItem, !selectedWallet && styles.walletItemActive, { backgroundColor: !selectedWallet ? colors.primaryBg : colors.background, borderColor: !selectedWallet ? colors.primary : 'transparent' }]}
                onPress={() => handleSelectWallet(null)}
              >
                <View style={[styles.walletIconBox, { backgroundColor: colors.primaryBg }]}><Text style={styles.walletIcon}>🌐</Text></View>
                <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>All Wallets</Text></View>
                {!selectedWallet && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
              </Pressable>
              {wallets.map(wallet => (
                <Pressable 
                  key={wallet.id} 
                  style={[styles.walletItem, selectedWallet?.id === wallet.id && styles.walletItemActive, { backgroundColor: selectedWallet?.id === wallet.id ? colors.primaryBg : colors.background, borderColor: selectedWallet?.id === wallet.id ? colors.primary : 'transparent' }]}
                  onPress={() => handleSelectWallet(wallet)}
                >
                  <View style={[styles.walletIconBox, { backgroundColor: wallet.color + '20' }]}><Text style={styles.walletIcon}>{wallet.icon}</Text></View>
                  <View style={styles.walletInfo}>
                    <Text style={[styles.walletNameText, { color: colors.text }]}>{wallet.name}</Text>
                    <Text style={[styles.walletAmountText, { color: colors.textMuted }]}>Balance {formatCurrency(walletBalances[String(wallet.id)] || 0, true)}</Text>
                  </View>
                  {selectedWallet?.id === wallet.id && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isCategoryModalVisible} transparent animationType="slide" onRequestClose={() => setIsCategoryModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCategoryModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Category</Text>
              <Pressable onPress={() => setIsCategoryModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.walletList} showsVerticalScrollIndicator={false}>
              {(editingTransaction?.type === 'income' ? categoryMap.income : categoryMap.expense).map(category => (
                <Pressable
                  key={category.key}
                  style={[
                    styles.walletItem,
                    editingTransaction?.category === category.key && styles.walletItemActive,
                    {
                      backgroundColor: editingTransaction?.category === category.key ? colors.primaryBg : colors.background,
                      borderColor: editingTransaction?.category === category.key ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => handleUpdateCategory(category.key)}
                >
                  <View style={[styles.walletIconBox, { backgroundColor: category.color + '20' }]}><Text style={styles.walletIcon}>{category.icon}</Text></View>
                  <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>{category.label}</Text></View>
                  {editingTransaction?.category === category.key && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
        </Modal>

        <Modal visible={isFilterCategoryModalVisible} transparent animationType="slide" onRequestClose={() => setIsFilterCategoryModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsFilterCategoryModalVisible(false)}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Category</Text>
                <Pressable onPress={() => setIsFilterCategoryModalVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.walletList} showsVerticalScrollIndicator={false}>
                {[...categoryMap.expense, ...categoryMap.income].map(category => (
                  <Pressable
                    key={category.key}
                    style={[
                      styles.walletItem,
                      filterCategoryKey === category.key && styles.walletItemActive,
                      {
                        backgroundColor: filterCategoryKey === category.key ? colors.primaryBg : colors.background,
                        borderColor: filterCategoryKey === category.key ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setFilterCategoryKey(category.key === filterCategoryKey ? null : category.key);
                      setIsFilterCategoryModalVisible(false);
                    }}
                  >
                    <View style={[styles.walletIconBox, { backgroundColor: category.color + '20' }]}><Text style={styles.walletIcon}>{category.icon}</Text></View>
                    <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>{category.label}</Text></View>
                    {filterCategoryKey === category.key && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={isDateRangeModalVisible} transparent animationType="slide" onRequestClose={() => setIsDateRangeModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsDateRangeModalVisible(false)}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Date Range</Text>
                <Pressable onPress={() => setIsDateRangeModalVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Quick select</Text>
              <View style={styles.quickSelectGrid}>
                {[
                  { label: 'Past 7 days', value: '7' as const },
                  { label: 'Past 30 days', value: '30' as const },
                  { label: 'Past 90 days', value: '90' as const },
                  { label: 'This month', value: 'thisMonth' as const },
                  { label: 'Last month', value: 'lastMonth' as const },
                  { label: 'Clear', value: 'clear' as const },
                ].map(option => (
                  <Pressable
                    key={option.label}
                    onPress={() => applyPresetRange(option.value)}
                    style={[styles.quickSelectChip, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.quickSelectText, { color: colors.text }]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.calendarHeaderRow}>
                <Pressable onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                  <Text style={[styles.calendarNavText, { color: colors.primary }]}>‹</Text>
                </Pressable>
                <Text style={[styles.calendarMonthLabel, { color: colors.text }]}>
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                  <Text style={[styles.calendarNavText, { color: colors.primary }]}>›</Text>
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <Text key={day} style={[styles.weekdayLabel, { color: colors.textMuted }]}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {(() => {
                  const start = getMonthStart(calendarMonth);
                  const end = getMonthEnd(calendarMonth);
                  const cells: Array<Date | null> = [];
                  const leadingDays = start.getDay();
                  for (let index = 0; index < leadingDays; index += 1) {
                    cells.push(null);
                  }
                  for (let day = 1; day <= end.getDate(); day += 1) {
                    cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day, 12));
                  }
                  while (cells.length % 7 !== 0) {
                    cells.push(null);
                  }

                  const selectedFrom = parseDateInput(fromDateFilter);
                  const selectedTo = parseDateInput(toDateFilter);

                  return cells.map((date, index) => {
                    if (!date) {
                      return <View key={`empty-${index}`} style={styles.calendarCell} />;
                    }

                    const currentValue = formatDateInput(date);
                    const isStart = selectedFrom ? currentValue === formatDateInput(selectedFrom) : false;
                    const isEnd = selectedTo ? currentValue === formatDateInput(selectedTo) : false;
                    const isInRange = selectedFrom && selectedTo
                      ? date.getTime() >= selectedFrom.getTime() && date.getTime() <= selectedTo.getTime()
                      : false;

                    return (
                      <Pressable
                        key={currentValue}
                        onPress={() => handleCalendarDatePress(date)}
                        style={[
                          styles.calendarCell,
                          isInRange && { backgroundColor: colors.primaryBg },
                          (isStart || isEnd) && { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={[(isStart || isEnd) ? styles.calendarDayActive : styles.calendarDay, { color: (isStart || isEnd) ? '#fff' : colors.text }]}>
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  });
                })()}
              </View>

              <View style={styles.modalFooterRow}>
                <Pressable
                  style={[styles.footerAction, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setFromDateFilter('');
                    setToDateFilter('');
                  }}
                >
                  <Text style={[styles.footerActionText, { color: colors.text }]}>Clear</Text>
                </Pressable>
                <Pressable
                  style={[styles.footerAction, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setIsDateRangeModalVisible(false)}
                >
                  <Text style={[styles.footerActionText, { color: '#fff' }]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800' },
  walletBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  walletBadgeText: { fontSize: 12, fontWeight: '700' },
  walletChevron: { fontSize: 10, marginLeft: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1, marginBottom: 15 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  filterSection: { gap: 14 },
  filterChipRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 4, gap: 12 },
  filterControlsRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 2 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  dateRangeButton: { flex: 1.1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryButton: { flex: 0.9, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterButtonTextWrap: { flex: 1, marginRight: 10 },
  filterButtonLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  filterButtonValue: { fontSize: 14, fontWeight: '700' },
  filterButtonChevron: { fontSize: 12, fontWeight: '800', marginLeft: 8 },
  filterText: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  txItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1 
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  categoryIcon: { fontSize: 20 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txDate: { fontSize: 12, fontWeight: '500' },
  editCategoryBtn: { marginRight: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  editCategoryBtnText: { fontSize: 11, fontWeight: '700' },
  txAmountWrap: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  txNote: { fontSize: 11, marginTop: 4, maxWidth: 160 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalCloseText: { fontSize: 18, fontWeight: '300' },
  walletList: { maxHeight: 400 },
  walletItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  walletItemActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  walletIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletIcon: { fontSize: 22 },
  walletInfo: { flex: 1 },
  walletNameText: { fontSize: 16, fontWeight: '700' },
  walletAmountText: { fontSize: 12, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  quickSelectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  quickSelectChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  quickSelectText: { fontSize: 13, fontWeight: '700' },
  calendarHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarNavText: { fontSize: 28, fontWeight: '300', width: 28, textAlign: 'center' },
  calendarMonthLabel: { fontSize: 16, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { width: `${100 / 7}%` as any, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  calendarCell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginBottom: 8 },
  calendarDay: { fontSize: 14, fontWeight: '700' },
  calendarDayActive: { fontSize: 14, fontWeight: '800' },
  modalFooterRow: { flexDirection: 'row', gap: 10 },
  footerAction: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  footerActionText: { fontSize: 14, fontWeight: '800' },
});

export default React.memo(History);
