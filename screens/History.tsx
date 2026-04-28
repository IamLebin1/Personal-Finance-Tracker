import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
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
import { getTransactionsByUser } from '../services/transactionApi';
import { getWallets } from '../services/walletApi';
import { getSelectedWalletId, setSelectedWalletId } from '../services/walletService';
import { formatCurrency } from '../services/transactionService';
import type { Transaction, Wallet } from '../types/transaction';
import { getCategoryData } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';

export default function History() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(() => {
    let isMounted = true;
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const fetchedWallets = await getWallets();
        const savedWalletId = await getSelectedWalletId();
        const isAllWallets = !savedWalletId || savedWalletId === 'all';
        const currentWallet = isAllWallets ? null : (fetchedWallets.find(w => String(w.id) === String(savedWalletId)) || null);
        
        if (isMounted) {
          setWallets(fetchedWallets);
          setSelectedWallet(currentWallet);
        }

        const rows = await getTransactionsByUser(undefined, currentWallet?.id);
        if (isMounted) {
          setTransactions(rows);
          setFilteredTransactions(rows);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    setIsLoading(true);
    return () => {
      isMounted = false;
      task.cancel();
    };
  }, []);

  useFocusEffect(loadData);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

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
    }
    setFilteredTransactions(filtered);
  }, [searchQuery, activeFilter, transactions]);

  const handleSelectWallet = async (wallet: Wallet | null) => {
    const id = wallet ? String(wallet.id) : '';
    await setSelectedWalletId(id);
    setSelectedWallet(wallet);
    setIsWalletModalVisible(false);
    loadData();
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const catData = getCategoryData(item.category);
    const date = new Date(item.date);
    
    return (
      <Pressable 
        style={[styles.txItem, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('TransactionDetail' as never, { transaction: item } as never)}
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
        <View style={styles.txAmountWrap}>
          <Text style={[styles.txAmount, { color: item.type === 'income' ? colors.success : colors.text }]}>
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

        <View style={styles.filterRow}>
          {['All', 'Income', 'Expense'].map(filter => (
            <Pressable 
              key={filter} 
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip, 
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                activeFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.filterText, 
                { color: colors.textMuted },
                activeFilter === filter && { color: '#fff' }
              ]}>{filter}</Text>
            </Pressable>
          ))}
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
                  <View style={styles.walletInfo}><Text style={[styles.walletNameText, { color: colors.text }]}>{wallet.name}</Text></View>
                  {selectedWallet?.id === wallet.id && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                </Pressable>
              ))}
            </ScrollView>
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
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
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
  txAmountWrap: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  txNote: { fontSize: 11, marginTop: 4, maxWidth: 100 },
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
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
