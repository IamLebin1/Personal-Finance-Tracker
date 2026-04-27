import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator, 
  Animated, 
  Pressable, 
  Dimensions, 
  StatusBar,
  InteractionManager
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { 
  getSpendingByCategory, 
  getSpendingByDate, 
  getWeeklySpending, 
  formatCurrency, 
  formatTrendPercent,
  getMonthlySpendingTrendPercent,
  type CategorySpending, 
  type DaySpending 
} from '../services/transactionService';
import { getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import type { Transaction } from '../types/transaction';
import { useCurrency } from '../services/useCurrency';

const { width } = Dimensions.get('window');
const CATEGORY_COLORS = ['#8a6eff', '#5d3fd3', '#20ce8f', '#ff4d6d', '#ffb359', '#00d4aa', '#ff6b9d', '#a78bfa'];

export default function Analytics() {
  const { code, usdToMyrRate } = useCurrency();
  const [weeklySpending, setWeeklySpending] = useState<number>(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [daySpending, setDaySpending] = useState<DaySpending[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const hasLoadedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadAnalytics = useCallback(() => {
    let isMounted = true;
    const task = InteractionManager.runAfterInteractions(async () => {
      const isInitialLoad = !hasLoadedRef.current;

      if (!isInitialLoad && isMounted) {
        setIsMonthLoading(true);
      }

      try {
        const userId = getAuthSession()?.userId || '';
        if (!userId) return;

        const [weekly, categories, dayData, transactions, trend] = await Promise.all([
          getWeeklySpending(userId),
          getSpendingByCategory(userId),
          getSpendingByDate(userId, currentMonth),
          getTransactionsByUser(userId),
          getMonthlySpendingTrendPercent(userId, currentMonth),
        ]);
        
        if (!isMounted) return;
        setWeeklySpending(weekly);
        setCategorySpending(categories);
        setDaySpending(dayData);
        setRecentTransactions(transactions.slice(0, 5));
        setSpendingTrend(trend);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        if (isMounted) {
          if (isInitialLoad) {
            hasLoadedRef.current = true;
            setIsLoading(false);
          }
          setIsMonthLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      task.cancel();
    };
  }, [currentMonth]);

  useFocusEffect(loadAnalytics);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading, fadeAnim, slideAnim]);

  const totalMonthlySpending = categorySpending.reduce((sum, cat) => sum + cat.amount, 0);
  const monthTitle = useMemo(
    () => currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth],
  );

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const dayMap = new Map(daySpending.map(d => [d.day, d]));
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const cells = [];

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
      const day = cellIndex - firstDay + 1;

      if (day < 1 || day > daysInMonth) {
        cells.push(
          <View key={`empty-${cellIndex}`} style={[styles.calendarDay, styles.calendarDayEmpty]} />,
        );
        continue;
      }

      const stats = dayMap.get(day);
      const net = stats ? stats.income - stats.expense : 0;
      const netInDisplayCurrency = code === 'MYR' ? net * usdToMyrRate : net;
      const hasActivity = !!stats && (stats.income > 0 || stats.expense > 0);

      cells.push(
        <View
          key={day}
          style={[
            styles.calendarDay,
            hasActivity && (net >= 0 ? styles.daySurplus : styles.dayExpense),
          ]}
        >
          <Text style={[styles.dayNumber, hasActivity && styles.dayNumberActive]}>{day}</Text>
          {hasActivity && (
            <Text style={[styles.dayAmount, { color: net >= 0 ? '#20ce8f' : '#ff4d6d' }]} numberOfLines={1}>
              {netInDisplayCurrency >= 0
                ? `+${Math.round(netInDisplayCurrency)}`
                : `-${Math.round(Math.abs(netInDisplayCurrency))}`}
            </Text>
          )}
        </View>,
      );
    }

    return cells;
  }, [currentMonth, daySpending, code, usdToMyrRate]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const renderCurveGraph = () => {
    if (daySpending.length < 2) return null;
    
    const h = 60;
    const w = width - 40;
    const maxVal = Math.max(...daySpending.map(d => d.expense), 10);
    
    // Reverse data so newest (highest day number) is on the left
    const reversedData = [...daySpending].sort((a, b) => b.day - a.day);

    const points = reversedData.map((d, i) => ({
      x: (i / (reversedData.length - 1)) * w,
      y: h - (d.expense / maxVal) * h
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      d += ` C ${cp1x} ${p0.y}, ${cp1x} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const fillD = `${d} L ${points[points.length-1].x} ${h} L ${points[0].x} ${h} Z`;

    return (
      <View style={styles.graphOverlay}>
        <Svg height={h} width={w} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#8a6eff" stopOpacity={0.4} />
              <Stop offset="100%" stopColor="#8a6eff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={fillD} fill="url(#areaGrad)" />
          <Path d={d} fill="none" stroke="#8a6eff" strokeWidth={3} />
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Insights</Text>
        <Text style={styles.headerSubtitle}>Analyze your wealth performance</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#8a6eff" size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* 1. Monthly Overview Card */}
            <View style={styles.insightCard}>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#1A1F46" stopOpacity={1} />
                    <Stop offset="55%" stopColor="#111633" stopOpacity={1} />
                    <Stop offset="100%" stopColor="#0B0F22" stopOpacity={1} />
                  </LinearGradient>
                </Defs>
              </Svg>
              
              <View style={styles.cardHeader}>
                <View style={styles.cardLabelRow}>
                  <Text style={styles.cardLabel}>Monthly Spending</Text>
                  <View style={[styles.trendBadge, spendingTrend < 0 ? styles.trendBadgePos : styles.trendBadgeNeg]}>
                    <Text style={[styles.trendText, spendingTrend < 0 ? styles.trendTextPos : styles.trendTextNeg]}>
                      {spendingTrend <= 0 ? '↘' : '↗'} {formatTrendPercent(Math.abs(spendingTrend))}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(totalMonthlySpending)}</Text>
              </View>

              {renderCurveGraph()}
            </View>

            {/* 2. Calendar View */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Activity</Text>
              <View style={styles.monthControls}>
                <Pressable style={styles.monthButton} onPress={goToPreviousMonth} disabled={isMonthLoading}>
                  <Text style={styles.monthButtonText}>{'<'}</Text>
                </Pressable>
                <Text style={styles.monthName}>{monthTitle}</Text>
                <Pressable style={styles.monthButton} onPress={goToNextMonth} disabled={isMonthLoading}>
                  <Text style={styles.monthButtonText}>{'>'}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.calendarContainer}>
              <View style={styles.weekdays}>
                {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={styles.weekday}>{d}</Text>)}
              </View>
              <View style={styles.calendarGrid}>{calendarCells}</View>
              {isMonthLoading ? (
                <View style={styles.calendarLoadingOverlay}>
                  <ActivityIndicator color="#8a6eff" size="small" />
                </View>
              ) : null}
            </View>

            {/* 3. Category Breakdown */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category Distribution</Text>
            </View>
            <View style={styles.categoriesBox}>
              {categorySpending.map((cat, i) => (
                <View key={cat.category} style={styles.catItem}>
                  <View style={[styles.catColor, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                  <Text style={styles.catName}>{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</Text>
                  <Text style={styles.catPercent}>{cat.percentage.toFixed(0)}%</Text>
                  <Text style={styles.catAmount}>{formatCurrency(cat.amount)}</Text>
                </View>
              ))}
            </View>

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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightCard: {
    height: 180,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#232859',
    backgroundColor: '#111633',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeader: {
    justifyContent: 'center',
    zIndex: 2,
  },
  cardLabel: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendBadgePos: {
    backgroundColor: 'rgba(32, 206, 143, 0.15)',
  },
  trendBadgeNeg: {
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  trendTextPos: {
    color: '#20ce8f',
  },
  trendTextNeg: {
    color: '#ff4d6d',
  },
  cardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 6,
  },
  chartBar: {
    width: 12,
    borderRadius: 6,
    minHeight: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '800',
  },
  monthName: {
    color: '#8a6eff',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#232859',
    borderWidth: 1,
    borderColor: '#2f366f',
  },
  monthButtonText: {
    color: '#d0d5ff',
    fontSize: 14,
    fontWeight: '800',
  },
  calendarContainer: {
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#232859',
    position: 'relative',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  weekday: {
    color: '#636781',
    fontSize: 11,
    fontWeight: '800',
    width: '14.285%',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.285%',
    minHeight: 42,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  daySurplus: {
    backgroundColor: 'rgba(32, 206, 143, 0.1)',
  },
  dayExpense: {
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
  },
  calendarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 8, 23, 0.28)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    color: '#8a90c6',
    fontSize: 13,
    fontWeight: '600',
  },
  dayNumberActive: {
    color: '#fff',
  },
  dayAmount: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  graphOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.9,
  },
  curveContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  categoriesBox: {
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232859',
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232859',
  },
  catColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  catName: {
    flex: 1,
    color: '#f4f6ff',
    fontSize: 14,
    fontWeight: '700',
  },
  catPercent: {
    color: '#8a90c6',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  catAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
