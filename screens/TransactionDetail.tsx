import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, StatusBar } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteTransaction, updateTransaction } from '../services/transactionApi';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, isDark } = useTheme();
  const { transaction } = route.params;

  const [amount, setAmount] = useState(String(transaction.amount));
  const [note, setNote] = useState(transaction.note ?? '');
  const [category, setCategory] = useState(transaction.category);
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(transaction.type);
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
        type: type as any,
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <Text style={[styles.label, { color: colors.textMuted }]}>Amount</Text>
      <View style={[styles.amountWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.currency, { color: colors.primary }]}>$</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted + '80'}
        />
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Type</Text>
      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, type === 'expense' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setType('expense')}
        >
          <Text style={[styles.typeText, { color: colors.textMuted }, type === 'expense' && { color: '#fff' }]}>Expense</Text>
        </Pressable>
        <Pressable
          style={[styles.typeChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, type === 'income' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setType('income')}
        >
          <Text style={[styles.typeText, { color: colors.textMuted }, type === 'income' && { color: '#fff' }]}>Income</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
      <View style={styles.categoryWrap}>
        {categoryOptions.map(item => (
          <Pressable
            key={item}
            style={[styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, item === category && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, { color: colors.textMuted }, item === category && { color: '#fff' }]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Note</Text>
      <View style={[styles.noteWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor={colors.textMuted + '80'}
          style={[styles.noteInput, { color: colors.text }]}
          multiline
        />
      </View>

      <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary, borderColor: colors.primary }, isSaving && styles.disabledButton]} onPress={onSave} disabled={isSaving}>
        <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>

      <Pressable style={[styles.deleteButton, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' }, isDeleting && styles.disabledButton]} onPress={onDelete} disabled={isDeleting}>
        <Text style={[styles.deleteButtonText, { color: colors.danger }]}>{isDeleting ? 'Deleting...' : 'Delete Transaction'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  currency: {
    fontWeight: '700',
    fontSize: 24,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 10,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  typeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeText: {
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  noteWrap: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
