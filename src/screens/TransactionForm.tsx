import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { TransactionsStackParamList } from '../navigation/types';
import {
  getTransactionById,
  removeTransaction,
  saveTransaction,
} from '../services/transactions';
import type { TransactionType } from '../types/transactions';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'TransactionForm'>;

const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Savings', 'Entertainment', 'Other'];

const TransactionFormScreen = ({ navigation, route }: Props) => {
  const { isLoggedIn } = useAuth();
  const transactionId = route.params?.transactionId;
  const [loading, setLoading] = useState(Boolean(transactionId));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      return;
    }

    let active = true;

    const loadTransaction = async () => {
      const existing = await getTransactionById(transactionId);

      if (!active || !existing) {
        setLoading(false);
        return;
      }

      setAmount(String(existing.amount));
      setCategory(existing.category);
      setNote(existing.note);
      setType(existing.type);
      setOccurredOn(existing.occurredOn);
      setLoading(false);
    };

    loadTransaction();

    return () => {
      active = false;
    };
  }, [transactionId]);

  const onSave = async () => {
    if (!isLoggedIn) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await saveTransaction(
        '1',
        {
          amount: parsedAmount,
          category,
          note,
          type,
          occurredOn,
        },
        transactionId,
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Save failed', error?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!transactionId) {
      return;
    }

    Alert.alert('Delete transaction', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(transactionId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loaderCard}>
          <Text style={styles.loaderText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{transactionId ? 'Edit Transaction' : 'New Transaction'}</Text>
          <Text style={styles.subtitle}>
            Update a past record or add a fresh entry to your cloud ledger.
          </Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsWrap}>
            {categories.map(item => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item && styles.chipActive]}>
                <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {(['expense', 'income'] as TransactionType[]).map(item => (
              <Pressable
                key={item}
                onPress={() => setType(item)}
                style={[styles.typeButton, type === item && styles.typeButtonActive]}>
                <Text style={[styles.typeText, type === item && styles.typeTextActive]}>
                  {item === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={occurredOn}
            onChangeText={setOccurredOn}
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            multiline
            placeholder="Add a note"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
          />

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={onSave}
            disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Saving...' : transactionId ? 'Update Transaction' : 'Create Transaction'}
            </Text>
          </Pressable>

          {transactionId ? (
            <Pressable style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>Delete Transaction</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    color: '#0F172A',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#0F172A',
  },
  chipText: {
    color: '#334155',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#F8FAFC',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#0F172A',
  },
  typeText: {
    color: '#334155',
    fontWeight: '700',
  },
  typeTextActive: {
    color: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#052E16',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    marginTop: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '800',
  },
  loaderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransactionFormScreen;