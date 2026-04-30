import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES } from '../constants/categories';
import { getWallets } from '../services/walletApi';
import { getSelectedWalletId, setSelectedWalletId } from '../services/walletService';
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
  type RecurringFrequency,
  type RecurringTransaction,
  type RecurringTransactionInput,
} from '../services/recurringTransactionApi';
import { formatCurrency } from '../services/transactionService';
import type { Wallet } from '../types/transaction';

const FREQUENCIES: Array<{ value: RecurringFrequency; label: string; subtitle: string }> = [
  { value: 'weekly', label: 'Weekly', subtitle: 'Every 7 days' },
  { value: 'biweekly', label: 'Biweekly', subtitle: 'Every 14 days' },
  { value: 'monthly', label: 'Monthly', subtitle: 'Rent and bills' },
  { value: 'quarterly', label: 'Quarterly', subtitle: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', subtitle: 'Annual charges' },
];

const TRANSACTION_TYPES: Array<{ value: 'expense' | 'income'; label: string; emoji: string }> = [
  { value: 'expense', label: 'Expense', emoji: '👛' },
  { value: 'income', label: 'Income', emoji: '💰' },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toInputDate(dateValue?: string): string {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function toIsoDate(dateValue: string): string {
  const parsed = new Date(`${dateValue}T09:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Please enter a valid date in YYYY-MM-DD format');
  }
  return parsed.toISOString();
}

function formatRelativeDate(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNextDefaultDate(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return toInputDate(next.toISOString());
}

function scheduleToInput(schedule: RecurringTransaction): RecurringTransactionInput {
  return {
    amount: schedule.amount,
    type: schedule.type,
    category: schedule.category,
    note: schedule.note,
    frequency: schedule.frequency,
    intervalCount: schedule.intervalCount,
    nextRunDate: schedule.nextRunDate,
    endDate: schedule.endDate,
    walletId: schedule.walletId,
    isActive: schedule.isActive,
  };
}

export default function RecurringTransactionsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletIdState] = useState<string | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);

  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].key);
  const [selectedFrequency, setSelectedFrequency] = useState<RecurringFrequency>('monthly');
  const [note, setNote] = useState('');
  const [intervalCount, setIntervalCount] = useState('1');
  const [nextRunDate, setNextRunDate] = useState(getNextDefaultDate());
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const hasLoadedRef = useRef(false);

  const selectedWallet = useMemo(
    () => wallets.find(wallet => String(wallet.id) === String(selectedWalletId)) || null,
    [wallets, selectedWalletId],
  );

  const loadData = useCallback(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [fetchedWallets, fetchedSchedules, savedWalletId] = await Promise.all([
          getWallets(),
          getRecurringTransactions(),
          getSelectedWalletId(),
        ]);

        if (!isMounted) return;

        setWallets(fetchedWallets);
        setSchedules(fetchedSchedules);

        const walletId = savedWalletId && savedWalletId !== 'all'
          ? String(savedWalletId)
          : String(fetchedWallets[0]?.id || '');
        setSelectedWalletIdState(walletId || null);
        if (walletId) {
          await setSelectedWalletId(walletId);
        }

        hasLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load recurring transactions:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }

    void fetchData();
    return () => { isMounted = false; };
  }, []);

  useFocusEffect(loadData);

  useEffect(() => {
    if (!editingId && !selectedWalletId && wallets.length > 0) {
      setSelectedWalletIdState(String(wallets[0].id));
    }
  }, [editingId, selectedWalletId, wallets]);

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setTransactionType('expense');
    setSelectedCategory(CATEGORIES[0].key);
    setSelectedFrequency('monthly');
    setNote('');
    setIntervalCount('1');
    setNextRunDate(getNextDefaultDate());
    setEndDate('');
    setIsActive(true);
  };

  const handleSubmit = async () => {
    const amountValue = Number(amount);
    const countValue = Math.max(1, Number(intervalCount) || 1);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount greater than zero.');
      return;
    }

    if (!nextRunDate) {
      Alert.alert('Missing date', 'Choose the next run date.');
      return;
    }

    let nextRunIso = '';
    let endRunIso: string | undefined;

    try {
      nextRunIso = toIsoDate(nextRunDate);
      endRunIso = endDate.trim() ? toIsoDate(endDate.trim()) : undefined;
    } catch (err: any) {
      Alert.alert('Invalid date', err.message || 'Please enter valid dates.');
      return;
    }

    const input: RecurringTransactionInput = {
      amount: amountValue,
      type: transactionType,
      category: selectedCategory,
      note: note.trim(),
      frequency: selectedFrequency,
      intervalCount: countValue,
      nextRunDate: nextRunIso,
      endDate: endRunIso,
      walletId: selectedWalletId || undefined,
      isActive,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await updateRecurringTransaction(editingId, input);
      } else {
        await createRecurringTransaction(input);
      }
      resetForm();
      loadData();
      Alert.alert('Saved', editingId ? 'Recurring schedule updated.' : 'Recurring schedule created.');
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save recurring transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (schedule: RecurringTransaction) => {
    setEditingId(schedule.id);
    setAmount(String(schedule.amount));
    setTransactionType(schedule.type);
    setSelectedCategory(schedule.category);
    setSelectedFrequency(schedule.frequency);
    setNote(schedule.note || '');
    setIntervalCount(String(schedule.intervalCount || 1));
    setNextRunDate(toInputDate(schedule.nextRunDate) || getNextDefaultDate());
    setEndDate(schedule.endDate ? toInputDate(schedule.endDate) : '');
    setIsActive(schedule.isActive);
    if (schedule.walletId) {
      setSelectedWalletIdState(schedule.walletId);
      void setSelectedWalletId(schedule.walletId);
    }
  };

  const handleDelete = (schedule: RecurringTransaction) => {
    Alert.alert('Delete recurring schedule', `Remove "${schedule.category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecurringTransaction(schedule.id);
            loadData();
            if (editingId === schedule.id) {
              resetForm();
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete schedule.');
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (schedule: RecurringTransaction) => {
    try {
      await updateRecurringTransaction(schedule.id, {
        ...scheduleToInput(schedule),
        isActive: !schedule.isActive,
      });
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update schedule.');
    }
  };

  const activeSchedules = schedules.filter(schedule => schedule.isActive).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.backText, { color: colors.text }]}>←</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Recurring Bills</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Model rent, subscriptions, and paychecks automatically.</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Schedules</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{schedules.length}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Active</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{activeSchedules}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Wallet</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>{selectedWallet?.name || 'None'}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 18 }}>
          <Pressable style={[styles.addRecurringBtn, { backgroundColor: colors.primary }]} onPress={() => setIsFormModalVisible(true)}>
            <Text style={[styles.addRecurringText, { color: '#fff' }]}>+ Add Recurring Bill</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedules</Text>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : schedules.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.emptyIcon}>⏰</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recurring transactions yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Add rent, subscriptions, or salary so they post automatically on schedule.</Text>
          </View>
        ) : (
          schedules.map(schedule => {
            const cat = CATEGORIES.find(item => item.key === schedule.category);
            return (
              <View key={schedule.id} style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Pressable onPress={() => handleEdit(schedule)} style={styles.scheduleMain}>
                  <View style={[styles.scheduleIcon, { backgroundColor: colors.primaryBg }]}>
                    <Text style={styles.scheduleEmoji}>{cat?.icon || '🔁'}</Text>
                  </View>
                  <View style={styles.scheduleContent}>
                    <View style={styles.scheduleTopRow}>
                      <Text style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={1}>
                        {cat?.label || schedule.category}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: schedule.isActive ? colors.success + '20' : colors.textMuted + '20' }]}>
                        <Text style={[styles.statusPillText, { color: schedule.isActive ? colors.success : colors.textMuted }]}>
                          {schedule.isActive ? 'Active' : 'Paused'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scheduleMeta, { color: colors.textMuted }]} numberOfLines={2}>
                      {schedule.frequency} · every {schedule.intervalCount} · next {formatRelativeDate(schedule.nextRunDate)}
                    </Text>
                    <Text style={[styles.scheduleAmount, { color: schedule.type === 'income' ? colors.success : colors.text }]}>
                      {schedule.type === 'income' ? '+' : '-'}{formatCurrency(schedule.amount)}
                    </Text>
                    {schedule.note ? <Text style={[styles.scheduleNote, { color: colors.textMuted }]} numberOfLines={1}>{schedule.note}</Text> : null}
                  </View>
                </Pressable>

                <View style={styles.scheduleActions}>
                  <Pressable onPress={() => handleToggleActive(schedule)} style={[styles.actionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>{schedule.isActive ? 'Pause' : 'Resume'}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(schedule)} style={[styles.actionBtn, { borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' }]}>
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
        </ScrollView>

        {/* Form Modal for creating/editing recurring schedules */}
        <Modal visible={isFormModalVisible} transparent animationType="slide" onRequestClose={() => { setIsFormModalVisible(false); resetForm(); }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setIsFormModalVisible(false); resetForm(); }}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]} onPress={e => e.stopPropagation()}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{editingId ? 'Edit Schedule' : 'New Schedule'}</Text>
                {editingId ? (
                  <Pressable onPress={resetForm}>
                    <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Amount</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted + '60'}
                  style={[styles.amountInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                />
              </View>

              <View style={styles.typeRow}>
                {TRANSACTION_TYPES.map(typeItem => {
                  const active = transactionType === typeItem.value;
                  return (
                    <Pressable
                      key={typeItem.value}
                      onPress={() => setTransactionType(typeItem.value)}
                      style={[
                        styles.typeChip,
                        { borderColor: colors.cardBorder, backgroundColor: colors.background },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.typeEmoji}>{typeItem.emoji}</Text>
                      <Text style={[styles.typeLabel, { color: active ? '#fff' : colors.text }]}>{typeItem.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map(cat => {
                  const active = selectedCategory === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setSelectedCategory(cat.key)}
                      style={[
                        styles.categoryChip,
                        { borderColor: colors.cardBorder, backgroundColor: colors.background },
                        active && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={[styles.categoryLabel, { color: active ? colors.primary : colors.text }]}>{cat.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Frequency</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCIES.map(freq => {
                  const active = selectedFrequency === freq.value;
                  return (
                    <Pressable
                      key={freq.value}
                      onPress={() => setSelectedFrequency(freq.value)}
                      style={[
                        styles.frequencyCard,
                        { borderColor: colors.cardBorder, backgroundColor: colors.background },
                        active && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.frequencyLabel, { color: active ? colors.primary : colors.text }]}>{freq.label}</Text>
                      <Text style={[styles.frequencySubtitle, { color: colors.textMuted }]}>{freq.subtitle}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.halfInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Every</Text>
                  <TextInput
                    value={intervalCount}
                    onChangeText={setIntervalCount}
                    keyboardType="number-pad"
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted + '60'}
                  />
                </View>
                <View style={styles.halfInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Next run</Text>
                  <TextInput
                    value={nextRunDate}
                    onChangeText={setNextRunDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted + '60'}
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.halfInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>End date</Text>
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="Optional"
                    placeholderTextColor={colors.textMuted + '60'}
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                  />
                </View>
                <View style={styles.halfInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Status</Text>
                  <Pressable
                    onPress={() => setIsActive(prev => !prev)}
                    style={[
                      styles.statusToggle,
                      { borderColor: colors.cardBorder, backgroundColor: colors.background },
                      isActive && { backgroundColor: colors.success + '20', borderColor: colors.success },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: isActive ? colors.success : colors.textMuted }]}>{isActive ? 'Active' : 'Paused'}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Note</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Rent, salary, Netflix, ..."
                  placeholderTextColor={colors.textMuted + '60'}
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                  multiline
                />
              </View>

              <Pressable
                onPress={() => setIsWalletModalVisible(true)}
                style={[styles.walletPicker, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              >
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Wallet</Text>
                  <Text style={[styles.walletValue, { color: colors.text }]}>{selectedWallet?.name || 'Select wallet'}</Text>
                </View>
                <Text style={[styles.walletChevron, { color: colors.textMuted }]}>›</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  await handleSubmit();
                  setIsFormModalVisible(false);
                }}
                disabled={isSaving}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.8 : 1 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Update Schedule' : 'Create Schedule'}</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

      <Modal visible={isWalletModalVisible} transparent animationType="fade" onRequestClose={() => setIsWalletModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsWalletModalVisible(false)}>
          <View style={[styles.walletModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Wallet</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.walletList}>
              {wallets.map(wallet => {
                const active = String(wallet.id) === String(selectedWalletId);
                return (
                  <Pressable
                    key={wallet.id}
                    onPress={async () => {
                      setSelectedWalletIdState(String(wallet.id));
                      await setSelectedWalletId(String(wallet.id));
                      setIsWalletModalVisible(false);
                    }}
                    style={[
                      styles.walletRow,
                      { backgroundColor: active ? colors.primaryBg : colors.background, borderColor: active ? colors.primary : colors.cardBorder },
                    ]}
                  >
                    <View style={[styles.walletIconBox, { backgroundColor: wallet.color + '25' }]}>
                      <Text style={styles.walletIcon}>{wallet.icon}</Text>
                    </View>
                    <View style={styles.walletRowText}>
                      <Text style={[styles.walletRowTitle, { color: colors.text }]}>{wallet.name}</Text>
                      <Text style={[styles.walletRowSubtitle, { color: colors.textMuted }]}>{active ? 'Current wallet' : 'Tap to select'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  backText: { fontSize: 22, fontWeight: '400' },
  headerCopy: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 4, lineHeight: 20 },
  summaryCard: { flexDirection: 'row', borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: 'center' },
  summaryStat: { flex: 1 },
  summaryDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  formCard: { borderRadius: 28, borderWidth: 1, padding: 18, marginBottom: 26 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  cancelText: { fontSize: 13, fontWeight: '700' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  amountInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, fontWeight: '800' },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 8 },
  typeEmoji: { fontSize: 18 },
  typeLabel: { fontSize: 13, fontWeight: '800' },
  chipRow: { gap: 10, paddingBottom: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, gap: 8 },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '700' },
  frequencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  frequencyCard: { width: '48%', borderRadius: 18, borderWidth: 1, padding: 12 },
  frequencyLabel: { fontSize: 14, fontWeight: '800' },
  frequencySubtitle: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  rowInputs: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  halfInputWrap: { flex: 1 },
  smallInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700' },
  noteInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 82, textAlignVertical: 'top', fontSize: 14, fontWeight: '600' },
  statusToggle: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  statusText: { fontSize: 14, fontWeight: '800' },
  walletPicker: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  walletValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  walletChevron: { fontSize: 24, fontWeight: '300' },
  saveBtn: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  loadingWrap: { paddingVertical: 28, alignItems: 'center' },
  emptyCard: { borderRadius: 24, borderWidth: 1, padding: 22, alignItems: 'center' },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  scheduleCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14 },
  scheduleMain: { flexDirection: 'row', gap: 12 },
  scheduleIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scheduleEmoji: { fontSize: 24 },
  scheduleContent: { flex: 1 },
  scheduleTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  scheduleTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  scheduleMeta: { fontSize: 12, fontWeight: '600', marginTop: 5, lineHeight: 18 },
  scheduleAmount: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  scheduleNote: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  scheduleActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontWeight: '800' },
  addRecurringBtn: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  addRecurringText: { fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxHeight: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderTopWidth: 1 },
  walletModal: { width: '100%', maxHeight: '70%', borderRadius: 28, borderWidth: 1, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  walletList: { maxHeight: 360 },
  walletRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 12, marginBottom: 10 },
  walletIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  walletIcon: { fontSize: 22 },
  walletRowText: { flex: 1 },
  walletRowTitle: { fontSize: 15, fontWeight: '800' },
  walletRowSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});