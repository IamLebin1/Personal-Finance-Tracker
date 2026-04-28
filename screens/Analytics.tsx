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
  InteractionManager,
  Modal,
  Platform
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
import { getWallets } from '../services/walletApi';
import { getSelectedWalletId, setSelectedWalletId } from '../services/walletService';
import type { Transaction, Wallet } from '../types/transaction';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../services/useCurrency';

const { width } = Dimensions.get('window');
const CATEGORY_COLORS = ['#8a6eff', '#5d3fd3', '#20ce8f', '#ff4d6d', '#ffb359', '#00d4aa', '#ff6b9d', '#a78bfa'];

function Analytics() {
  const { colors, isDark } = useTheme();
  const { code, usdToMyrRate } = useCurrency();
  const [weeklySpending, setWeeklySpending] = useState<number>(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [daySpending, setDaySpending] = useState<DaySpending[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const hasLoadedRef = useRef(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadData = useCallback(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      const isInitialLoad = !hasLoadedRef.current;

      if (!isInitialLoad && isMounted) {
        setIsMonthLoading(true);
      }

      try {
        await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(null)));

        const userId = getAuthSession()?.userId || '';
        if (!userId) return;

        const fetchedWallets = await getWallets();
        const savedWalletId = await getSelectedWalletId();
        const isAllWallets = !savedWalletId || savedWalletId === 'all';
        const currentWallet = isAllWallets ? null : (fetchedWallets.find(w => String(w.id) === String(savedWalletId)) || null);
        
        if (!isMounted) return;
        setWallets(fetchedWallets);
        setSelectedWallet(currentWallet);

        const walletId = currentWallet?.id;

        const [weekly, categories, dayData, trend] = await Promise.all([
          getWeeklySpending(walletId),
          getSpendingByCategory(walletId),
          getSpendingByDate(walletId, currentMonth),
          getMonthlySpendingTrendPercent(walletId, currentMonth),
        ]);
        
        if (!isMounted) return;
        setWeeklySpending(weekly);
        setCategorySpending(categories);
        setDaySpending(dayData);
        setSpendingTrend(trend);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        if (isMounted) {
          if (isInitialLoad) {
            setIsLoading(false);
          }
          setIsMonthLoading(false);
        }
      }
    };

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentMonth]);

  useFocusEffect(loadData);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

  const handleSelectWallet = async (wallet: Wallet | null) => {
    const id = wallet ? String(wallet.id) : '';
    await setSelectedWalletId(id);
    setSelectedWallet(wallet);
    setIsWalletModalVisible(false);
    loadData();
  };

  const totalMonthlySpending = categorySpending.reduce((sum, cat) => sum + cat.amount, 0);

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const dayMap = new Map(daySpending.map(d => [d.day, d]));
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const days = [];

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
      const day = cellIndex - firstDay + 1;

      if (day < 1 || day > daysInMonth) {
        days.push(
          <View key={`empty-${cellIndex}`} style={[styles.calendarDay, styles.calendarDayEmpty]} />,
        );
        continue;
      }

      const stats = dayMap.get(day);
      const net = stats ? stats.income - stats.expense : 0;
      const hasActivity = !!stats && (stats.income > 0 || stats.expense > 0);
      
      days.push(
        <View key={day} style={[styles.calendarDay, hasActivity && { backgroundColor: net >= 0 ? colors.success + '15' : colors.danger + '15', borderRadius: 8 }]}>
          <Text style={[styles.dayNumber, { color: hasActivity ? colors.text : colors.textMuted }]}>{day}</Text>
          {hasActivity && (
            <Text style={[styles.dayAmount, { color: net >= 0 ? colors.success : colors.danger }]} numberOfLines={1}>
              {net >= 0 ? `+${Math.round(net)}` : `-${Math.round(Math.abs(net))}`}
            </Text>
          )}
        </View>,
      );
    }

    return days;
  }, [currentMonth, daySpending, colors.success, colors.danger, colors.text, colors.textMuted]);

  const renderCurveGraph = () => {
    if (daySpending.length < 2) return null;
    const h = 60;
    const w = width - 40;
    const maxVal = Math.max(...daySpending.map(d => d.expense), 10);
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
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={fillD} fill="url(#areaGrad)" />
          <Path d={d} fill="none" stroke={colors.primary} strokeWidth={3} />
        </Svg>
      </View>
    );
  };

  const renderPieChart = () => {
    if (categorySpending.length === 0) return null;

    const radius = 80;
    const strokeWidth = 30;
    const center = radius + strokeWidth / 2;
    const size = center * 2;
    const total = categorySpending.reduce((sum, cat) => sum + cat.amount, 0);
    
    let currentAngle = 0;

    return (
      <View style={styles.pieContainer}>
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
          {categorySpending.map((cat, i) => {
            const percentage = cat.percentage / 100;
            if (percentage <= 0) return null;
            
            // Handle 100% case
            if (percentage > 0.999) {
              return (
                <Circle
                  key={cat.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  strokeWidth={strokeWidth}
                />
              );
            }

            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle += angle;

            const x1 = center + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
            const y1 = center + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
            const x2 = center + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
            const y2 = center + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

            return (
              <Path
                key={cat.category}
                d={d}
                fill="none"
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <View style={styles.pieCenterLabel}>
          <Text style={[styles.pieTotalLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.pieTotalValue, { color: colors.text }]}>{formatCurrency(totalMonthlySpending)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          <Pressable 
            style={[styles.walletBadge, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]} 
            onPress={() => setIsWalletModalVisible(true)}
          >
            <Text style={[styles.walletBadgeText, { color: colors.primary }]}>{selectedWallet?.name || 'All Wallets'}</Text>
            <Text style={[styles.walletChevron, { color: colors.primary }]}>▼</Text>
          </Pressable>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Analyze your wealth performance</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={isDark ? "#1C1C3E" : "#ffffff"} stopOpacity="1" />
                      <Stop offset="100%" stopColor={isDark ? "#070817" : "#f0f2ff"} stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#grad)" />
                </Svg>
              </View>
              
              <View style={styles.cardHeader}>
                <View style={styles.cardLabelRow}>
                  <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Monthly Spending</Text>
                  <View style={[styles.trendBadge, spendingTrend < 0 ? { backgroundColor: colors.success + '20' } : { backgroundColor: colors.danger + '20' }]}>
                    <Text style={[styles.trendText, { color: spendingTrend < 0 ? colors.success : colors.danger }]}>
                      {spendingTrend <= 0 ? '↘' : '↗'} {formatTrendPercent(Math.abs(spendingTrend))}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardValue, { color: colors.text }]}>{formatCurrency(totalMonthlySpending)}</Text>
              </View>

              {renderCurveGraph()}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Activity</Text>
              <View style={styles.calendarNav}>
                <Pressable 
                  onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.navIcon, { color: colors.text }]}>‹</Text>
                </Pressable>
                <View style={styles.monthDisplay}>
                  <Text style={[styles.monthName, { color: colors.primary }]}>{currentMonth.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</Text>
                </View>
                <Pressable 
                  onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.navIcon, { color: colors.text }]}>›</Text>
                </Pressable>
              </View>
            </View>
            <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.weekdays}>
                {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={[styles.weekday, { color: colors.textMuted }]}>{d}</Text>)}
              </View>
              <View style={styles.calendarGrid}>{calendarCells}</View>
              {isMonthLoading ? (
                <View style={styles.calendarLoadingOverlay}>
                  <ActivityIndicator color="#8a6eff" size="small" />
                </View>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Distribution</Text>
            </View>
            <View style={[styles.categoriesBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {renderPieChart()}
              {categorySpending.map((cat, i) => (
                <View key={cat.category} style={[styles.catItem, { borderBottomColor: colors.cardBorder }]}>
                  <View style={[styles.catColor, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</Text>
                  <Text style={[styles.catPercent, { color: colors.textMuted }]}>{cat.percentage.toFixed(0)}%</Text>
                  <Text style={[styles.catAmount, { color: colors.text }]}>{formatCurrency(cat.amount)}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        </ScrollView>
      )}

      {/* Shared Wallet Modal */}
      <Modal visible={isWalletModalVisible} transparent animationType="slide" onRequestClose={() => setIsWalletModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsWalletModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Stats by Wallet</Text>
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  walletBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  walletBadgeText: { fontSize: 12, fontWeight: '700' },
  walletChevron: { fontSize: 10, marginLeft: 6 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  insightCard: { height: 180, borderRadius: 28, padding: 24, marginBottom: 32, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between' },
  cardHeader: { justifyContent: 'center', zIndex: 1 },
  cardLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trendText: { fontSize: 11, fontWeight: '800' },
  cardValue: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  calendarNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { fontSize: 20, fontWeight: '300', marginTop: -2 },
  monthDisplay: { minWidth: 80, alignItems: 'center' },
  monthName: { fontSize: 14, fontWeight: '700' },
  calendarContainer: { borderRadius: 28, padding: 12, marginBottom: 32, borderWidth: 1 },
  weekdays: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12 },
  weekday: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', opacity: 0.5 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dayNumber: { fontSize: 14, fontWeight: '600' },
  dayAmount: { fontSize: 8, fontWeight: '800', marginTop: 1 },
  graphOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  categoriesBox: { borderRadius: 24, padding: 16, borderWidth: 1 },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  catColor: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  catName: { flex: 1, fontSize: 14, fontWeight: '700' },
  catPercent: { fontSize: 12, fontWeight: '600', marginRight: 12 },
  catAmount: { fontSize: 14, fontWeight: '800' },
  pieContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 24, position: 'relative' },
  pieCenterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieTotalLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pieTotalValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
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

export default React.memo(Analytics);
