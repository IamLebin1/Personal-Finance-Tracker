import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const historyItems = [
  { id: '1', title: 'Whole Foods Market', subtitle: 'Groceries • 10:42 AM', amount: '-$124.50', tone: 'expense' },
  { id: '2', title: 'Uber Trip', subtitle: 'Transport • 8:15 AM', amount: '-$14.20', tone: 'expense' },
  { id: '3', title: 'Freelance Payment', subtitle: 'Income • 07:00 AM', amount: '+$850.00', tone: 'income' },
  { id: '4', title: 'Netflix Subscription', subtitle: 'Entertainment • Monthly', amount: '-$15.99', tone: 'expense' },
  { id: '5', title: 'Starbucks Coffee', subtitle: 'Food & Drink • 09:30 AM', amount: '-$6.50', tone: 'expense' },
  { id: '6', title: 'Gym Membership', subtitle: 'Health • Recurring', amount: '-$45.00', tone: 'expense' },
];

export default function History() {
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

        <Text style={styles.sectionLabel}>TODAY, 24 OCT</Text>

        {historyItems.map(item => (
          <View key={item.id} style={styles.rowCard}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>{item.tone === 'income' ? '↑' : '•'}</Text>
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.amount, item.tone === 'income' ? styles.income : styles.expense]}>{item.amount}</Text>
          </View>
        ))}
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
    paddingTop: 12,
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
