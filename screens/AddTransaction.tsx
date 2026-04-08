import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { insertTransaction } from '../db/sqlite';
import { config } from '../config/appConfig';
import type { RootStackParamList } from '../navigation/RootStackNavigator';

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
const keypadRows = [
  ['1', '2', '3', 'Del'],
  ['4', '5', '6', 'C'],
  ['7', '8', '9', '-'],
  ['0', '00', '.', '+'],
];

function evaluateExpression(expression: string): number {
  if (!expression.trim()) {
    return 0;
  }

  const sanitized = expression.replace(/\s+/g, '').replace(/[^0-9.+-]/g, '');
  const trimmed = sanitized.replace(/[+-]+$/, '');

  if (!trimmed) {
    return 0;
  }

  const parts = trimmed.split(/([+-])/).filter(Boolean);
  let total = Number(parts[0]);

  if (Number.isNaN(total)) {
    return 0;
  }

  for (let index = 1; index < parts.length; index += 2) {
    const operator = parts[index];
    const rawValue = parts[index + 1] ?? '0';
    const value = Number(rawValue);

    if (Number.isNaN(value)) {
      continue;
    }

    if (operator === '+') {
      total += value;
    } else {
      total -= value;
    }
  }

  return total;
}

export default function AddTransaction({ navigation, route }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.key ?? 'food');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
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

  const parsedAmount = useMemo(() => evaluateExpression(amount), [amount]);

  const onKeypadTap = (key: string) => {
    if (!key) {
      return;
    }

    if (key === 'Del') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }

    if (key === 'C') {
      setAmount('');
      return;
    }

    if (key === '+' || key === '-') {
      setAmount(prev => {
        if (!prev) {
          return prev;
        }

        if (/[+-]$/.test(prev)) {
          return `${prev.slice(0, -1)}${key}`;
        }

        return `${prev}${key}`;
      });
      return;
    }

    if (key === '.') {
      setAmount(prev => {
        const currentSegment = prev.split(/[+-]/).pop() ?? '';
        if (currentSegment.includes('.')) {
          return prev;
        }
        if (!prev) {
          return '0.';
        }
        return `${prev}.`;
      });
      return;
    }

    setAmount(prev => {
      const next = `${prev}${key}`;
      if (!prev && key === '00') {
        return '0';
      }
      if (prev === '0' && key !== '00' && key !== '.') {
        return key;
      }
      if (next.length > 18) {
        return prev;
      }
      return next;
    });
  };

  const onSave = async () => {
    if (!amount.trim() || /[+-]$/.test(amount) || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      await insertTransaction({
        amount: parsedAmount,
        type: transactionType,
        category: selectedCategory,
        date: new Date().toISOString(),
        note: note.trim(),
        receiptUrl: '',
        userId: config.demoUserId,
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
          <Text style={styles.header}>Add Transaction</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeChip, transactionType === 'expense' ? styles.typeChipActive : null]}
          onPress={() => setTransactionType('expense')}
        >
          <Text style={[styles.typeChipText, transactionType === 'expense' ? styles.typeChipTextActive : null]}>
            Expense
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeChip, transactionType === 'income' ? styles.typeChipActive : null]}
          onPress={() => setTransactionType('income')}
        >
          <Text style={[styles.typeChipText, transactionType === 'income' ? styles.typeChipTextActive : null]}>
            Income
          </Text>
        </Pressable>
        </View>

        <View style={styles.amountWrap}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          value={amount || '0.00'}
          placeholder="0.00"
          placeholderTextColor="#737aa8"
          editable={false}
          showSoftInputOnFocus={false}
          style={styles.amountInput}
        />
        </View>

        {/[+-]/.test(amount) ? <Text style={styles.calcText}>= {parsedAmount.toFixed(2)}</Text> : null}

        <View style={styles.noteBox}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add note (optional)"
          placeholderTextColor="#7780b2"
          style={styles.noteInput}
        />
        </View>

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

        <View style={styles.keypadWrap}>
        {keypadRows.flat().map((key, index) => {
          if (!key) {
            return <View key={`blank-${index}`} style={styles.keypadButton} />;
          }

          return (
            <Pressable
              key={key}
              style={[
                styles.keypadButton,
                key === '+' || key === '-' ? styles.keypadTypeButton : null,
                key === 'C' ? styles.keypadWarnButton : null,
              ]}
              onPress={() => onKeypadTap(key)}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  key === '+' || key === '-' ? styles.keypadTypeButtonText : null,
                  key === 'C' ? styles.keypadWarnButtonText : null,
                ]}
              >
                {key}
              </Text>
            </Pressable>
          );
        })}
        </View>

        <Pressable style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]} onPress={onSave} disabled={isSaving}>
          <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save Transaction'}</Text>
        </Pressable>

        <View style={styles.homeIndicator} />
      </Animated.View>
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
  typeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  typeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#161a45',
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  typeChipActive: {
    borderColor: '#8a75ff',
    backgroundColor: '#6e57ff',
  },
  typeChipText: {
    color: '#9da4da',
    fontWeight: '600',
  },
  typeChipTextActive: {
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
  placeholder: {
    width: 28,
    height: 28,
  },
  header: {
    color: '#f5f7ff',
    fontSize: 18,
    fontWeight: '700',
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
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  calcText: {
    textAlign: 'center',
    color: '#9ea6df',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#131741',
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  keypadButton: {
    width: '23%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b417f',
    backgroundColor: '#222957',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 48,
  },
  keypadButtonText: {
    color: '#e9ecff',
    fontSize: 18,
    fontWeight: '700',
  },
  keypadTypeButton: {
    backgroundColor: '#2b2e53',
    borderColor: '#52588f',
  },
  keypadTypeButtonText: {
    color: '#aab1e4',
    fontSize: 22,
    lineHeight: 24,
  },
  keypadWarnButton: {
    borderColor: '#81405d',
    backgroundColor: '#3a1e30',
  },
  keypadWarnButtonText: {
    color: '#ff86a6',
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
});
