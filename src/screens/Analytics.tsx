import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import type { TransactionRecord } from '../types/transactions';
import { useAuth } from '../context/AuthContext';
import { subscribeToTransactions } from '../services/transactions';
import { groupSpendingByCategory } from '../utils/analytics';

const screenWidth = Dimensions.get('window').width;

const chartColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899'];

const AnalyticsScreen = () => {
  const { user, signOut } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const unsubscribe = subscribeToTransactions(user.uid, setTransactions);
    return unsubscribe;
  }, [user]);

  const categorySummary = groupSpendingByCategory(transactions);
  const expenseTransactions = transactions.filter(item => item.type === 'expense');
  const totalSpent = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalIncome = transactions
    .filter(item => item.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const chartData =
    categorySummary.length > 0
      ? categorySummary.map((item, index) => ({
          name: item.category,
          population: Number(item.total.toFixed(2)),
          color: chartColors[index % chartColors.length],
          legendFontColor: '#0F172A',
          legendFontSize: 12,
        }))
      : [
          {
            name: 'No spending',
            population: 1,
            color: '#CBD5E1',
            legendFontColor: '#0F172A',
            legendFontSize: 12,
          },
        ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerKicker}>Analytics</Text>
          <Text style={styles.headerTitle}>See where your money goes.</Text>
          <Text style={styles.headerSubtitle}>
            Spending is grouped by category and rendered as a pie chart from live cloud data.
          </Text>
        </View>

        <Pressable onPress={() => signOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text style={styles.summaryValue}>RM {totalSpent.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={styles.summaryValue}>RM {totalIncome.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Categories</Text>
          <Text style={styles.summaryValue}>{categorySummary.length}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <PieChart
          accessor="population"
          backgroundColor="transparent"
          chartConfig={{
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            color: () => '#0F172A',
          }}
          data={chartData}
          height={screenWidth * 0.64}
          paddingLeft="12"
          absolute
          width={screenWidth - 32}
        />
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        <FlatList
          data={categorySummary}
          keyExtractor={item => item.category}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.swatch, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <Text style={styles.rowLabel}>{item.category}</Text>
              </View>
              <Text style={styles.rowValue}>RM {item.total.toFixed(2)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No expense data yet.</Text>}
        />
      </View>
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
    backgroundColor: '#111827',
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexGrow: 1,
    flexBasis: '31%',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  rowLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  rowValue: {
    color: '#334155',
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnalyticsScreen;