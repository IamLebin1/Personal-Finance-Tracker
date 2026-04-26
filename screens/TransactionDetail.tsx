import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteTransaction, updateTransaction } from '../services/transactionApi';
import type { RootStackParamList } from '../navigation/RootStackNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>;

const categoryOptions = [
  'food',
  'transport',
  'shopping',
  'bills',
  'health',
  'salary',
  'freelance',
  'groceries',
  'utilities',
];

export default function TransactionDetail({ route, navigation }: Props) {
  const { transaction } = route.params;

  const [amount, setAmount] = useState(String(transaction.amount));
  const [note, setNote] = useState(transaction.note ?? '');
  const [category, setCategory] = useState(transaction.category);
  const [type, setType] = useState<'income' | 'expense'>(transaction.type);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onSave = async () => {
    const parsedAmount = Number(amount);
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction(transaction.id, {
        amount: parsedAmount,
        note: note.trim(),
        category,
        type,
      }, transaction);
      navigation.goBack();
    } catch {
      Alert.alert('Update failed', 'Could not update transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete transaction?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteTransaction(transaction.id);
            navigation.goBack();
          } catch {
            Alert.alert('Delete failed', 'Could not delete transaction. Please try again.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountWrap}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#7780b2"
        />
      </View>

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeChip, type === 'expense' ? styles.typeChipActive : null]}
          onPress={() => setType('expense')}
        >
          <Text style={[styles.typeText, type === 'expense' ? styles.typeTextActive : null]}>Expense</Text>
        </Pressable>
        <Pressable
          style={[styles.typeChip, type === 'income' ? styles.typeChipActive : null]}
          onPress={() => setType('income')}
        >
          <Text style={[styles.typeText, type === 'income' ? styles.typeTextActive : null]}>Income</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryWrap}>
        {categoryOptions.map(item => (
          <Pressable
            key={item}
            style={[styles.categoryChip, item === category ? styles.categoryChipActive : null]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, item === category ? styles.categoryTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Note</Text>
      <View style={styles.noteWrap}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor="#7780b2"
          style={styles.noteInput}
          multiline
        />
      </View>

      <Pressable style={[styles.primaryButton, isSaving ? styles.disabledButton : null]} onPress={onSave} disabled={isSaving}>
        <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>

      <Pressable style={[styles.deleteButton, isDeleting ? styles.disabledButton : null]} onPress={onDelete} disabled={isDeleting}>
        <Text style={styles.deleteButtonText}>{isDeleting ? 'Deleting...' : 'Delete Transaction'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0d22',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  label: {
    color: '#aeb5e0',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#171b46',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  currency: {
    color: '#7b65ff',
    fontWeight: '700',
    fontSize: 24,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    color: '#f4f6ff',
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 10,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  typeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#171b46',
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  typeChipActive: {
    borderColor: '#8a75ff',
    backgroundColor: '#6e57ff',
  },
  typeText: {
    color: '#9da4da',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#ffffff',
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
  categoryChipActive: {
    backgroundColor: '#6f58ff',
    borderColor: '#8b76ff',
  },
  categoryText: {
    color: '#97a0dc',
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  noteWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#31376e',
    backgroundColor: '#171b46',
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    color: '#d7dcff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8a75ff',
    backgroundColor: '#6f53ff',
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8f3554',
    backgroundColor: '#32152a',
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ff7f9d',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
