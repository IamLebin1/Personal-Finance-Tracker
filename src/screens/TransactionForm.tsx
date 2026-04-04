import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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

const categories = [
  { name: 'Food', icon: 'silverware-fork-knife' },
  { name: 'Transport', icon: 'car-outline' },
  { name: 'Shopping', icon: 'shopping-outline' },
  { name: 'Bills', icon: 'file-document-outline' },
  { name: 'Health', icon: 'heart-pulse' },
];

const keypad = ['1', '2', '3', 'BACK', '4', '5', '6', '-', '7', '8', '9', '+', '.', '0'];

const TransactionFormScreen = ({ navigation, route }: Props) => {
  const { isLoggedIn } = useAuth();
  const transactionId = route.params?.transactionId;
  const [loading, setLoading] = useState(Boolean(transactionId));
  const [amount, setAmount] = useState('84.00');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [occurredOn] = useState(new Date().toISOString().slice(0, 10));
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

  const onKeyPress = (key: string) => {
    if (key === 'BACK') {
      setAmount(prev => {
        if (prev.length <= 1) {
          return '0';
        }

        return prev.slice(0, -1);
      });
      return;
    }

    if (key === '+') {
      setType('income');
      return;
    }

    if (key === '-') {
      setType('expense');
      return;
    }

    if (key === '.') {
      setAmount(prev => {
        if (prev.includes('.')) {
          return prev;
        }

        return prev + '.';
      });
      return;
    }

    setAmount(prev => {
      if (prev === '0') {
        return key;
      }

      if (prev.length >= 12) {
        return prev;
      }

      return prev + key;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loaderCard}>
          <Text style={styles.loaderText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            const parent = navigation.getParent();

            if (navigation.canGoBack()) {
              navigation.goBack();
            } else if (parent) {
              parent.navigate('TransactionsStack' as never);
            }
          }}>
          <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{transactionId ? 'Edit Transaction' : 'Add Transaction'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onSave} disabled={submitting}>
          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.amountContainer}>
        <View style={styles.amountWrapper}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            keyboardType="numeric"
            editable={false}
          />
        </View>

        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typePill, type === 'expense' && styles.typePillActive]}
            onPress={() => setType('expense')}>
            <MaterialCommunityIcons name="arrow-down" size={16} color="#FCA5A5" />
            <Text style={styles.typePillText}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typePill, type === 'income' && styles.typePillActive]}
            onPress={() => setType('income')}>
            <MaterialCommunityIcons name="arrow-up" size={16} color="#86EFAC" />
            <Text style={styles.typePillText}>Income</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.name}
              style={styles.categoryItem}
              onPress={() => setCategory(cat.name)}
            >
              <View
                style={[
                  styles.categoryIconBox,
                  category === cat.name && styles.categoryIconActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={24}
                  color={category === cat.name ? '#FFFFFF' : '#C4B5FD'}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.name && styles.categoryLabelActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.noteWrap}>
        <MaterialCommunityIcons name="note-text-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note"
          placeholderTextColor="#64748B"
          value={note}
          onChangeText={setNote}
        />
      </View>

      <View style={styles.keypadSection}>
        <View style={styles.keypadGrid}>
          {keypad.map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.key,
                key === '+' && type === 'income' && styles.keyActive,
                key === '-' && type === 'expense' && styles.keyActive,
              ]}
              onPress={() => onKeyPress(key)}
            >
              {key === 'BACK' ? (
                <MaterialCommunityIcons name="backspace-outline" size={22} color="#FFFFFF" />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.saveButton, !transactionId && styles.saveButtonFull]}
            onPress={onSave}
            disabled={submitting}
          >
            <MaterialCommunityIcons name="content-save-check-outline" size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{submitting ? ' Saving...' : ' Save'}</Text>
          </TouchableOpacity>

          {transactionId ? (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.indicator} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131221',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 26,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    color: '#6366f1',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 10,
  },
  amountInput: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: 'bold',
    minWidth: 180,
  },
  typeRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typePillActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.25)',
  },
  typePillText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  categorySection: {
    height: 96,
    marginBottom: 12,
  },
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1E1C30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  noteInput: {
    flex: 1,
    marginLeft: 8,
    color: '#E2E8F0',
    fontSize: 14,
  },
  categoryScroll: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1E1C30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  categoryIconActive: {
    backgroundColor: '#6366f1',
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  keypadSection: {
    flex: 1,
    backgroundColor: 'rgba(30,28,48,0.5)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '22%',
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  keyActive: {
    backgroundColor: '#6366f1',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  saveButton: {
    width: '48%',
    height: 56,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  saveButtonFull: {
    width: '100%',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: '48%',
    height: 56,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    marginBottom: 10,
  },
  deleteButtonText: {
    color: '#FCA5A5',
    fontSize: 17,
    fontWeight: 'bold',
  },
  indicator: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 20,
  },
  loaderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransactionFormScreen;