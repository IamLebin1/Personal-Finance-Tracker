import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { 
  Alert, 
  Animated, 
  Dimensions, 
  Modal, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  Image,
  PanResponder, 
  Platform 
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { insertTransaction } from '../services/transactionApi';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { getAuthSession } from '../services/authSession';
import { getWallets } from '../services/walletApi';
import { getSelectedWalletId } from '../services/walletService';
import type { TransactionType, Wallet } from '../types/transaction';
import { getCategoriesByType, type Category } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../services/useCurrency';
import { getCategories } from '../services/categoryService';

async function uploadReceiptToCloud(fileUri: string): Promise<string> {
  return Promise.resolve(fileUri);
}

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
    { id: 'clear-op', label: 'C', variant: 'utility', action: { type: 'clear' } },
  ],
  [
    { id: '4', label: '4', variant: 'number', action: { type: 'input', value: '4' } },
    { id: '5', label: '5', variant: 'number', action: { type: 'input', value: '5' } },
    { id: '6', label: '6', variant: 'number', action: { type: 'input', value: '6' } },
    { id: 'delete', label: '⌫', variant: 'utility', action: { type: 'delete' } },
  ],
  [
    { id: '1', label: '1', variant: 'number', action: { type: 'input', value: '1' } },
    { id: '2', label: '2', variant: 'number', action: { type: 'input', value: '2' } },
    { id: '3', label: '3', variant: 'number', action: { type: 'input', value: '3' } },
    { id: 'minus', label: '−', variant: 'accent', action: { type: 'operator', value: '-' } },
  ],
  [
    { id: 'dot', label: '.', variant: 'number', action: { type: 'input', value: '.' } },
    { id: '0', label: '0', variant: 'number', action: { type: 'input', value: '0' } },
    { id: 'plus', label: '+', variant: 'accent', action: { type: 'operator', value: '+' } },
    { id: 'ok', label: '✓', variant: 'confirm', action: { type: 'save' } },
  ],
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatSafeAmount(digits: string): { display: string; value: number } {
  const normalized = digits.replace(/[^\d.]/g, '');
  if (!normalized) return { display: '0.00', value: 0 };
  if (normalized.includes('.')) {
      const parts = normalized.split('.');
      const display = parts[0] + '.' + (parts[1] || '').slice(0, 2);
      return { display, value: parseFloat(display) || 0 };
  }
  const padded = normalized.padStart(3, '0');
  const display = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  return { display, value: parseFloat(display) || 0 };
}

function formatFixedMoney(value: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

const windowSize = Dimensions.get('window');

export default function AddTransaction({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { symbol, convertToUsd } = useCurrency();
  
  // 1. Hooks
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(getCategoriesByType('expense')[0].key);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [availableCategories, setAvailableCategories] = useState<Category[]>(getCategoriesByType('expense'));
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [isCalculatorClosing, setIsCalculatorClosing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [calcAccumulator, setCalcAccumulator] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<'+' | '-' | null>(null);
  const [tabsWidth, setTabsWidth] = useState(0);

  const onSnapReceipt = async () => {
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
      if (result.didCancel) return;
      if (result.errorCode) throw new Error(result.errorMessage || 'Camera error');
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setReceiptUri(asset.uri);
        const url = await uploadReceiptToCloud(asset.uri);
        setReceiptUrl(url);
      }
    } catch (err: any) {
      Alert.alert('Receipt Error', err.message || 'Could not snap receipt.');
    }
  };

  const onUploadReceipt = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (result.didCancel) return;
      if (result.errorCode) throw new Error(result.errorMessage || 'Picker error');
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setReceiptUri(asset.uri);
        const url = await uploadReceiptToCloud(asset.uri);
        setReceiptUrl(url);
      }
    } catch (err: any) {
      Alert.alert('Receipt Error', err.message || 'Could not upload receipt.');
    }
  };

  const tabAnim = useRef(new Animated.Value(0)).current;
  const calcTranslateY = useRef(new Animated.Value(windowSize.height)).current;
  const fromFab = Boolean(route.params?.fromFab);
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
  const contentScale = useRef(new Animated.Value(fromFab ? 0.8 : 1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  // 2. Memoized
  const { display: displayAmount, value: parsedAmount } = useMemo(() => formatSafeAmount(amount), [amount]);
  const flatKeypad = useMemo(() => keypadRows.flat(), []);
  const calculatorExpression = useMemo(() => {
    if (calcAccumulator === null && calcOperator === null) return '';
    const left = formatFixedMoney(calcAccumulator ?? 0);
    if (!calcOperator) return left;
    return `${left} ${calcOperator}`;
  }, [calcAccumulator, calcOperator]);
  const calendarCells = useMemo(() => {
    const firstWeekday = calendarMonth.getDay();
    const totalDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);
  const selectedWallet = useMemo(() => wallets.find(w => String(w.id) === String(selectedWalletId)), [wallets, selectedWalletId]);
  const indicatorWidth = useMemo(() => (tabsWidth - 8) / 3, [tabsWidth]);
  const indicatorTranslateX = useMemo(() => tabAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, indicatorWidth, indicatorWidth * 2],
  }), [tabAnim, indicatorWidth]);

  // 3. Callbacks
  const closeCalculator = useCallback(() => {
    if (isCalculatorClosing) return;
    setIsCalculatorClosing(true);
    Animated.timing(calcTranslateY, { toValue: windowSize.height, duration: 250, useNativeDriver: true }).start(() => {
      setIsCalculatorVisible(false);
      setIsCalculatorClosing(false);
    });
  }, [isCalculatorClosing, calcTranslateY]);

  const openCalculator = useCallback(() => {
    calcTranslateY.setValue(windowSize.height);
    setIsCalculatorVisible(true);
    Animated.spring(calcTranslateY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
  }, [calcTranslateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) calcTranslateY.setValue(gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) closeCalculator();
        else Animated.spring(calcTranslateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
      },
    })
  ).current;

  const handleClose = () => {
    const destX = originX - windowSize.width / 2;
    const destY = originY - windowSize.height / 2;
    
    // Start the "suck back" animation with high-speed physics
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.spring(contentScale, { toValue: 0.01, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.spring(contentTranslateX, { toValue: destX, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.spring(contentTranslateY, { toValue: destY, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.timing(burstOpacity, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(burstScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    // Trigger navigation immediately for instant responsiveness
    navigation.goBack();
  };

  const onKeypadTap = (key: KeypadKey) => {
    if (key.action.type === 'delete') { setAmount(prev => prev.length > 0 ? prev.slice(0, -1) : prev); return; }
    if (key.action.type === 'clear') { setAmount(''); setCalcAccumulator(null); setCalcOperator(null); return; }
    if (key.action.type === 'save') {
      if (calcOperator && calcAccumulator !== null) {
        const { value: rightValue } = formatSafeAmount(amount);
        const nextValue = calcOperator === '+' ? calcAccumulator + rightValue : calcAccumulator - rightValue;
        setAmount(formatFixedMoney(Math.max(0, nextValue)));
        setCalcAccumulator(null);
        setCalcOperator(null);
      } else if (calcAccumulator !== null && !amount) {
        setAmount(formatFixedMoney(Math.max(0, calcAccumulator)));
        setCalcAccumulator(null);
      }
      closeCalculator();
      return;
    }
    if (key.action.type === 'operator') {
      const op = key.action.value;
      const { value: entryValue } = formatSafeAmount(amount);
      if (calcAccumulator === null) { setCalcAccumulator(entryValue); setCalcOperator(op); setAmount(''); }
      else if (!calcOperator) { setCalcOperator(op); setAmount(''); }
      else if (!amount) { setCalcOperator(op); }
      else {
        const nextValue = calcOperator === '+' ? calcAccumulator + entryValue : calcAccumulator - entryValue;
        setCalcAccumulator(nextValue);
        setCalcOperator(op);
        setAmount('');
      }
      return;
    }
    if (key.action.type === 'input') {
      const inputValue = key.action.value;
      setAmount(prev => {
        if (inputValue === '.' && prev.includes('.')) return prev;
        const next = (prev + inputValue).replace(/[^\d.]/g, '');
        return next.length > 11 ? prev : next;
      });
    }
  };

  const onSave = async () => {
    if (parsedAmount <= 0) { Alert.alert('Invalid amount', 'Please enter a valid amount.'); return; }
    const session = getAuthSession();
    if (!session?.userId) { Alert.alert('Login required', 'Please sign in again.'); return; }
    setIsSaving(true);
    try {
      const saveDate = new Date(selectedDate);
      const now = new Date();
      saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      const amountInUsd = convertToUsd(parsedAmount);
      await insertTransaction({
        amount: amountInUsd,
        type: transactionType,
        category: selectedCategory,
        date: saveDate.toISOString(),
        note: note.trim(),
        receiptUrl: receiptUrl || '',
        userId: session.userId,
        walletId: selectedWalletId || undefined,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Error saving transaction.');
    } finally { setIsSaving(false); }
  };

  // 4. Effects
  useEffect(() => {
    getWallets().then(async fetchedWallets => {
      const savedWalletId = await getSelectedWalletId();
      setWallets(fetchedWallets);
      const defaultWalletId = fetchedWallets.find(w => String(w.id) === String(savedWalletId))?.id || fetchedWallets[0]?.id || null;
      setSelectedWalletId(defaultWalletId);
    });
  }, []);

  useEffect(() => {
    const index = transactionTypeTabs.findIndex(t => t.value === transactionType);
    Animated.spring(tabAnim, { toValue: index, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [transactionType, tabAnim]);

  useEffect(() => {
    let isMounted = true;

    const loadAvailableCategories = async () => {
      const type = transactionType === 'income' ? 'income' : 'expense';
      const rows = await getCategories(type);
      if (!isMounted) return;
      setAvailableCategories(rows);

      if (rows.length > 0) {
        setSelectedCategory(prev => (rows.some(item => item.key === prev) ? prev : rows[0].key));
      }
    };

    loadAvailableCategories().catch(() => {
      const fallbackType = transactionType === 'income' ? 'income' : 'expense';
      const fallbackRows = getCategoriesByType(fallbackType);
      if (!isMounted) return;
      setAvailableCategories(fallbackRows);
      if (fallbackRows.length > 0) {
        setSelectedCategory(prev => (fallbackRows.some(item => item.key === prev) ? prev : fallbackRows[0].key));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [transactionType]);

  useEffect(() => {
    if (fromFab) {
      Animated.parallel([
        Animated.timing(burstScale, { toValue: spreadScaleTarget, duration: 400, useNativeDriver: true }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 300, delay: 50, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 250, delay: 100, useNativeDriver: true }),
        Animated.spring(contentScale, { toValue: 1, damping: 12, stiffness: 150, mass: 1, delay: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [fromFab]);

  // 5. Render
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.View pointerEvents="none" style={[styles.burstCircle, { left: originX - baseRadius, top: originY - baseRadius, opacity: burstOpacity, transform: [{ scale: burstScale }], backgroundColor: colors.primary }]} />

      <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }, { translateX: contentTranslateX }, { translateY: contentTranslateY }], flex: 1 }}>
        <View style={styles.topRow}>
          <View style={[styles.typeTabsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.cardBorder }]} onLayout={e => setTabsWidth(e.nativeEvent.layout.width)}>
            {tabsWidth > 0 && <Animated.View style={[styles.typeIndicator, { width: indicatorWidth, transform: [{ translateX: indicatorTranslateX }], backgroundColor: colors.primary }]} />}
            {transactionTypeTabs.map(tab => {
              const isActive = transactionType === tab.value;
              return (
                <Pressable key={tab.value} style={styles.typeTab} onPress={() => setTransactionType(tab.value)}>
                  <Text style={styles.typeTabEmoji}>{tab.emoji}</Text>
                  <Text style={[styles.typeTabLabel, { color: isActive ? '#fff' : colors.textMuted }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollContainer} showsVerticalScrollIndicator={false}>
          <Pressable style={[styles.amountWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={openCalculator}>
            <Text style={[styles.currency, { color: colors.primary }]}>{symbol}</Text>
            <Text style={[styles.amountText, { color: colors.text }]}>{displayAmount}</Text>
          </Pressable>

          <View style={[styles.glassInputBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TextInput value={note} onChangeText={setNote} placeholder="Add a note..." placeholderTextColor={colors.textMuted + '60'} style={[styles.noteInput, { color: colors.text }]} />
          </View>

          <Pressable style={[styles.glassInputBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setIsWalletModalVisible(true)}>
            <View>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Selected Wallet</Text>
              <View style={styles.walletRow}>
                <Text style={styles.walletEmoji}>{selectedWallet?.icon || '👛'}</Text>
                <Text style={[styles.inputValue, { color: colors.text }]}>{selectedWallet?.name || 'Select Wallet'}</Text>
              </View>
            </View>
          </Pressable>

          <Pressable style={[styles.glassInputBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => { setCalendarMonth(startOfMonth(selectedDate)); setIsCalendarVisible(true); }}>
            <View>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Transaction Date</Text>
              <Text style={[styles.inputValue, { color: colors.text }]}>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          </Pressable>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Select Category</Text>
          <View style={styles.categoryWrap}>
            {availableCategories.map(item => (
              <Pressable key={item.key} style={[styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, selectedCategory === item.key && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setSelectedCategory(item.key)}>
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[styles.categoryChipText, { color: selectedCategory === item.key ? '#fff' : colors.textMuted }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.receiptActionsRow}>
            <Pressable
              style={[styles.receiptActionButton, styles.snapReceiptButton]}
              onPress={onSnapReceipt}
              disabled={isSaving}
            >
              <Text style={styles.snapReceiptButtonText}>📸 Snap Receipt</Text>
            </Pressable>
            <Pressable
              style={[styles.receiptActionButton, styles.uploadReceiptButton]}
              onPress={onUploadReceipt}
              disabled={isSaving}
            >
              <Text style={styles.uploadReceiptButtonText}>🖼️ Upload Receipt</Text>
            </Pressable>
          </View>
          {receiptUri ? (
            <View style={styles.receiptPreviewWrap}>
              <Image source={{ uri: receiptUri }} style={styles.receiptPreviewImage} />
              <Text style={[styles.receiptPreviewLabel, { color: colors.textMuted }]}>Receipt Preview</Text>
            </View>
          ) : null}

          <Pressable style={[styles.confirmBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, isSaving && styles.confirmBtnDisabled]} onPress={onSave} disabled={isSaving}>
            <Text style={styles.confirmBtnText}>{isSaving ? 'Processing...' : 'Confirm Transaction'}</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.exitButtonContainer}>
          <Pressable style={[styles.exitButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={handleClose}>
            <Text style={[styles.exitButtonIcon, { color: colors.text }]}>✕</Text>
          </Pressable>
        </View>
      </Animated.View>

      <Modal visible={isCalculatorVisible} transparent animationType="none" onRequestClose={closeCalculator}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCalculator} />
          <Animated.View style={[styles.calculatorCard, { transform: [{ translateY: calcTranslateY }], backgroundColor: colors.card, borderTopColor: colors.cardBorder }]} {...panResponder.panHandlers}>
            <View style={[styles.calculatorHandle, { backgroundColor: colors.textMuted + '40' }]} />
            <View style={styles.calculatorAmountDisplay}>
              <Text style={[styles.calculatorCurrency, { color: colors.primary }]}>{symbol}</Text>
              <View style={styles.calculatorAmountColumn}>
                {calculatorExpression ? <Text style={[styles.calculatorExpressionText, { color: colors.textMuted }]}>{calculatorExpression}</Text> : null}
                <Text style={[styles.calculatorAmountText, { color: colors.text }]}>{displayAmount}</Text>
              </View>
            </View>
            <View style={styles.keypadWrap}>
              {flatKeypad.map(key => (
                <Pressable key={key.id} style={[styles.keypadButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }, key.variant === 'operator' && { backgroundColor: colors.primary + '15' }, key.variant === 'accent' && { backgroundColor: colors.primary + '10' }, key.variant === 'confirm' && { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => onKeypadTap(key)}>
                  <Text style={[styles.keypadButtonText, { color: colors.text }, key.variant === 'operator' && { color: colors.primary }, key.variant === 'accent' && { color: colors.primary }, key.variant === 'confirm' && { color: '#fff' }]}>{key.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={isWalletModalVisible} transparent animationType="slide" onRequestClose={() => setIsWalletModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsWalletModalVisible(false)}>
          <View style={[styles.walletModalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.calculatorHandle, { backgroundColor: colors.textMuted + '40' }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Wallet</Text>
            <ScrollView
              style={styles.walletList}
              contentContainerStyle={styles.walletListContent}
              showsVerticalScrollIndicator={false}
            >
              {wallets.map(wallet => (
                <Pressable key={wallet.id} style={[styles.walletItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }, selectedWalletId === wallet.id && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]} onPress={() => { setSelectedWalletId(wallet.id); setIsWalletModalVisible(false); }}>
                  <View style={[styles.walletIconBox, { backgroundColor: wallet.color + '20' }]}><Text style={styles.walletIcon}>{wallet.icon}</Text></View>
                  <Text style={[styles.walletNameText, { color: colors.text }]}>{wallet.name}</Text>
                  {selectedWalletId === wallet.id && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}><Text style={styles.checkIcon}>✓</Text></View>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isCalendarVisible} transparent animationType="fade" onRequestClose={() => setIsCalendarVisible(false)}>
        <View style={styles.calendarOverlay}>
          <Animated.View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={[styles.calendarYearText, { color: colors.textMuted }]}>{calendarMonth.getFullYear()}</Text>
                <Text style={[styles.calendarMonthTitle, { color: colors.text }]}>{calendarMonth.toLocaleDateString('en-US', { month: 'long' })}</Text>
              </View>
              <View style={styles.calendarNavActions}>
                <Pressable style={[styles.calendarNavBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]} onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}><Text style={[styles.calendarNavIcon, { color: colors.text }]}>‹</Text></Pressable>
                <Pressable style={[styles.calendarNavBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]} onPress={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}><Text style={[styles.calendarNavIcon, { color: colors.text }]}>›</Text></Pressable>
              </View>
            </View>
            <View style={weekdayRowStyles.weekdayRow}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => (<Text key={label} style={[styles.weekdayText, { color: colors.textMuted }]}>{label}</Text>))}</View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                const isSelected = isSameDay(dayDate, selectedDate);
                const isToday = isSameDay(dayDate, new Date());
                return (
                  <Pressable key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${day}`} style={({ pressed }) => [styles.dayCell, styles.dayButton, isSelected && { backgroundColor: colors.primary }, pressed && !isSelected && { backgroundColor: colors.primary + '20' }]} onPress={() => { setSelectedDate(dayDate); setIsCalendarVisible(false); }}>
                    <Text style={[styles.dayText, { color: colors.text }, isSelected && { color: '#fff', fontWeight: '800' }, isToday && !isSelected && { color: colors.primary, fontWeight: '800' }]}>{day}</Text>
                    {isToday && !isSelected && <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.calendarFooter}>
              <Pressable style={[styles.cancelCalendarBtn, { backgroundColor: colors.background }]} onPress={() => setIsCalendarVisible(false)}><Text style={[styles.cancelCalendarText, { color: colors.textMuted }]}>Cancel</Text></Pressable>
              <Pressable style={[styles.calendarTodayButton, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '15' }]} onPress={() => { const today = new Date(); setSelectedDate(today); setCalendarMonth(startOfMonth(today)); setIsCalendarVisible(false); }}><Text style={[styles.calendarTodayText, { color: colors.primary }]}>Go to Today</Text></Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const weekdayRowStyles = {
  weekdayRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 } as any,
};

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 50 },
  burstCircle: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32, paddingHorizontal: 20 },
  typeTabsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 4, flex: 1, maxWidth: 340, height: 58, position: 'relative', borderWidth: 1 },
  typeIndicator: { position: 'absolute', top: 4, bottom: 4, borderRadius: 24, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  typeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  typeTabEmoji: { fontSize: 16, marginRight: 6 },
  typeTabLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  contentScroll: { flex: 1 },
  contentScrollContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  amountWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', marginBottom: 32, marginTop: 10, paddingVertical: 28, borderRadius: 28, borderWidth: 1 },
  currency: { fontSize: 44, marginRight: 10, fontWeight: '700' },
  amountText: { fontSize: 60, fontWeight: '800', letterSpacing: -1 },
  glassInputBox: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  inputValue: { fontSize: 15, fontWeight: '600' },
  noteInput: { fontSize: 16, fontWeight: '500', paddingVertical: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 14 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  categoryIcon: { fontSize: 18, marginRight: 8 },
  categoryChipText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: { marginTop: 32, borderRadius: 24, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  exitButtonContainer: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 44 : 40, 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 999 
  },
  exitButton: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#070817', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.15)', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 10, 
    elevation: 12 
  },
  exitButtonIcon: { color: '#ffffff', fontSize: 26, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  calculatorCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 32, borderTopWidth: 1, width: '100%' },
  calculatorHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  calculatorAmountDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32, minHeight: 80 },
  calculatorAmountColumn: { alignItems: 'center', justifyContent: 'center' },
  calculatorExpressionText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  calculatorCurrency: { fontSize: 32, marginRight: 8, fontWeight: '700', marginTop: 4 },
  calculatorAmountText: { fontSize: 48, fontWeight: '800', textAlign: 'center', includeFontPadding: false, lineHeight: 58 },
  keypadWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  keypadButton: { width: '23%', aspectRatio: 1, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 12 },
  keypadButtonText: { fontSize: 26, fontWeight: '700', textAlign: 'center', includeFontPadding: false, lineHeight: 32, textAlignVertical: 'center' },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(4, 6, 18, 0.9)', justifyContent: 'center', paddingHorizontal: 24 },
  calendarCard: { borderRadius: 36, borderWidth: 1, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  calendarYearText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  calendarMonthTitle: { fontSize: 26, fontWeight: '800' },
  calendarNavActions: { flexDirection: 'row', gap: 10 },
  calendarNavBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  calendarNavIcon: { fontSize: 28, fontWeight: '300' },
  weekdayText: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  dayButton: { borderRadius: 16 },
  dayText: { fontSize: 16, fontWeight: '600' },
  todayIndicator: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  calendarFooter: { flexDirection: 'row', marginTop: 28, gap: 14 },
  cancelCalendarBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 20 },
  cancelCalendarText: { fontSize: 15, fontWeight: '700' },
  calendarTodayButton: { flex: 2, borderRadius: 20, borderWidth: 1, paddingVertical: 16, alignItems: 'center' },
  calendarTodayText: { fontSize: 15, fontWeight: '800' },
  walletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  walletEmoji: { fontSize: 18, marginRight: 8 },
  walletModalCard: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderTopWidth: 1,
    width: '100%',
    maxHeight: windowSize.height * 0.72,
  },
  walletList: {
    marginTop: 16,
    flexGrow: 0,
    maxHeight: windowSize.height * 0.48,
  },
  walletListContent: {
    paddingBottom: 8,
  },
  walletItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  walletIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletIcon: { fontSize: 20 },
  walletNameText: { fontSize: 16, fontWeight: '700', flex: 1 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#fff', fontSize: 12, fontWeight: '800' },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  receiptActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  receiptActionButton: {
    flex: 1,
  },
  snapReceiptButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6f53ff',
    backgroundColor: '#232756',
  },
  snapReceiptButtonText: {
    color: '#b7bfff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  uploadReceiptButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f6bff',
    backgroundColor: '#1f2c5a',
  },
  uploadReceiptButtonText: {
    color: '#bfd2ff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  receiptPreviewWrap: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  receiptPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  receiptPreviewLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
