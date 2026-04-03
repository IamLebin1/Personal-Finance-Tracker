import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { TransactionsStackParamList } from '../navigation/types';
import { removeTransaction, subscribeToTransactions } from '../services/transactions';
import type { TransactionRecord } from '../types/transactions';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'Transactions'>;

const palette = ['#38BDF8', '#22C55E', '#F59E0B', '#A855F7', '#EF4444', '#14B8A6'];

const TransactionsScreen = ({ navigation }: Props) => {
  const { user, signOut } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTransactions(user.uid, nextTransactions => {
      setTransactions(nextTransactions);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const totalBalance = transactions.reduce((sum, transaction) => {
    const signedAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    return sum + signedAmount;
  }, 0);

  const openEditor = (transactionId?: string) => {
    navigation.navigate('TransactionForm', { transactionId });
  };

  const confirmDelete = (transactionId: string) => {
    Alert.alert('Delete transaction', 'Remove this transaction from the cloud?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(transactionId);
        },
      },
    ]);
  };

  const renderTransaction = ({ item, index }: { item: TransactionRecord; index: number }) => {
    const isIncome = item.type === 'income';
    const amountColor = isIncome ? '#22C55E' : '#F97316';
    const sign = isIncome ? '+' : '-';
    const accent = palette[index % palette.length];

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, { borderLeftColor: accent }]}
        onPress={() => openEditor(item.id)}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.note} numberOfLines={1}>
              {item.note || 'No description'}
            </Text>
          </View>
          <Text style={[styles.amount, { color: amountColor }]}>
            {sign}RM {Number(item.amount).toFixed(2)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.type.toUpperCase()}</Text>
          <Text style={styles.metaText}>{item.occurredOn}</Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable onPress={() => openEditor(item.id)} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => confirmDelete(item.id)} style={[styles.actionButton, styles.destructiveButton]}>
            <Text style={[styles.actionButtonText, styles.destructiveButtonText]}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerKicker}>My Wallet</Text>
          <Text style={styles.headerTitle}>Track transactions in the cloud.</Text>
          <Text style={styles.headerSubtitle}>
            Tap any past transaction to edit its amount or category.
          </Text>
        </View>

        <Pressable onPress={() => signOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={styles.summaryValue}>RM {totalBalance.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>{transactions.length}</Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={transactions}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{loading ? 'Loading transactions...' : 'No transactions yet'}</Text>
            <Text style={styles.emptyText}>
              Create a transaction to see the cloud-backed list here.
            </Text>
          </View>
        }
        renderItem={renderTransaction}
        showsVerticalScrollIndicator={false}
      />

      <Pressable style={styles.fab} onPress={() => openEditor()}>
        <Text style={styles.fabText}>+ Add Transaction</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
  },
  headerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
  },
  headerKicker: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 6,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flex: 1,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderLeftWidth: 5,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  category: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  note: {
    color: '#64748B',
    marginTop: 4,
    maxWidth: 220,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  destructiveButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  destructiveButtonText: {
    color: '#B91C1C',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default TransactionsScreen;