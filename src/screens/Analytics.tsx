import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/types';
import { loadSession } from '../utils/session';
import type { TransactionRecord } from '../types/transactions';
import type { BudgetRecord } from '../types/budgets';
import { fetchBudgets, saveBudgetTarget } from '../services/budgets';

var config = require('../config/Config');

type Props = NativeStackScreenProps<MainTabParamList, 'Analytics'>;

type WeeklyPoint = {
  label: string;
  value: number;
  x: number;
  y: number;
};

type CategoryBucket = {
  category: string;
  spent: number;
  percentage: number;
  color: string;
};

const screenWidth = Dimensions.get('window').width;
const chartViewWidth = 350;
const chartViewHeight = 150;
const chartPadding = 18;
const chartColors = ['#251dc9', '#7c3aed', '#f43f5e', '#14b8a6'];
const categoryColors = {
  Food: '#251dc9',
  Housing: '#7c3aed',
  Entertainment: '#f43f5e',
  Other: '#14b8a6',
} as const;
const editableCategories = ['Food', 'Housing', 'Entertainment'];

const getMondayOffset = (date: Date) => {
  const currentDay = date.getDay();
  return currentDay === 0 ? 6 : currentDay - 1;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseTransactionDate = (value: string) => {
  const normalized = String(value || '').trim();
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const mapApiTransaction = (row: any): TransactionRecord => {
  return {
    id: String(row.id),
    userId: String(row.userId ?? ''),
    amount: Number(row.amount ?? 0),
    category: String(row.category ?? 'Other'),
    note: String(row.note ?? ''),
    type: row.type === 'income' ? 'income' : 'expense',
    occurredOn: String(row.occurredOn ?? new Date().toISOString().slice(0, 10)),
    createdAt: 0,
    updatedAt: 0,
  };
};

const aggregateWeeklyTotals = (transactions: TransactionRecord[]) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - getMondayOffset(today));

  const points: WeeklyPoint[] = [];

  for (let index = 0; index < 7; index += 1) {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + index);
    const key = toDateKey(cursor);
    const label = cursor.toLocaleDateString('en-US', { weekday: 'short' });

    const dayTotal = transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'expense') {
        return sum;
      }

      const transactionDate = parseTransactionDate(transaction.occurredOn);
      if (!transactionDate) {
        return sum;
      }

      if (toDateKey(transactionDate) !== key) {
        return sum;
      }

      return sum + Number(transaction.amount || 0);
    }, 0);

    points.push({ label, value: dayTotal, x: 0, y: 0 });
  }

  const maxValue = Math.max(...points.map(point => point.value), 1);
  const usableWidth = chartViewWidth - chartPadding * 2;
  const usableHeight = chartViewHeight - chartPadding * 2;

  return points.map((point, index) => {
    const x = chartPadding + (usableWidth / 6) * index;
    const normalized = point.value / maxValue;
    const y = chartViewHeight - chartPadding - normalized * usableHeight;

    return {
      ...point,
      x,
      y,
    };
  });
};

const aggregateSpendingByCategory = (transactions: TransactionRecord[]): CategoryBucket[] => {
  const bucketTotals: Record<string, number> = {
    Food: 0,
    Housing: 0,
    Entertainment: 0,
    Other: 0,
  };

  transactions.forEach(transaction => {
    if (transaction.type !== 'expense') {
      return;
    }

    const category = String(transaction.category || 'Other');
    const normalizedCategory = editableCategories.includes(category) ? category : 'Other';
    bucketTotals[normalizedCategory] = bucketTotals[normalizedCategory] + Number(transaction.amount || 0);
  });

  const total = Object.values(bucketTotals).reduce((sum, value) => sum + value, 0) || 1;

  return Object.keys(bucketTotals)
    .map(category => ({
      category,
      spent: bucketTotals[category],
      percentage: (bucketTotals[category] / total) * 100,
      color: categoryColors[category as keyof typeof categoryColors],
    }))
    .filter(item => item.spent > 0 || item.category !== 'Other')
    .sort((left, right) => right.spent - left.spent);
};

