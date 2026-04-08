import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

function formatTransactionDate(dateValue: string): string {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  const now = new Date();
  const isToday =
    parsedDate.getFullYear() === now.getFullYear() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getDate() === now.getDate();

  const prefix = isToday
    ? 'Today'
    : parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

  const time = parsedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${prefix} • ${time}`;
}

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadTransactions = async () => {
        try {
          const rows = await getTransactionsByUser();
          if (isMounted) {
            setTransactions(rows);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      setIsLoading(true);
      void loadTransactions();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.header}>History</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchText}>Search by merchant or category...</Text>
        </View>

        <View style={styles.filterRow}>
          <View style={[styles.filterChip, styles.filterActive]}>
            <Text style={[styles.filterChipText, styles.filterActiveText]}>Today</Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>Yesterday</Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>Last 30 Days</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>RECENT</Text>

        {isLoading ? <ActivityIndicator color="#8f7bff" style={{ marginTop: 16 }} /> : null}

        {!isLoading && transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : null}

        {transactions.map(item => {
          const signedAmount = `${item.type === 'income' ? '+' : '-'}${formatCurrency(item.amount)}`;
          return (
            <View key={item.id} style={styles.rowCard}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowIcon}>{item.type === 'income' ? '↑' : '•'}</Text>
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{formatCategoryLabel(item.category)}</Text>
                <Text style={styles.rowSubtitle}>{formatTransactionDate(item.date)}</Text>
              </View>
              <Text style={[styles.amount, item.type === 'income' ? styles.income : styles.expense]}>
                {signedAmount}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090a1f',
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: {
    color: '#f4f5ff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2d6d',
    backgroundColor: '#121437',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
  },
  searchText: {
    color: '#747bb6',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b2f6f',
    backgroundColor: '#121437',
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: '#6f53ff',
    borderColor: '#7d62ff',
  },
  filterChipText: {
    color: '#8a90c8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterActiveText: {
    color: '#f5f5ff',
  },
  sectionLabel: {
    color: '#7c82bc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  emptyText: {
    color: '#7f86c0',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b2f6f',
    backgroundColor: '#121437',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 9,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#252a56',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowIcon: {
    color: '#e7e9ff',
    fontWeight: '700',
    fontSize: 14,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#f1f3ff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#8087c1',
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
    fontSize: 16,
  },
  income: {
    color: '#1bcf8d',
  },
  expense: {
    color: '#f5f6ff',
  },
});
