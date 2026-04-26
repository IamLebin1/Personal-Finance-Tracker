import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { insertTransaction } from '../services/transactionApi';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { getAuthSession } from '../services/authSession';
import type { TransactionType } from '../types/transaction';

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
    | { type: 'operator'; value: '+' | '-' }
    | { type: 'delete' }
    | { type: 'clear' }
    | { type: 'setType'; value: TransactionType }
    | { type: 'save' }
    | { type: 'noop' };
};

const transactionTypeTabs = [
  { value: 'expense', label: 'Expense', emoji: '👛' },
  { value: 'income', label: 'Income', emoji: '💰' },
  { value: 'transfer', label: 'Transfer', emoji: '🔄' },
] as const;

const keypadRows: KeypadKey[][] = [
  [
    { id: '7', label: '7', variant: 'number', action: { type: 'input', value: '7' } },
    { id: '8', label: '8', variant: 'number', action: { type: 'input', value: '8' } },
    { id: '9', label: '9', variant: 'number', action: { type: 'input', value: '9' } },
    { id: 'delete', label: '⌫', variant: 'operator', action: { type: 'delete' } },
  ],
  [
    { id: '4', label: '4', variant: 'number', action: { type: 'input', value: '4' } },
    { id: '5', label: '5', variant: 'number', action: { type: 'input', value: '5' } },
    { id: '6', label: '6', variant: 'number', action: { type: 'input', value: '6' } },
    { id: 'clear-op', label: 'C', variant: 'danger', action: { type: 'clear' } },
  ],
  [
    { id: '1', label: '1', variant: 'number', action: { type: 'input', value: '1' } },
    { id: '2', label: '2', variant: 'number', action: { type: 'input', value: '2' } },
    { id: '3', label: '3', variant: 'number', action: { type: 'input', value: '3' } },
    { id: 'plus', label: '+', variant: 'operator', action: { type: 'operator', value: '+' } },
  ],
  [
    { id: 'dot', label: '.', variant: 'number', action: { type: 'input', value: '.' } },
    { id: '0', label: '0', variant: 'number', action: { type: 'input', value: '0' } },
    { id: 'minus', label: '-', variant: 'operator', action: { type: 'operator', value: '-' } },
    { id: 'ok', label: '✓', variant: 'confirm', action: { type: 'save' } },
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
  const normalized = digits.replace(/[^\d.]/g, '');

  if (!normalized) {
    return { display: '0.00', value: 0 };
  }

  // If it's just digits, we treat it as cents-based input like before or literal?
  // Let's stick to literal decimal for a more "standard" calculator feel if we have a dot.
  if (normalized.includes('.')) {
      const parts = normalized.split('.');
      const display = parts[0] + '.' + (parts[1] || '').slice(0, 2);
      return { display, value: parseFloat(display) || 0 };
  }

  const padded = normalized.padStart(3, '0');
  const display = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  const value = parseFloat(display);

  return { display, value };
}

function formatFixedMoney(value: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

export default function AddTransaction({ navigation, route }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.key ?? 'food');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [isSaving, setIsSaving] = useState(false);

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

  const [calcAccumulator, setCalcAccumulator] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<'+' | '-' | null>(null);

  useEffect(() => {
    if (!isCalculatorVisible) {
      setCalcAccumulator(null);
      setCalcOperator(null);
      return;
    }

    // When opening the calculator, treat the current amount as the starting entry.
    setCalcAccumulator(null);
    setCalcOperator(null);
  }, [isCalculatorVisible]);

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

  const { display: displayAmount, value: parsedAmount } = useMemo(() => formatSafeAmount(amount), [amount]);

  const calculatorExpression = useMemo(() => {
    if (calcAccumulator === null && calcOperator === null) return '';
    const left = formatFixedMoney(calcAccumulator ?? 0);
    if (!calcOperator) return left;
    return `${left} ${calcOperator}`;
  }, [calcAccumulator, calcOperator]);

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
      setAmount(prev => {
        if (prev.length > 0) return prev.slice(0, -1);
        if (calcOperator) {
          setCalcOperator(null);
          return prev;
        }
        if (calcAccumulator !== null) {
          setCalcAccumulator(null);
          return prev;
        }
        return prev;
      });
      return;
    }

    if (key.action.type === 'clear') {
      setAmount('');
      setCalcAccumulator(null);
      setCalcOperator(null);
      return;
    }

    if (key.action.type === 'save') {
      setIsCalculatorVisible(false);

      // Compute the final number synchronously and update amount state
      if (calcOperator && calcAccumulator !== null) {
        const { value: rightValue } = formatSafeAmount(amount);
        const nextValue = calcOperator === '+' ? calcAccumulator + rightValue : calcAccumulator - rightValue;
        const finalValue = Math.max(0, nextValue);
        setAmount(formatFixedMoney(finalValue));
        setCalcAccumulator(null);
        setCalcOperator(null);
        return;
      }

      if (calcAccumulator !== null && !amount) {
        const finalValue = Math.max(0, calcAccumulator);
        setAmount(formatFixedMoney(finalValue));
        setCalcAccumulator(null);
        setCalcOperator(null);
        return;
      }
      return;
    }

    if (key.action.type === 'operator') {
      const op = key.action.value;
      const { value: entryValue } = formatSafeAmount(amount);

      if (calcAccumulator === null) {
        setCalcAccumulator(entryValue);
        setCalcOperator(op);
        setAmount('');
        return;
      }

      if (!calcOperator) {
        setCalcOperator(op);
        setAmount('');
        return;
      }

      if (!amount) {
        setCalcOperator(op);
        return;
      }

      const nextValue = calcOperator === '+' ? calcAccumulator + entryValue : calcAccumulator - entryValue;
      setCalcAccumulator(nextValue);
      setCalcOperator(op);
      setAmount('');
      return;
    }

    if (key.action.type === 'input') {
      const inputValue = key.action.value;
      setAmount(prev => {
        if (inputValue === '.' && prev.includes('.')) return prev;
        const next = (prev + inputValue).replace(/[^\d.]/g, '');
        if (next.length > 11) {
          return prev;
        }

        return next;
      });
    }
  };

  const onSave = async (overrideAmount?: number) => {
    const amountToSave = overrideAmount ?? parsedAmount;
    if (amountToSave <= 0) {
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
        amount: amountToSave,
        type: transactionType,
        category: selectedCategory,
        date: saveDate.toISOString(),
        note: note.trim(),
        receiptUrl: '',
        userId: session.userId,
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save transaction. Please try again.');
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

          <Pressable style={styles.confirmWrap} onPress={() => void onSave()} disabled={isSaving}>
            <Text style={styles.confirmText}>✓</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollContainer} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.amountWrap} onPress={() => setIsCalculatorVisible(true)}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.amountText}>{displayAmount}</Text>
          </Pressable>

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

          <Pressable 
            style={[styles.bottomConfirmButton, isSaving && styles.bottomConfirmButtonDisabled]} 
            onPress={() => void onSave()}
            disabled={isSaving}
          >
            <Text style={styles.bottomConfirmButtonText}>
              {isSaving ? 'Saving...' : 'Confirm Transaction'}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* Calculator Modal */}
      <Modal visible={isCalculatorVisible} transparent animationType="slide" onRequestClose={() => setIsCalculatorVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCalculatorVisible(false)}>
          <View style={styles.calculatorCard} onStartShouldSetResponder={() => true}>
            <View style={styles.calculatorHandle} />
            <View style={styles.calculatorAmountDisplay}>
              <Text style={styles.calculatorCurrency}>$</Text>
              <View style={styles.calculatorAmountColumn}>
                {calculatorExpression ? <Text style={styles.calculatorExpressionText}>{calculatorExpression}</Text> : null}
                <Text style={styles.calculatorAmountText}>{displayAmount}</Text>
              </View>
            </View>
            <View style={styles.keypadWrap}>
              {keypadRows.map(row =>
                row.map(key => {
                  const isIconStyle = key.variant === 'confirm' || key.variant === 'danger';

                  return (
                    <Pressable
                      key={key.id}
                      style={[
                        styles.keypadButton,
                        key.variant === 'operator' ? styles.keypadOperatorButton : null,
                        key.variant === 'utility' ? styles.keypadUtilityButton : null,
                        key.variant === 'danger' ? styles.keypadDangerButton : null,
                        key.variant === 'confirm' ? styles.keypadConfirmButton : null,
                      ]}
                      onPress={() => onKeypadTap(key)}
                    >
                      {isIconStyle ? (
                        <View
                          style={[
                            styles.iconBubble,
                            key.variant === 'confirm' ? styles.iconBubbleConfirm : null,
                            key.variant === 'danger' ? styles.iconBubbleDanger : null,
                          ]}
                        >
                          <Text style={styles.iconBubbleText}>{key.label}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.keypadButtonText, key.variant === 'operator' ? styles.keypadOperatorText : null]}>
                          {key.label}
                        </Text>
                      )}
                    </Pressable>
                  );
                }),
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

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
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  typeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#161a45',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 2,
  },
  typeTabActive: {
    borderColor: '#8a75ff',
    backgroundColor: '#6e57ff',
    shadowColor: '#6e57ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  amountWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 24,
    marginTop: 10,
    paddingVertical: 20,
    backgroundColor: 'rgba(23, 27, 70, 0.4)',
    borderRadius: 20,
  },
  currency: {
    color: '#6f5dff',
    fontSize: 44,
    marginRight: 10,
    fontWeight: '700',
  },
  amountText: {
    color: '#f8f9ff',
    fontSize: 56,
    fontWeight: '800',
  },
  noteBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#32376f',
    backgroundColor: '#171b46',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 12,
  },
  noteInput: {
    color: '#d7dcff',
    fontSize: 14,
    paddingVertical: 12,
  },
  dateRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343978',
    backgroundColor: '#161a43',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateLabel: {
    color: '#8f98d2',
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '600',
  },
  dateValue: {
    color: '#f4f6ff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#363b74',
    backgroundColor: '#1b1f4c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 10,
  },
  categoryActive: {
    backgroundColor: '#6f58ff',
    borderColor: '#8b76ff',
  },
  categoryChipText: {
    color: '#97a0dc',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.5)',
    justifyContent: 'flex-end',
  },
  calculatorCard: {
    backgroundColor: '#0f111d',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#222533',
  },
  calculatorHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3b417f',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  calculatorAmountDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  calculatorAmountColumn: {
    alignItems: 'flex-start',
  },
  calculatorExpressionText: {
    color: '#9aa4d6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  calculatorCurrency: {
    color: '#6f5dff',
    fontSize: 32,
    marginRight: 6,
    fontWeight: '700',
  },
  calculatorAmountText: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '800',
  },
  keypadWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  keypadButton: {
    width: '23%',
    borderRadius: 18,
    backgroundColor: '#1a1d48',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  keypadButtonText: {
    color: '#f1f2f6',
    fontSize: 20,
    fontWeight: '700',
  },
  keypadOperatorButton: {
    backgroundColor: '#2b2e53',
  },
  keypadOperatorText: {
    color: '#a18aff',
    fontSize: 24,
  },
  keypadConfirmButton: {
    backgroundColor: '#6e57ff',
  },
  keypadDangerButton: {
    backgroundColor: '#3a1e30',
  },
  keypadUtilityButton: {
    backgroundColor: '#232756',
  },
  iconBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleConfirm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconBubbleDanger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconBubbleText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 20,
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
  bottomConfirmButton: {
    marginTop: 30,
    backgroundColor: '#6f53ff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6f53ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomConfirmButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#4a4d7a',
  },
  bottomConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
