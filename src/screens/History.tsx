import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  SectionList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscribeToTransactions } from '../services/transactions';

var config = require('../config/Config');

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  occurredOn: string;
  createdAt: string;
}

interface TransactionSection {
  title: string;
  data: TransactionRecord[];
}

type FilterType = 'today' | 'yesterday' | 'last30' | 'monthly' | 'custom';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const CACHE_KEY = 'cached_transactions_history';
const LAST_FETCH_KEY = 'last_fetch_timestamp_history';

// Helper: Get relative date label for grouping
const getDateLabel = (dateString: string): string => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const txDate = new Date(dateString);
    txDate.setHours(0, 0, 0, 0);

    if (txDate.getTime() === today.getTime()) {
      return 'Today';
    }
    if (txDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = txDate.getDate();
    const month = months[txDate.getMonth()];

    return `${day} ${month}`;
  } catch (error) {
    return dateString;
  }
};

// Helper: Parse transaction date
const parseTransactionDate = (dateString: string): Date => {
  return new Date(dateString);
};

// Helper: Get category icon
const getCategoryIcon = (category: string): string => {
  const c = category.toLowerCase();

  if (c.includes('food') || c.includes('restaurant') || c.includes('groceries')) {
    return 'silverware-fork-knife';
  }
  if (c.includes('shop') || c.includes('shopping')) {
    return 'shopping-outline';
  }
  if (c.includes('transport') || c.includes('uber') || c.includes('taxi')) {
    return 'car-outline';
  }
  if (c.includes('bill') || c.includes('utilities')) {
    return 'file-document-outline';
  }
  if (c.includes('health') || c.includes('gym')) {
    return 'heart-pulse';
  }
  if (c.includes('entertain') || c.includes('movie') || c.includes('netflix')) {
    return 'movie-outline';
  }
  if (c.includes('income') || c.includes('salary') || c.includes('freelance') || c.includes('payment')) {
    return 'cash-multiple';
  }
  if (c.includes('subscription')) {
    return 'repeat';
  }

  return 'cash-outline';
};

