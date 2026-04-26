import React, { useCallback, useState, useRef, useEffect } from 'react';
import { 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Animated, 
  Pressable, 
  TextInput, 
  StatusBar 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { Transaction } from '../types/transaction';
import { getTransactionsByUser } from '../services/transactionApi';
import { formatCurrency } from '../services/transactionService';

function formatCategoryLabel(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function History() {
  // 1. All hooks at the top
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadTransactions = async () => {
        setIsLoading(true);
        try {
          const rows = await getTransactionsByUser();
          if (isMounted) {
            setTransactions(rows);
            setFilteredTransactions(rows);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      void loadTransactions();
      return () => { isMounted = false; };
    }, [])
  );

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

  useEffect(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(tx => 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (activeFilter !== 'All') {
      filtered = filtered.filter(tx => tx.type.toLowerCase() === activeFilter.toLowerCase());
    }
    setFilteredTransactions(filtered);
  }, [searchQuery, activeFilter, transactions]);

  // 2. Render logic
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach(tx => {
    const label = getGroupLabel(tx.date);
    if (!groupedTransactions[label]) {
      groupedTransactions[label] = [];
    }
    groupedTransactions[label].push(tx);
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSubtitle}>Track and manage your spending</Text>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#747bb6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={styles.searchIcon}>
            <Circle cx="11" cy="11" r="8" />
            <Path d="M21 21l-4.35-4.35" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor="#747bb6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {['All', 'Income', 'Expense'].map(filter => (
            <Pressable 
              key={filter} 
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#8a6eff" size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {Object.keys(groupedTransactions).map((groupLabel) => (
              <View key={groupLabel} style={styles.groupContainer}>
                <Text style={styles.groupLabel}>{groupLabel}</Text>
                <View style={styles.cardList}>
                  {groupedTransactions[groupLabel].map((item, idx) => (
                    <View key={item.id} style={[styles.txItem, idx === groupedTransactions[groupLabel].length - 1 && styles.txItemLast]}>
                      <View style={[styles.iconWrap, { backgroundColor: item.type === 'income' ? 'rgba(32, 206, 143, 0.12)' : 'rgba(255, 77, 109, 0.12)' }]}>
                        <Text style={[styles.itemArrow, { color: item.type === 'income' ? '#20ce8f' : '#ff4d6d' }]}>
                          {item.type === 'income' ? '↓' : '↑'}
                        </Text>
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txCategory}>{formatCategoryLabel(item.category)}</Text>
                        <Text style={styles.txNote} numberOfLines={1}>{item.note || 'No description'}</Text>
                      </View>
                      <View style={styles.amountWrap}>
                        <Text style={[styles.txAmount, { color: item.type === 'income' ? '#20ce8f' : '#f4f6ff' }]}>
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>
                        <Text style={styles.txTime}>
                          {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {filteredTransactions.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                </View>
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptyText}>Try adjusting your search or filters to find what you're looking for.</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070817',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#f4f6ff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#8a90c6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16193b',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#232859',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f4f6ff',
    fontSize: 15,
    fontWeight: '500',
  },
  filterScroll: {
    marginTop: 14,
    marginHorizontal: -20,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#16193b',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#232859',
  },
  filterChipActive: {
    backgroundColor: '#8a6eff',
    borderColor: '#a18aff',
  },
  filterText: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupContainer: {
    marginTop: 24,
  },
  groupLabel: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  cardList: {
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemArrow: {
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
  txNote: {
    color: '#636781',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  txTime: {
    color: '#636781',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16193b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#636781',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
});
