import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { insertTransaction } from '../services/transactionApi';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { getAuthSession } from '../services/authSession';

const categories = [
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'bills', label: 'Bills' },
  { key: 'health', label: 'Health' },
  { key: 'salary', label: 'Salary' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'groceries', label: 'Groceries' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

type KeypadVariant = 'number' | 'operator' | 'utility' | 'accent' | 'confirm' | 'danger';

type KeypadKey = {
  id: string;
  label: string;
  variant: KeypadVariant;
  action:
    | { type: 'input'; value: string }
    | { type: 'delete' }
    | { type: 'clear' }
    | { type: 'setType'; value: 'income' | 'expense' }
    | { type: 'openCalendar' }
    | { type: 'cycleCategory' }
    | { type: 'save' };
};

const transactionTypeTabs = [
  { value: 'expense', label: 'Expense', emoji: '👛' },
  { value: 'income', label: 'Income', emoji: '💰' },
] as const;

const keypadRows: KeypadKey[][] = [
  [
    { id: 'cat', label: 'CAT', variant: 'utility', action: { type: 'cycleCategory' } },
    { id: 'today', label: 'TODAY', variant: 'utility', action: { type: 'openCalendar' } },
    { id: 'quick-00', label: '+', variant: 'accent', action: { type: 'input', value: '00' } },
    { id: 'ok', label: 'OK', variant: 'confirm', action: { type: 'save' } },
  ],
  [
    { id: 'delete', label: 'x', variant: 'operator', action: { type: 'delete' } },
    { id: '7', label: '7', variant: 'number', action: { type: 'input', value: '7' } },
    { id: '8', label: '8', variant: 'number', action: { type: 'input', value: '8' } },
    { id: '9', label: '9', variant: 'number', action: { type: 'input', value: '9' } },
  ],
  [
    { id: 'clear-op', label: '/', variant: 'operator', action: { type: 'clear' } },
    { id: '4', label: '4', variant: 'number', action: { type: 'input', value: '4' } },
    { id: '5', label: '5', variant: 'number', action: { type: 'input', value: '5' } },
    { id: '6', label: '6', variant: 'number', action: { type: 'input', value: '6' } },
  ],
  [
    { id: 'expense', label: '-', variant: 'operator', action: { type: 'setType', value: 'expense' } },
    { id: '1', label: '1', variant: 'number', action: { type: 'input', value: '1' } },
    { id: '2', label: '2', variant: 'number', action: { type: 'input', value: '2' } },
    { id: '3', label: '3', variant: 'number', action: { type: 'input', value: '3' } },
  ],
  [
    { id: 'income', label: '+', variant: 'operator', action: { type: 'setType', value: 'income' } },
    { id: 'dot', label: '.', variant: 'number', action: { type: 'input', value: '0' } },
    { id: '0', label: '0', variant: 'number', action: { type: 'input', value: '0' } },
    { id: 'clear', label: 'X', variant: 'danger', action: { type: 'delete' } },
  ],
];

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatSafeAmount(digits: string): { display: string; value: number } {
  const normalized = digits.replace(/\D/g, '');

  if (!normalized) {
    return { display: '0.00', value: 0 };
  }

  const padded = normalized.padStart(3, '0');
  const display = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  const value = parseFloat(display);

  return { display, value };
}

export default function AddTransaction({ navigation, route }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.key ?? 'food');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const activePageIndex = transactionType === 'income' ? 1 : 0;

  const fromFab = Boolean(route.params?.fromFab);
  const windowSize = Dimensions.get('window');
  const originX = route.params?.originX ?? windowSize.width / 2;
  const originY = route.params?.originY ?? windowSize.height - 36;
  const baseRadius = 36;
  const maxDistanceToCorner = Math.max(
    Math.hypot(originX, originY),
    Math.hypot(windowSize.width - originX, originY),
    Math.hypot(originX, windowSize.height - originY),
    Math.hypot(windowSize.width - originX, windowSize.height - originY),
  );
  const spreadScaleTarget = Math.max(16, (maxDistanceToCorner + 16) / baseRadius);

  const burstScale = useRef(new Animated.Value(fromFab ? 1 : 16)).current;
  const burstOpacity = useRef(new Animated.Value(fromFab ? 0.92 : 0)).current;
  const contentOpacity = useRef(new Animated.Value(fromFab ? 0 : 1)).current;
  const contentScale = useRef(new Animated.Value(fromFab ? 0.95 : 1)).current;

  useEffect(() => {
    if (!fromFab) {
      return;
    }

    Animated.sequence([
      Animated.timing(burstScale, {
        toValue: spreadScaleTarget,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 170,
          delay: 120,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          damping: 12,
          stiffness: 170,
          mass: 0.9,
          delay: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [burstOpacity, burstScale, contentOpacity, contentScale, fromFab, spreadScaleTarget]);

  useEffect(() => {
    pagerRef.current?.setPage(activePageIndex);
  }, [activePageIndex]);

  const { display: displayAmount, value: parsedAmount } = useMemo(() => formatSafeAmount(amount), [amount]);

  const monthLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth],
  );

  const calendarCells = useMemo(() => {
    const firstWeekday = calendarMonth.getDay();
    const totalDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);

  const onKeypadTap = (key: KeypadKey) => {
    if (key.action.type === 'delete') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }

    if (key.action.type === 'clear') {
      setAmount('');
      return;
    }

    if (key.action.type === 'setType') {
      setTransactionType(key.action.value);
      return;
    }

    if (key.action.type === 'openCalendar') {
      setCalendarMonth(startOfMonth(selectedDate));
      setIsCalendarVisible(true);
      return;
    }

    if (key.action.type === 'cycleCategory') {
      const currentIndex = categories.findIndex(item => item.key === selectedCategory);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % categories.length;
      setSelectedCategory(categories[nextIndex].key);
      return;
    }

    if (key.action.type === 'save') {
      void onSave();
      return;
    }

    if (key.action.type === 'input') {
      const inputValue = key.action.value;
      setAmount(prev => {
        const next = (prev + inputValue).replace(/\D/g, '');
        if (next.length > 11) {
          return prev;
        }

        return next;
      });
    }
  };

  const renderTransactionPage = (pageType: 'expense' | 'income') => {
    const isExpense = pageType === 'expense';

    return (
      <View style={styles.pageScrollContent}>
        <View style={[styles.pageHero, isExpense ? styles.pageHeroExpense : styles.pageHeroIncome]}>
          <Text style={styles.pageHeroEmoji}>{isExpense ? '👛' : '💰'}</Text>
          <View style={styles.pageHeroTextWrap}>
            <Text style={styles.pageHeroTitle}>{isExpense ? 'Expense' : 'Income'}</Text>
            <Text style={styles.pageHeroSubtitle}>
              {isExpense ? 'Track money going out' : 'Track money coming in'}
            </Text>
          </View>
        </View>

        <View style={styles.amountWrap}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            value={displayAmount}
            placeholder="0.00"
            placeholderTextColor="#737aa8"
            editable={false}
            showSoftInputOnFocus={false}
            style={styles.amountInput}
          />
        </View>

        <View style={styles.noteBox}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add note (optional)"
            placeholderTextColor="#7780b2"
            style={styles.noteInput}
          />
        </View>

        <Pressable
          style={styles.dateRow}
          onPress={() => {
            setCalendarMonth(startOfMonth(selectedDate));
            setIsCalendarVisible(true);
          }}
        >
          <Text style={styles.dateLabel}>Transaction Date</Text>
          <Text style={styles.dateValue}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </Pressable>

        <View style={styles.categoryWrap}>
          {categories.map(item => (
            <Pressable
              key={item.key}
              style={[styles.categoryChip, selectedCategory === item.key ? styles.categoryActive : null]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === item.key ? styles.categoryChipTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const onSave = async () => {
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    const session = getAuthSession();
    if (!session?.userId) {
      Alert.alert('Login required', 'Please sign in again before creating a transaction.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const saveDate = new Date(selectedDate);
      saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

      await insertTransaction({
        amount: parsedAmount,
        type: transactionType,
        category: selectedCategory,
        date: saveDate.toISOString(),
        note: note.trim(),
        receiptUrl: '',
        userId: session.userId,
      });

      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Could not save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.burstCircle,
          {
            left: originX - baseRadius,
            top: originY - baseRadius,
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          },
        ]}
      />

      <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }], flex: 1 }}>
        <View style={styles.topRow}>
          <Pressable style={styles.closeWrap} onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>x</Text>
          </Pressable>

          <View style={styles.typeTabsRow}>
            {transactionTypeTabs.map(tab => {
              const isActive = transactionType === tab.value;

              return (
                <Pressable
                  key={tab.value}
                  style={[styles.typeTab, isActive ? styles.typeTabActive : null]}
                  onPress={() => setTransactionType(tab.value)}
                >
                  <Text style={styles.typeTabEmoji}>{tab.emoji}</Text>
                  {isActive ? <Text style={styles.typeTabLabel}>{tab.label}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.confirmWrap} onPress={onSave} disabled={isSaving}>
            <Text style={styles.confirmText}>✓</Text>
          </Pressable>
        </View>

        <View style={styles.pagerArea}>
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={event => {
              setTransactionType(event.nativeEvent.position === 1 ? 'income' : 'expense');
            }}
          >
            <ScrollView key="expense" style={styles.page} contentContainerStyle={styles.pageScrollContainer} showsVerticalScrollIndicator={false}>
              {renderTransactionPage('expense')}
            </ScrollView>
            <ScrollView key="income" style={styles.page} contentContainerStyle={styles.pageScrollContainer} showsVerticalScrollIndicator={false}>
              {renderTransactionPage('income')}
            </ScrollView>
          </PagerView>
        </View>

        <View style={styles.footerArea}>
          <View style={styles.keypadWrap}>
            {keypadRows.map(row =>
              row.map(key => {
                const isIconStyle = key.variant === 'accent' || key.variant === 'confirm' || key.variant === 'danger';

                return (
                  <Pressable
                    key={key.id}
                    style={[
                      styles.keypadButton,
                      key.variant === 'operator' ? styles.keypadOperatorButton : null,
                      key.variant === 'utility' ? styles.keypadUtilityButton : null,
                      key.variant === 'danger' ? styles.keypadDangerButton : null,
                    ]}
                    onPress={() => onKeypadTap(key)}
                  >
                    {isIconStyle ? (
                      <View
                        style={[
                          styles.iconBubble,
                          key.variant === 'accent' ? styles.iconBubbleAccent : null,
                          key.variant === 'confirm' ? styles.iconBubbleConfirm : null,
                          key.variant === 'danger' ? styles.iconBubbleDanger : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.iconBubbleText,
                            key.variant === 'danger' ? styles.iconBubbleTextDanger : null,
                          ]}
                        >
                          {key.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.keypadButtonText, key.variant === 'utility' ? styles.keypadUtilityText : null]}>
                        {key.label}
                      </Text>
                    )}
                  </Pressable>
                );
              }),
            )}
          </View>

          <View style={styles.homeIndicator} />
        </View>
      </Animated.View>

      <Modal visible={isCalendarVisible} transparent animationType="fade" onRequestClose={() => setIsCalendarVisible(false)}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHead}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <Text style={styles.calendarNavText}>{'<'}</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>{monthLabel}</Text>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <Text style={styles.calendarNavText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {weekdayLabels.map(label => (
                <Text key={label} style={styles.weekdayText}>{label}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                const isSelected = isSameDay(dayDate, selectedDate);

                return (
                  <Pressable
                    key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${day}`}
                    style={[styles.dayCell, styles.dayButton, isSelected ? styles.dayButtonActive : null]}
                    onPress={() => {
                      setSelectedDate(dayDate);
                      setIsCalendarVisible(false);
                    }}
                  >
                    <Text style={[styles.dayText, isSelected ? styles.dayTextActive : null]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.calendarTodayButton}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setCalendarMonth(startOfMonth(today));
                setIsCalendarVisible(false);
              }}
            >
              <Text style={styles.calendarTodayText}>Use Today</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0d22',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  burstCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6f53ff',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#161a45',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  typeTabActive: {
    borderColor: '#8a75ff',
    backgroundColor: '#6e57ff',
  },
  typeTabEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  typeTabLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f356f',
    backgroundColor: '#1a1d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#d6dcff',
    fontSize: 16,
    fontWeight: '700',
  },
  pagerArea: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageScrollContainer: {
    paddingBottom: 12,
  },
  pageScrollContent: {
    flexGrow: 1,
  },
  pageHero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pageHeroExpense: {
    backgroundColor: '#171b46',
    borderColor: '#32376f',
  },
  pageHeroIncome: {
    backgroundColor: '#171b46',
    borderColor: '#32376f',
  },
  pageHeroEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  pageHeroTextWrap: {
    flex: 1,
  },
  pageHeroTitle: {
    color: '#f5f7ff',
    fontSize: 15,
    fontWeight: '700',
  },
  pageHeroSubtitle: {
    color: '#8f98d2',
    fontSize: 11,
    marginTop: 2,
  },
  closeWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f356f',
    backgroundColor: '#1a1d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#b3bae6',
    fontSize: 15,
  },
  amountWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    color: '#6f5dff',
    fontSize: 44,
    marginRight: 10,
    fontWeight: '700',
  },
  amountInput: {
    color: '#f8f9ff',
    fontSize: 44,
    fontWeight: '800',
    minWidth: 140,
    paddingVertical: 0,
    textAlign: 'left',
  },
  noteBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#32376f',
    backgroundColor: '#171b46',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 10,
  },
  noteInput: {
    color: '#d7dcff',
    fontSize: 12,
    paddingVertical: 10,
  },
  dateRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343978',
    backgroundColor: '#161a43',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  dateLabel: {
    color: '#8f98d2',
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '600',
  },
  dateValue: {
    color: '#f4f6ff',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#363b74',
    backgroundColor: '#1b1f4c',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryActive: {
    backgroundColor: '#6f58ff',
    borderColor: '#8b76ff',
  },
  categoryChipText: {
    color: '#97a0dc',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  keypadWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#131741',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  keypadButton: {
    width: '24%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3b417f',
    backgroundColor: '#222957',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    minHeight: 52,
  },
  keypadButtonText: {
    color: '#f1f2f6',
    fontSize: 15,
    fontWeight: '700',
  },
  keypadOperatorButton: {
    backgroundColor: '#2b2e53',
    borderColor: '#52588f',
  },
  keypadUtilityButton: {
    backgroundColor: '#262c5a',
    borderColor: '#4f5693',
  },
  keypadDangerButton: {
    backgroundColor: '#3a1e30',
    borderColor: '#81405d',
  },
  keypadUtilityText: {
    fontSize: 14,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBubbleAccent: {
    backgroundColor: '#6f58ff',
    borderColor: '#8b76ff',
  },
  iconBubbleConfirm: {
    backgroundColor: '#7f5bff',
    borderColor: '#9e89ff',
  },
  iconBubbleDanger: {
    backgroundColor: '#a84f73',
    borderColor: '#c87999',
  },
  iconBubbleText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 11,
  },
  iconBubbleTextDanger: {
    color: '#fff4f8',
  },
  saveButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8a75ff',
    backgroundColor: '#6f53ff',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 86,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5a608f',
    marginTop: 12,
  },
  footerArea: {
    paddingTop: 6,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#323775',
    backgroundColor: '#12163e',
    padding: 14,
  },
  calendarHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarNavButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4a5298',
    backgroundColor: '#1f2454',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    color: '#dbe0ff',
    fontSize: 15,
    fontWeight: '700',
  },
  calendarTitle: {
    color: '#f2f4ff',
    fontSize: 16,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayText: {
    width: '14.2857%',
    textAlign: 'center',
    color: '#96a1dd',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    borderRadius: 10,
  },
  dayButtonActive: {
    backgroundColor: '#6f58ff',
  },
  dayText: {
    color: '#d3d9ff',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  calendarTodayButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8a75ff',
    backgroundColor: '#6f53ff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  calendarTodayText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