// Helper: Get category color
const getCategoryColor = (category: string): { bg: string; light: string } => {
  const c = category.toLowerCase();

  if (c.includes('food') || c.includes('restaurant') || c.includes('groceries')) {
    return { bg: 'rgba(251, 146, 60, 0.2)', light: '#fb923c' };
  }
  if (c.includes('shop') || c.includes('shopping')) {
    return { bg: 'rgba(59, 130, 246, 0.2)', light: '#3b82f6' };
  }
  if (c.includes('transport') || c.includes('uber') || c.includes('taxi')) {
    return { bg: 'rgba(34, 197, 94, 0.2)', light: '#22c55e' };
  }
  if (c.includes('bill') || c.includes('utilities')) {
    return { bg: 'rgba(218, 165, 32, 0.2)', light: '#daa520' };
  }
  if (c.includes('health') || c.includes('gym')) {
    return { bg: 'rgba(244, 63, 94, 0.2)', light: '#f43f5e' };
  }
  if (c.includes('entertain') || c.includes('movie') || c.includes('netflix')) {
    return { bg: 'rgba(168, 85, 247, 0.2)', light: '#a855f7' };
  }
  if (c.includes('income') || c.includes('salary') || c.includes('freelance') || c.includes('payment')) {
    return { bg: 'rgba(16, 185, 129, 0.2)', light: '#10b981' };
  }
  if (c.includes('subscription')) {
    return { bg: 'rgba(139, 92, 246, 0.2)', light: '#8b5cf6' };
  }

  return { bg: 'rgba(108, 92, 231, 0.2)', light: '#6c5ce7' };
};

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.filterChip, active && styles.filterChipActive]}
    onPress={onPress}>
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
      {label}
    </Text>
  </Pressable>
);

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUserId } = useAuth();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('custom');
  const [isOffline, setIsOffline] = useState(false);

  const cacheKey = currentUserId ? `${CACHE_KEY}_${currentUserId}` : CACHE_KEY;

  // Load cached data immediately for this user for instant first paint
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    AsyncStorage.getItem(cacheKey)
      .then(cachedData => {
        if (cachedData) {
          setTransactions(JSON.parse(cachedData));
        }
      })
      .catch(() => {
        console.warn('Failed to load cached transactions');
      });
  }, [cacheKey, currentUserId]);

  // Fetch transactions from API in background, without blocking UI
  const fetchTransactions = useCallback(() => {
    if (!currentUserId) {
      return;
    }

    setLoading(true);

    fetch(config.settings.serverPath + '/api/transactions')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const normalizedTransactions: TransactionRecord[] = Array.isArray(data)
          ? data.map((tx: any) => ({
              id: String(tx.id ?? ''),
              userId: String(tx.userId ?? ''),
              type: tx.type === 'income' ? 'income' : 'expense',
              amount: Number(tx.amount ?? 0),
              category: tx.category ?? 'Other',
              note: tx.note ?? '',
              occurredOn: tx.occurredOn ?? new Date().toISOString().slice(0, 10),
              createdAt: tx.createdAt ?? '',
            }))
          : [];

        // Filter by authenticated user (string-normalized to avoid number/string mismatch)
        const userTransactions = normalizedTransactions.filter(
          tx => String(tx.userId) === String(currentUserId),
        );

        setTransactions(userTransactions);
        setIsOffline(false);
        setLoading(false);

        // Cache the transactions (non-blocking)
        AsyncStorage.setItem(cacheKey, JSON.stringify(userTransactions))
          .then(() => AsyncStorage.setItem(LAST_FETCH_KEY, new Date().toISOString()))
          .catch(() => {
            console.warn('Failed to cache transactions');
          });
      })
      .catch(error => {
        console.warn('Fetch error:', error);
        setIsOffline(true);
        setLoading(false);
        // Try to load from cache on error
        AsyncStorage.getItem(cacheKey)
          .then(cachedData => {
            if (!cachedData) {
              setTransactions([]);
            }
          })
          .catch(() => {
            setTransactions([]);
          });
      });
  }, [cacheKey, currentUserId]);

  // Keep History in sync using the same subscription behavior as Home
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const unsubscribe = subscribeToTransactions(currentUserId, (records: TransactionRecord[]) => {
      const normalizedRecords = Array.isArray(records)
        ? records.map(tx => ({ ...tx, userId: String(tx.userId ?? '') }))
        : [];

      setTransactions(normalizedRecords);
      setLoading(false);
      setIsOffline(false);

      AsyncStorage.setItem(cacheKey, JSON.stringify(normalizedRecords)).catch(() => {
        console.warn('Failed to cache transactions from subscription');
      });
    });

    return unsubscribe;
  }, [cacheKey, currentUserId]);

  // Fetch fresh data when authenticated user id is available
  useEffect(() => {
    if (currentUserId) {
      fetchTransactions();
    }
  }, [currentUserId, fetchTransactions]);

  // Socket.io listener for real-time updates (CO4 requirement)
  // Note: Using polling fallback via subscribeToTransactions instead of Socket.io
  // which is not fully compatible with React Native environment
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    // Real-time sync is handled by subscribeToTransactions above
    // which polls at 1.5s intervals for data changes
    return undefined;
  }, [currentUserId]);

  // Filter logic
  const isWithinFilter = (tx: TransactionRecord): boolean => {
    const txDate = parseTransactionDate(tx.occurredOn);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const txDateNormalized = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

    switch (activeFilter) {
      case 'today':
        return txDateNormalized.getTime() === today.getTime();
      case 'yesterday':
        return txDateNormalized.getTime() === yesterday.getTime();
      case 'last30':
        return txDateNormalized.getTime() >= last30Days.getTime() && txDateNormalized.getTime() <= today.getTime();
      case 'monthly':
        return txDateNormalized.getMonth() === today.getMonth() && txDateNormalized.getFullYear() === today.getFullYear();
      case 'custom':
        // TODO: Implement custom range selection
        return true;
      default:
        return true;
    }
  };

  // Filtered and grouped transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => isWithinFilter(tx))
      .filter(tx => {
        const searchLower = searchQuery.toLowerCase();
        return (
          tx.category.toLowerCase().includes(searchLower) ||
          (tx.note && tx.note.toLowerCase().includes(searchLower))
        );
      })
      .sort((a, b) => parseTransactionDate(b.occurredOn).getTime() - parseTransactionDate(a.occurredOn).getTime());
  }, [transactions, activeFilter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    const groups: Map<string, TransactionRecord[]> = new Map();

    filteredTransactions.forEach(tx => {
      const dateLabel = getDateLabel(tx.occurredOn);
      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, []);
      }
      groups.get(dateLabel)!.push(tx);
    });

    const sections: TransactionSection[] = Array.from(groups.entries()).map(([title, data]) => ({
      title,
      data,
    }));

    return sections;
  }, [filteredTransactions]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (filteredTransactions.length === 0) {
      Alert.alert('No Data', 'There are no transactions to export.');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = filteredTransactions.map(tx => [
      tx.occurredOn,
      tx.type,
      tx.category,
      tx.amount.toFixed(2),
      tx.note || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    const fileName = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    RNFS.writeFile(filePath, csvContent, 'utf8')
      .then(() => {
        Alert.alert('Success', `Transactions exported to ${fileName}`);
      })
      .catch(error => {
        console.error('Export error:', error);
        Alert.alert('Error', 'Failed to export transactions.');
      });
  }, [filteredTransactions]);

  // Render transaction item
  const renderTransactionItem = ({ item }: { item: TransactionRecord }) => {
    const isIncome = item.type === 'income';
    const categoryColor = getCategoryColor(item.category);
    const categoryIcon = getCategoryIcon(item.category);

    return (
      <Pressable
        style={({ pressed }) => [styles.transactionItem, pressed && { opacity: 0.8 }]}
        onPress={() => navigation.navigate('TransactionForm', { transactionId: item.id })}>
        <View style={[styles.iconBox, { backgroundColor: categoryColor.bg }]}>
          <MaterialCommunityIcons name={categoryIcon} size={20} color={categoryColor.light} />
        </View>

        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {item.category}
          </Text>
          <Text style={styles.transactionMeta} numberOfLines={1}>
            {item.note || 'No description'} • {item.occurredOn}
          </Text>
        </View>

        <Text style={[styles.transactionAmount, isIncome && styles.incomeAmount]}>
          {isIncome ? '+' : '-'}RM {Math.abs(item.amount).toFixed(2)}
        </Text>
      </Pressable>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section: { title } }: { section: TransactionSection }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Ambient backgrounds */}
      <View style={styles.backgroundWrap}>
        <View style={styles.backgroundOrbOne} />
        <View style={styles.backgroundOrbTwo} />
      </View>

      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.headerTitle}>History</Text>

          <Pressable style={styles.headerButton} onPress={exportToCSV}>
            <Ionicons name="download" size={20} color="#F8FAFC" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by merchant or category..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable style={styles.filterButton}>
            <Ionicons name="tune" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsContainer}
          contentContainerStyle={styles.filterChipsContent}>
          <FilterChip label="All" active={activeFilter === 'custom'} onPress={() => setActiveFilter('custom')} />
          <FilterChip label="Today" active={activeFilter === 'today'} onPress={() => setActiveFilter('today')} />
          <FilterChip label="Yesterday" active={activeFilter === 'yesterday'} onPress={() => setActiveFilter('yesterday')} />
          <FilterChip label="Last 30 Days" active={activeFilter === 'last30'} onPress={() => setActiveFilter('last30')} />
          <FilterChip label="Monthly" active={activeFilter === 'monthly'} onPress={() => setActiveFilter('monthly')} />
        </ScrollView>

        {/* Offline indicator */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={14} color="#F87171" />
            <Text style={styles.offlineText}>Showing cached data</Text>
          </View>
        )}
      </View>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>{loading ? 'Refreshing history...' : 'No transactions found'}</Text>
          <Text style={styles.emptySubtitle}>
            {loading ? 'Fetching latest records in background' : 'Try adjusting your filters or search query'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          keyExtractor={(item, index) => item.id || `${index}`}
          renderItem={renderTransactionItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOrbOne: {
    position: 'absolute',
    top: -40,
    left: -60,
    width: '58%',
    height: '30%',
    borderRadius: 999,
    backgroundColor: 'rgba(108, 92, 231, 0.20)',
    opacity: 0.9,
  },
  backgroundOrbTwo: {
    position: 'absolute',
    bottom: '8%',
    right: -30,
    width: '42%',
    height: '25%',
    borderRadius: 999,
    backgroundColor: 'rgba(108, 92, 231, 0.10)',
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(19,18,33,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 28, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButton: {
    padding: 8,
  },
  filterChipsContainer: {
    marginBottom: 12,
  },
  filterChipsContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 28, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
    shadowColor: '#6c5ce7',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
    gap: 8,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 28, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  transactionMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  incomeAmount: {
    color: '#10b981',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default HistoryScreen;
