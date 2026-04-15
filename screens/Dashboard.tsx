import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getTransactionsByUser } from '../services/transactionApi';
import { formatCurrency } from '../services/transactionService';
import type { Transaction } from '../types/transaction';

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
    if (currentMonthNet === 0) {
      return 0;
    }

    return currentMonthNet > 0 ? 100 : -100;
  }

  return ((currentMonthNet - previousMonthNet) / Math.abs(previousMonthNet)) * 100;
}

function formatTrendPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function buildSmoothPath(values: number[], width: number, height: number, padding = 3): string {
  const safeWidth = Math.max(1, width - padding * 2);
  const safeHeight = Math.max(1, height - padding * 2);

  if (values.length === 0) {
    const y = padding + safeHeight / 2;
    return `M ${padding} ${y} L ${padding + safeWidth} ${y}`;
  }

  if (values.length === 1) {
    const y = padding + safeHeight / 2;
    return `M ${padding} ${y} L ${padding + safeWidth} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * safeWidth;
    const y = padding + (1 - (value - min) / range) * safeHeight;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp2x = curr.x - (curr.x - prev.x) / 2;
    path += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return path;
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

  return `${prefix}, ${time}`;
}

function formatCategoryLabel(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSignedAmount(transaction: Transaction): string {
  const prefix = transaction.type === 'income' ? '+' : '-';
  return `${prefix}${formatCurrency(transaction.amount)}`;
}

type DashboardProps = {
  navigation: any;
};

export default function Dashboard({ navigation }: DashboardProps) {
  const [totalBalance, setTotalBalance] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [sparklineValues, setSparklineValues] = useState<number[]>([]);
  const [monthTrend, setMonthTrend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const refreshDashboard = async () => {
        try {
          const allTransactions = await getTransactionsByUser();

          const income = allTransactions
            .filter(item => item.type === 'income')
            .reduce((acc, item) => acc + item.amount, 0);

          const expenses = allTransactions
            .filter(item => item.type === 'expense')
            .reduce((acc, item) => acc + item.amount, 0);

          if (!isMounted) {
            return;
          }

          setIncomeTotal(income);
          setExpenseTotal(expenses);
          setTotalBalance(income - expenses);
          setRecentTransactions(allTransactions.slice(0, 4));
          setSparklineValues(allTransactions.slice(0, 8).reverse().map(item => toSignedAmount(item)));
          setMonthTrend(calculateMonthOverMonthTrend(allTransactions));
        } catch {
          if (isMounted) {
            setRecentTransactions([]);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      setIsLoading(true);
      void refreshDashboard();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallMuted}>Welcome back,</Text>
            <Text style={styles.greeting}>Good Morning, Alex</Text>
          </View>
          <View style={styles.bellWrap}>
            <Text style={styles.bellText}>!</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceFadeLeft} />
          <View style={styles.balanceFadeLeftSoft} />
          <View style={styles.balanceFadeMiddle} />
          <View style={styles.balanceFadeRight} />
          <Text style={styles.balanceLabel}>Total Balance</Text>
          {isLoading ? (
            <ActivityIndicator color="#8f7bff" style={styles.loadingIndicator} />
          ) : (
            <Text style={[styles.balanceValue, totalBalance < 0 ? styles.negativeBalance : null]}>
              {totalBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(totalBalance))}
            </Text>
          )}
          <View style={styles.balanceMetaRow}>
            <View
              style={[
                styles.trendPill,
                monthTrend < 0 ? styles.trendPillNegative : monthTrend === 0 ? styles.trendPillNeutral : null,
              ]}
            >
              <Text
                style={[
                  styles.trendText,
                  monthTrend < 0 ? styles.trendTextNegative : monthTrend === 0 ? styles.trendTextNeutral : null,
                ]}
              >
                {formatTrendPercent(monthTrend)}
              </Text>
              <Text style={styles.trendSubText}>vs last month</Text>
            </View>
            <View style={styles.sparkWrap}>
              <Svg width="100%" height="100%" viewBox="0 0 94 36" preserveAspectRatio="none">
                <Path d={buildSmoothPath(sparklineValues, 94, 36, 3)} stroke="#8e7cff" strokeWidth={2.2} fill="none" />
              </Svg>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, styles.incomeIconWrap]}>
              <Text style={styles.statIconText}>v</Text>
            </View>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValue}>{formatCurrency(incomeTotal)}</Text>
            <Text style={styles.statGrowthPositive}>+12%</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, styles.expenseIconWrap]}>
              <Text style={styles.statIconText}>^</Text>
            </View>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>{formatCurrency(expenseTotal)}</Text>
            <Text style={styles.statGrowthNegative}>-5%</Text>
          </View>
        </View>

        <View style={styles.recentHead}>
          <Text style={styles.recentTitle}>Recent Transactions</Text>
          <Text style={styles.seeAll}>See All</Text>
        </View>

        {recentTransactions.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyBody}>
              Add a transaction to see the dashboard summary update instantly.
            </Text>
          </View>
        ) : null}

        {recentTransactions.map(tx => (
          <Pressable
            key={tx.id}
            style={styles.transactionCard}
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate('TransactionDetail', { transaction: tx });
              }
            }}
          >
            <View style={styles.dotWrap}>
              <Text style={styles.dotIcon}>{tx.type === 'income' ? '↑' : '↓'}</Text>
            </View>
            <View style={styles.txTextWrap}>
              <Text style={styles.txTitle}>{formatCategoryLabel(tx.category)}</Text>
              <Text style={styles.txSub}>{formatTransactionDate(tx.date)}</Text>
            </View>
            <Text style={[styles.txAmount, tx.type === 'income' ? styles.incomeAmount : styles.expenseAmount]}>
              {formatSignedAmount(tx)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050507',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 118,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bellWrap: {
    marginTop: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2b2d35',
    backgroundColor: '#171920',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellText: {
    color: '#ff5f7a',
    fontSize: 12,
    fontWeight: '700',
  },
  smallMuted: {
    color: '#8a90c6',
    fontSize: 12,
    marginBottom: 3,
  },
  greeting: {
    color: '#f7f8ff',
    fontSize: 27,
    fontWeight: '700',
  },
  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2d3260',
    backgroundColor: '#1a1d4a',
    padding: 14,
    marginBottom: 11,
  },
  balanceFadeLeft: {
    position: 'absolute',
    left: -30,
    top: -32,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(116, 88, 255, 0.22)',
  },
  balanceFadeLeftSoft: {
    position: 'absolute',
    left: 44,
    top: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(116, 88, 255, 0.10)',
  },
  balanceFadeMiddle: {
    position: 'absolute',
    right: 86,
    top: -6,
    bottom: -6,
    width: 120,
    backgroundColor: 'rgba(55, 35, 136, 0.12)',
  },
  balanceFadeRight: {
    position: 'absolute',
    right: -18,
    top: -8,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(96, 116, 255, 0.14)',
  },
  balanceLabel: {
    color: '#c7cae4',
    fontSize: 12,
    marginBottom: 2,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 6,
  },
  negativeBalance: {
    color: '#ff7d9a',
  },
  loadingIndicator: {
    marginVertical: 12,
  },
  balanceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#124939',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendText: {
    color: '#30cf94',
    fontSize: 10,
    fontWeight: '700',
  },
  trendPillNegative: {
    backgroundColor: '#4a1f2f',
  },
  trendPillNeutral: {
    backgroundColor: '#2b3047',
  },
  trendTextNegative: {
    color: '#ff7d9a',
  },
  trendTextNeutral: {
    color: '#a7afd8',
  },
  trendSubText: {
    color: '#7c85b8',
    fontSize: 10,
    marginLeft: 6,
  },
  sparkWrap: {
    width: 94,
    height: 36,
    position: 'relative',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    width: '48.6%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262932',
    backgroundColor: '#11131a',
    padding: 12,
  },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  incomeIconWrap: {
    backgroundColor: '#30333b',
  },
  expenseIconWrap: {
    backgroundColor: '#30333b',
  },
  statIconText: {
    color: '#b6bdcf',
    fontSize: 11,
    fontWeight: '700',
  },
  statLabel: {
    color: '#8c93c8',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#f5f7ff',
    fontWeight: '700',
    fontSize: 33,
    marginBottom: 3,
  },
  statGrowthPositive: {
    color: '#1dc98b',
    fontWeight: '700',
    fontSize: 10,
  },
  statGrowthNegative: {
    color: '#ff6e95',
    fontWeight: '700',
    fontSize: 10,
  },
  recentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    color: '#f4f5ff',
    fontSize: 27,
    fontWeight: '700',
  },
  seeAll: {
    color: '#7357ff',
    fontSize: 13,
    fontWeight: '600',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#23262f',
    backgroundColor: '#101219',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
  },
  dotWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2f333d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dotIcon: {
    color: '#cad1e3',
    fontWeight: '700',
  },
  txTextWrap: {
    flex: 1,
  },
  txTitle: {
    color: '#f4f6ff',
    fontSize: 14,
    fontWeight: '600',
  },
  txSub: {
    color: '#7f85bf',
    fontSize: 10,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  incomeAmount: {
    color: '#1bcd8d',
  },
  expenseAmount: {
    color: '#f5f6ff',
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2d6d',
    backgroundColor: '#111333',
    padding: 16,
    marginBottom: 9,
  },
  emptyTitle: {
    color: '#f4f5ff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyBody: {
    color: '#8a90c8',
    fontSize: 12,
    lineHeight: 17,
  },
});
