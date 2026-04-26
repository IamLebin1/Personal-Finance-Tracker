import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSpendingByCategory, getSpendingByDate, getWeeklySpending, formatCurrency, type CategorySpending, type DaySpending } from '../services/transactionService';
import { getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import type { Transaction } from '../types/transaction';

const CATEGORY_COLORS = ['#3554ff', '#7849ff', '#ff4a7f', '#ffb359', '#00d4aa', '#ff6b9d', '#a78bfa', '#60a5fa'];

export default function Analytics() {
  const [weeklySpending, setWeeklySpending] = useState<number>(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [daySpending, setDaySpending] = useState<DaySpending[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getAuthSession()?.userId || '';
      if (!userId) {
        setWeeklySpending(0);
        setCategorySpending([]);
        setDaySpending([]);
        setRecentTransactions([]);
        return;
      }

      const [weekly, categories, dayData, transactions] = await Promise.all([
        getWeeklySpending(userId),
        getSpendingByCategory(userId),
        getSpendingByDate(userId, currentMonth),
        getTransactionsByUser(userId),
      ]);
      
      setWeeklySpending(weekly);
      setCategorySpending(categories);
      setDaySpending(dayData);
      setRecentTransactions(transactions.slice(0, 10));
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics])
  );

  const getCategoryColor = (index: number): string => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

  const totalMonthlySpending = categorySpending.reduce((sum, cat) => sum + cat.amount, 0);
  const lastWeekSpending = weeklySpending;
  const weekTrend = lastWeekSpending > 0 ? '+12%' : '0%';

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const dayMap = new Map(daySpending.map(d => [d.day, d]));
    
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const stats = dayMap.get(day);
      const isSurplus = stats && stats.income > stats.expense;
      const isExpense = stats && stats.expense > stats.income;
      const hasActivity = isSurplus || isExpense;
      
      days.push(
        <View 
          key={day} 
          style={[
            styles.calendarDay, 
            isSurplus && styles.calendarDaySurplus,
            isExpense && styles.calendarDayExpense
          ]}
        >
          <Text style={[styles.calendarDayNumber, hasActivity && styles.calendarDayNumberActive]}>
            {day}
          </Text>
          {hasActivity && (
            <Text style={styles.calendarDayAmount}>
              {formatCurrency(isSurplus ? (stats?.income || 0) - (stats?.expense || 0) : (stats?.expense || 0)).replace('$', '')}
            </Text>
          )}
        </View>
      );
    }
    
    return days;
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Financial Analytics</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#815fff" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 1. Trend Chart Section */}
            <View style={styles.weekCard}>
              <Text style={styles.cardSub}>Transaction Trend</Text>
              <Text style={styles.weekValue}>{formatCurrency(lastWeekSpending)}</Text>
              <Text style={styles.trend}>{weekTrend} vs last week</Text>

              <View style={styles.fakeChart}>
                <View style={[styles.trendLine, { height: 2, backgroundColor: '#815fff', width: '100%', top: 35, opacity: 0.3 }]} />
                <View style={[styles.point, { left: '5%', top: 40 }]} />
                <View style={[styles.point, { left: '20%', top: 25 }]} />
                <View style={[styles.point, { left: '40%', top: 45 }]} />
                <View style={[styles.point, { left: '60%', top: 15 }]} />
                <View style={[styles.point, { left: '80%', top: 30 }]} />
                <View style={[styles.point, { left: '95%', top: 20 }]} />
              </View>
            </View>

            {/* 2. Calendar Section */}
            <View style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.weekdaysRow}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <Text key={day} style={styles.weekdayLabel}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {renderCalendarDays()}
              </View>
              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#20ce8f' }]} />
                  <Text style={styles.legendText}>Surplus</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff5a4a' }]} />
                  <Text style={styles.legendText}>Expense</Text>
                </View>
              </View>
            </View>

            {/* 3. Transaction List Section */}
            <View style={styles.categoriesCard}>
              <Text style={styles.categoriesTitle}>Recent Transactions</Text>
              
              {recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.categoryItem}>
                  <View style={[styles.categoryIcon, { backgroundColor: tx.type === 'income' ? '#20ce8f20' : '#ff5a4a20' }]}>
                    <Text style={[styles.categoryIconText, { color: tx.type === 'income' ? '#20ce8f' : '#ff5a4a' }]}>
                      {tx.category.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{tx.category}</Text>
                    <Text style={styles.categoryPercent}>
                      {new Date(tx.date).toLocaleDateString()} • {tx.note || 'No note'}
                    </Text>
                  </View>
                  <Text style={[styles.categoryAmount, { color: tx.type === 'income' ? '#20ce8f' : '#ff5a4a' }]}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              ))}
              
              {recentTransactions.length === 0 && (
                <Text style={styles.emptyText}>No transactions found for this period.</Text>
              )}
            </View>

            <View style={[styles.breakdownCard, { marginTop: 12 }]}>
              <Text style={styles.breakdownTitle}>Category Distribution</Text>

              <View style={styles.ringWrap}>
                <View style={styles.ringOuter}>
                  <View style={styles.ringInner}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(totalMonthlySpending)}</Text>
                  </View>
                </View>
              </View>

              {categorySpending.slice(0, 3).map((category, index) => (
                <View key={category.category} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: getCategoryColor(index) }]} />
                  <Text style={styles.legendLabel}>{category.category}</Text>
                  <Text style={styles.legendPct}>{category.percentage.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 110,
  },
  header: {
    color: '#f5f7ff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  weekCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
    marginBottom: 12,
  },
  cardSub: {
    color: '#8f95ca',
    fontSize: 13,
  },
  weekValue: {
    color: '#f8f8ff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  trend: {
    color: '#20ce8f',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  fakeChart: {
    height: 70,
    borderRadius: 14,
    backgroundColor: '#0f1130',
    borderWidth: 1,
    borderColor: '#272a66',
    overflow: 'hidden',
  },
  trendLine: {
    position: 'absolute',
  },
  point: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#815fff',
  },
  breakdownCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
  },
  breakdownTitle: {
    color: '#f0f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  ringOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 10,
    borderColor: '#724eff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1d4b',
  },
  ringInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#121437',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#8790cf',
    fontSize: 12,
  },
  totalValue: {
    color: '#f4f6ff',
    fontSize: 20,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    color: '#d5d9ff',
    fontSize: 13,
  },
  legendPct: {
    color: '#dfe2ff',
    fontSize: 13,
    fontWeight: '600',
  },
  monthCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
    marginBottom: 12,
  },
  monthHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    color: '#f8f8ff',
    fontSize: 16,
    fontWeight: '600',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  weekdayLabel: {
    color: '#8f95ca',
    fontSize: 11,
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 4,
  },
  calendarDayExpense: {
    backgroundColor: '#ff5a4a',
  },
  calendarDaySurplus: {
    backgroundColor: '#20ce8f',
  },
  calendarDayNumber: {
    color: '#8f95ca',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDayNumberActive: {
    color: '#fff',
  },
  calendarDayAmount: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8f95ca',
    fontSize: 10,
  },
  categoriesCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
  },
  categoriesTitle: {
    color: '#f0f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  totalExpense: {
    color: '#ff5a4a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c306f',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#d5d9ff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPercent: {
    color: '#8f95ca',
    fontSize: 11,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8f95ca',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});