const buildLinePath = (points: WeeklyPoint[]) => {
  if (points.length === 0) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
};

const buildAreaPath = (points: WeeklyPoint[]) => {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildLinePath(points);
  const start = points[0];
  const end = points[points.length - 1];
  return `${linePath} L ${end.x} ${chartViewHeight - chartPadding} L ${start.x} ${chartViewHeight - chartPadding} Z`;
};

const formatMoney = (value: number) => `RM ${value.toFixed(2)}`;

const AnalyticsScreen = ({ navigation }: Props) => {
  const [currentUserId, setCurrentUserId] = useState('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [targetInput, setTargetInput] = useState('450');
  const [loading, setLoading] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const weeklyPoints = useMemo(() => aggregateWeeklyTotals(transactions), [transactions]);
  const linePath = useMemo(() => buildLinePath(weeklyPoints), [weeklyPoints]);
  const areaPath = useMemo(() => buildAreaPath(weeklyPoints), [weeklyPoints]);
  const weeklyTotal = useMemo(() => weeklyPoints.reduce((sum, point) => sum + point.value, 0), [weeklyPoints]);

  const previousWeekTotal = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(today.getDate() - getMondayOffset(today));

    const startOfPreviousWeek = new Date(startOfThisWeek);
    startOfPreviousWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfPreviousWeek = new Date(startOfThisWeek);
    endOfPreviousWeek.setDate(startOfThisWeek.getDate() - 1);

    return transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'expense') {
        return sum;
      }

      const parsed = parseTransactionDate(transaction.occurredOn);
      if (!parsed) {
        return sum;
      }

      if (parsed >= startOfPreviousWeek && parsed <= endOfPreviousWeek) {
        return sum + Number(transaction.amount || 0);
      }

      return sum;
    }, 0);
  }, [transactions]);

  const weeklyTrendPct = useMemo(() => {
    if (previousWeekTotal <= 0) {
      return weeklyTotal > 0 ? 100 : 0;
    }

    return ((weeklyTotal - previousWeekTotal) / previousWeekTotal) * 100;
  }, [previousWeekTotal, weeklyTotal]);

  const categoryBuckets = useMemo(() => aggregateSpendingByCategory(transactions), [transactions]);
  const selectedBudget = useMemo(
    () => budgets.find(item => item.category === selectedCategory),
    [budgets, selectedCategory],
  );

  const selectedCategorySpent = useMemo(() => {
    const match = categoryBuckets.find(item => item.category === selectedCategory);
    return match ? match.spent : 0;
  }, [categoryBuckets, selectedCategory]);

  const totalCategorySpent = useMemo(
    () => categoryBuckets.reduce((sum, item) => sum + item.spent, 0),
    [categoryBuckets],
  );

  const refreshAll = (userId: string) => {
    if (!userId) {
      setTransactions([]);
      setBudgets([]);
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);

    return Promise.all([
      fetch(config.settings.serverPath + '/api/transactions?userId=' + encodeURIComponent(userId)).then(response => response.json()),
      fetchBudgets(userId),
    ])
      .then(results => {
        const transactionPayload = Array.isArray(results[0]) ? results[0] : [];
        const budgetPayload = Array.isArray(results[1]) ? results[1] : [];

        setTransactions(transactionPayload.map(mapApiTransaction));
        setBudgets(budgetPayload);

        const initialBudget = budgetPayload.find(item => item.category === selectedCategory) ?? budgetPayload[0];
        if (initialBudget) {
          setSelectedCategory(initialBudget.category);
          setTargetInput(String(initialBudget.target));
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to load analytics data.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSession()
      .then(session => {
        setCurrentUserId(session.currentUserId);
        return refreshAll(session.currentUserId);
      })
      .catch(() => {
        setCurrentUserId('');
      });
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      setTargetInput(String(selectedBudget.target));
    }
  }, [selectedBudget]);

  const _selectCategory = (category: string) => {
    setSelectedCategory(category);
    const matchingBudget = budgets.find(item => item.category === category);
    setTargetInput(String(matchingBudget ? matchingBudget.target : 0));
  };

  const _edit = () => {
    const matchingBudget = budgets.find(item => item.category === selectedCategory);

    if (!matchingBudget) {
      Alert.alert('Missing budget', 'No budget target exists for this category yet.');
      return;
    }

    const parsedTarget = Number(targetInput);
    if (Number.isNaN(parsedTarget) || parsedTarget < 0) {
      Alert.alert('Invalid target', 'Enter a valid budget target.');
      return;
    }

    setSavingBudget(true);

    saveBudgetTarget(matchingBudget.id, {
      category: selectedCategory,
      target: parsedTarget,
    })
      .then(() => {
        Alert.alert('Success', 'Budget target updated successfully.');
        return refreshAll(currentUserId);
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to update the budget target.');
      })
      .finally(() => {
        setSavingBudget(false);
      });
  };

  const totalSegments = Math.max(categoryBuckets.reduce((sum, item) => sum + item.spent, 0), 1);
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let runningOffset = 0;
  const donutSegments = categoryBuckets.map(item => {
    const segmentLength = (item.spent / totalSegments) * donutCircumference;
    const segment = {
      ...item,
      segmentLength,
      strokeOffset: donutCircumference - runningOffset,
    };
    runningOffset += segmentLength;
    return segment;
  });

  const activePoint = weeklyPoints.reduce((best, point) => (point.value >= best.value ? point : best), weeklyPoints[0] ?? { label: '', value: 0, x: 0, y: 0 });
  const trendPositive = weeklyTrendPct >= 0;
  const overspendItem = categoryBuckets.reduce((best, item) => {
    const budget = budgets.find(entry => entry.category === item.category);
    if (!budget) {
      return best;
    }

    const overspend = item.spent - Number(budget.target || 0);
    if (overspend <= 0) {
      return best;
    }

    if (!best || overspend > best.overspend) {
      return {
        category: item.category,
        overspend,
      };
    }

    return best;
  }, null as null | { category: string; overspend: number });

  const navItems = [
    {
      label: 'Home',
      icon: 'home',
      activeIcon: 'home',
      action: () => navigation.navigate('TransactionsStack' as never),
    },
    {
      label: 'History',
      icon: 'time-outline',
      activeIcon: 'time',
      action: () => navigation.navigate('TransactionsStack' as never),
    },
    {
      label: '',
      icon: 'add',
      activeIcon: 'add',
      action: () => navigation.navigate('AddTransaction' as never),
      fab: true,
    },
    {
      label: 'Analytics',
      icon: 'analytics-outline',
      activeIcon: 'analytics',
      action: () => {},
      active: true,
    },
    {
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
      action: () => navigation.navigate('Accounts' as never),
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backgroundWrap}>
        <View style={styles.backgroundOrbOne} />
        <View style={styles.backgroundOrbTwo} />
      </View>

      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => navigation.navigate('TransactionsStack' as never)}>
            <Ionicons name="arrow-back-ios-new" size={18} color="#A5B4FC" />
          </Pressable>
          <Text style={styles.headerTitle}>Financial Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.glassCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardKicker}>Weekly Spending</Text>
                <View style={styles.totalRow}>
                  <Svg width={220} height={40} viewBox="0 0 220 40">
                    <Defs>
                      <LinearGradient id="totalGradient" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#a5b4fc" stopOpacity="1" />
                      </LinearGradient>
                    </Defs>
                    <SvgText x="0" y="28" fill="url(#totalGradient)" fontSize="28" fontWeight="700">
                      {formatMoney(weeklyTotal)}
                    </SvgText>
                  </Svg>
                </View>
              </View>
              <View style={styles.trendBlock}>
                <View style={[styles.trendPill, trendPositive ? styles.trendPillPositive : styles.trendPillNegative]}>
                  <Ionicons
                    name={trendPositive ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={trendPositive ? '#4ade80' : '#f87171'}
                  />
                  <Text style={[styles.trendValue, trendPositive ? styles.trendValuePositive : styles.trendValueNegative]}>
                    {(trendPositive ? '+' : '') + weeklyTrendPct.toFixed(0)}%
                  </Text>
                </View>
                <Text style={styles.trendCaption}>vs last week</Text>
              </View>
            </View>

            <View style={styles.chartWrap}>
              <Svg width={screenWidth - 40} height={chartViewHeight} viewBox={`0 0 ${chartViewWidth} ${chartViewHeight}`}>
                <Defs>
                  <LinearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#251dc9" stopOpacity="0.45" />
                    <Stop offset="100%" stopColor="#251dc9" stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                <Line x1="0" y1="132" x2={chartViewWidth} y2="132" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <Line x1="0" y1="90" x2={chartViewWidth} y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <Line x1="0" y1="48" x2={chartViewWidth} y2="48" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {areaPath ? <Path d={areaPath} fill="url(#weeklyFill)" /> : null}
                {linePath ? <Path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}

                {weeklyPoints.map((point, index) => (
                  <Circle
                    key={point.label}
                    cx={point.x}
                    cy={point.y}
                    r={index === weeklyPoints.length - 1 ? 5 : 4}
                    fill={index === weeklyPoints.length - 1 ? '#ffffff' : '#131221'}
                    stroke="#7c3aed"
                    strokeWidth={index === weeklyPoints.length - 1 ? 3 : 2}
                  />
                ))}

                {activePoint ? (
                  <G transform={`translate(${activePoint.x}, ${Math.max(activePoint.y - 30, 10)})`}>
                    <Rect width="54" height="24" rx="6" fill="#7c3aed" x="-27" y="0" />
                    <SvgText x="0" y="16" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">
                      {formatMoney(activePoint.value)}
                    </SvgText>
                    <Path d="M 0 24 L -4 28 L 4 28 Z" fill="#7c3aed" />
                  </G>
                ) : null}
              </Svg>
            </View>

            <View style={styles.weekLabelsRow}>
              {weeklyPoints.map(point => (
                <Text
                  key={point.label}
                  style={[
                    styles.weekLabel,
                    point.label === activePoint.label && styles.weekLabelActive,
                  ]}>
                  {point.label}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.categoryHeaderRow}>
              <View>
                <Text style={styles.cardKicker}>Category Distribution</Text>
                <Text style={styles.categorySubtext}>Tap a category to update its budget target.</Text>
              </View>
              <Pressable style={styles.rangeButton}>
                <Text style={styles.rangeButtonText}>Monthly</Text>
                <Ionicons name="chevron-down" size={14} color="#A5B4FC" />
              </Pressable>
            </View>

            <View style={styles.donutLayout}>
              <View style={styles.donutWrap}>
                <Svg width={160} height={160} viewBox="0 0 100 100" style={styles.donutSvg}>
                  <Circle cx="50" cy="50" r={donutRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />

                  {donutSegments.map((segment, index) => (
                    <Circle
                      key={segment.category}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${segment.segmentLength} ${donutCircumference}`}
                      strokeDashoffset={segment.strokeOffset}
                      transform="rotate(-90 50 50)"
                      opacity={index === 0 ? 1 : 0.95}
                    />
                  ))}
                </Svg>

                <View style={styles.donutCenterText}>
                  <Text style={styles.donutLabel}>Total</Text>
                  <Text style={styles.donutTotal}>{formatMoney(totalCategorySpent)}</Text>
                </View>
              </View>

              <View style={styles.legendWrap}>
                {categoryBuckets.map(bucket => {
                  const budget = budgets.find(item => item.category === bucket.category);
                  const target = budget ? budget.target : 0;
                  const overspendPct = target > 0 ? Math.min((bucket.spent / target) * 100, 999) : 0;
                  const isSelected = selectedCategory === bucket.category;

                  return (
                    <Pressable
                      key={bucket.category}
                      style={[styles.legendItem, isSelected && styles.legendItemActive]}
                      onPress={() => _selectCategory(bucket.category)}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: bucket.color }]} />
                        <View>
                          <Text style={styles.legendTitle}>{bucket.category}</Text>
                          <Text style={styles.legendMeta}>
                            {formatMoney(bucket.spent)} {target > 0 ? `• Target ${formatMoney(target)}` : ''}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.legendPercent}>{bucket.percentage.toFixed(0)}%</Text>
                      <View style={styles.legendBarTrack}>
                        <View
                          style={[
                            styles.legendBarFill,
                            { width: `${Math.min(overspendPct, 100)}%`, backgroundColor: bucket.color },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.targetEditor}>
              <View style={styles.targetEditorHeader}>
                <View>
                  <Text style={styles.targetEditorLabel}>Budget Target</Text>
                  <Text style={styles.targetEditorTitle}>{selectedCategory}</Text>
                </View>
                <Ionicons name="cash-outline" size={18} color="#A5B4FC" />
              </View>

              <TextInput
                style={styles.targetInput}
                value={targetInput}
                onChangeText={setTargetInput}
                keyboardType="decimal-pad"
                placeholder="Enter budget target"
                placeholderTextColor="#64748B"
              />

              <Pressable
                style={[styles.updateButton, savingBudget && styles.buttonDisabled]}
                onPress={_edit}
                disabled={savingBudget}>
                <Text style={styles.updateButtonText}>{savingBudget ? 'Saving...' : 'Update Target'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIconWrap}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
            </View>
            <View style={styles.insightTextWrap}>
              <Text style={styles.insightTitle}>Spending Alert</Text>
              <Text style={styles.insightText}>
                {overspendItem
                  ? `You've exceeded your ${overspendItem.category.toLowerCase()} budget by ${formatMoney(overspendItem.overspend)}.`
                  : loading
                    ? 'Loading your current analytics snapshot...'
                    : 'Your weekly spending is within the current budget targets.'}
              </Text>
            </View>
            <Pressable style={styles.insightButton} onPress={() => _selectCategory(overspendItem ? overspendItem.category : 'Food')}>
              <Text style={styles.insightButtonText}>Details</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <View style={styles.bottomNavWrap} pointerEvents="box-none">
        <View style={styles.bottomNav}>
          {navItems.map(item => {
            if (item.fab) {
              return (
                <View key="fab" style={styles.fabSlot}>
                  <Pressable style={styles.fabButton} onPress={item.action}>
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            }

            const active = item.active;

            return (
              <Pressable key={item.label} style={styles.tabItem} onPress={item.action}>
                <Ionicons
                  name={(active ? item.activeIcon : item.icon) as any}
                  size={24}
                  color={active ? '#A78BFA' : '#64748B'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                {active ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#131221',
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
    backgroundColor: 'rgba(37,29,201,0.20)',
    opacity: 0.9,
  },
  backgroundOrbTwo: {
    position: 'absolute',
    bottom: '8%',
    right: -30,
    width: '42%',
    height: '25%',
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19,18,33,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    flex: 1,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 132,
    gap: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(30, 27, 55, 0.4)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardKicker: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalRow: {
    marginTop: 2,
  },
  trendBlock: {
    alignItems: 'flex-end',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendPillPositive: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.20)',
  },
  trendPillNegative: {
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.20)',
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  trendValuePositive: {
    color: '#4ADE80',
  },
  trendValueNegative: {
    color: '#F87171',
  },
  trendCaption: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
  },
  chartWrap: {
    marginTop: 10,
    overflow: 'visible',
  },
  weekLabelsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  weekLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  weekLabelActive: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(37,29,201,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: -2,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  categorySubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  rangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rangeButtonText: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
  },
  donutLayout: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  donutWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSvg: {
    position: 'absolute',
  },
  donutCenterText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  donutTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  legendWrap: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    borderRadius: 16,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  legendItemActive: {
    borderColor: 'rgba(167,139,250,0.35)',
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  legendMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  legendPercent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  legendBarTrack: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  legendBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  targetEditor: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  targetEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  targetEditorLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  targetEditorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  targetInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  updateButton: {
    marginTop: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  insightCard: {
    backgroundColor: 'rgba(30, 27, 55, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  insightText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  insightButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  insightButtonText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(19,18,33,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#A78BFA',
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
    marginTop: 2,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#251dc9',
    borderWidth: 4,
    borderColor: '#131221',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
});

export default AnalyticsScreen;
