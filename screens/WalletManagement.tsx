import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  InteractionManager,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { getWallets, createWallet, updateWallet, deleteWallet } from '../services/walletApi';
import { getTransactionsByUser } from '../services/transactionApi';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../services/transactionService';
import type { Wallet } from '../types/transaction';

type Props = NativeStackScreenProps<RootStackParamList, 'WalletManagement'>;

const { height: windowHeight } = Dimensions.get('window');

export default function WalletManagement({ navigation }: Props) {
  const { colors } = useTheme();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isEditingWallet, setIsEditingWallet] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const hasLoadedRef = useRef(false);

  const loadWallets = useCallback(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(null)));
        const [fetchedWallets, transactions] = await Promise.all([
          getWallets(),
          getTransactionsByUser(),
        ]);

        const nextWalletBalances: Record<string, number> = {};
        fetchedWallets.forEach(wallet => {
          nextWalletBalances[String(wallet.id)] = Number(wallet.initialBalance || 0);
        });

        transactions.forEach(tx => {
          if (!tx.walletId) return;
          const key = String(tx.walletId);
          if (nextWalletBalances[key] === undefined) {
            nextWalletBalances[key] = 0;
          }
          nextWalletBalances[key] += tx.type === 'income' ? tx.amount : -tx.amount;
        });

        if (isMounted) {
          setWallets(fetchedWallets);
          setWalletBalances(nextWalletBalances);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to load wallets:', err);
        if (isMounted) {
          Alert.alert('Error', 'Could not load wallets.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        loadWallets();
      }
      return () => {};
    }, [loadWallets])
  );

  const handleAddWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Required', 'Please enter a wallet name.');
      return;
    }
    const amount = walletAmount.trim() ? Number(walletAmount.replace(/,/g, '')) : 0;
    if (Number.isNaN(amount) || amount < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    try {
      const wallet = await createWallet({ name: walletName.trim(), initialBalance: amount });
      setWallets(prev => [...prev, wallet]);
      setIsAddingWallet(false);
      setWalletName('');
      setWalletAmount('');
      Alert.alert('Success', 'Wallet created.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not create wallet.');
    }
  };

  const handleEditWallet = async () => {
    if (!selectedWallet || !walletName.trim()) {
      Alert.alert('Required', 'Please enter a wallet name.');
      return;
    }

    const amount = walletAmount.trim() ? Number(walletAmount.replace(/,/g, '')) : 0;
    if (Number.isNaN(amount) || amount < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    try {
      await updateWallet(selectedWallet.id, { name: walletName.trim(), initialBalance: amount });
      
      const oldInitialBalance = selectedWallet.initialBalance || 0;
      const balanceDifference = amount - oldInitialBalance;
      
      setWallets(prev =>
        prev.map(w =>
          w.id === selectedWallet.id ? { ...w, name: walletName.trim(), initialBalance: amount } : w
        )
      );
      
      setWalletBalances(prev => ({
        ...prev,
        [String(selectedWallet.id)]: (prev[String(selectedWallet.id)] || 0) + balanceDifference,
      }));
      
      setIsEditingWallet(false);
      setSelectedWallet(null);
      setWalletName('');
      setWalletAmount('');
      Alert.alert('Success', 'Wallet updated.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not update wallet.');
    }
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert('Delete Wallet', `Are you sure you want to delete "${wallet.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Alert.alert(
            'Final Confirmation',
            'Transactions in this wallet will be unassigned. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Permanently',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteWallet(wallet.id);
                    setWallets(prev => prev.filter(w => w.id !== wallet.id));
                    Alert.alert('Success', 'Wallet deleted.');
                  } catch (err) {
                    console.error(err);
                    Alert.alert('Error', 'Could not delete wallet.');
                  }
                },
              },
            ]
          );
        },
      },
    ]);
  };

  const handleEditPress = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setWalletName(wallet.name);
    setWalletAmount(String(wallet.initialBalance || 0));
    setIsEditingWallet(true);
  };

  const closeModals = () => {
    setIsAddingWallet(false);
    setIsEditingWallet(false);
    setSelectedWallet(null);
    setWalletName('');
    setWalletAmount('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Wallets</Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setWalletName('');
              setWalletAmount('');
              setIsAddingWallet(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Add Wallet</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : wallets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { fontSize: 48 }]}>👛</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>No wallets yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Create your first wallet to get started</Text>
          </View>
        ) : (
          <View style={styles.walletsList}>
            {wallets.map(wallet => (
              <View
                key={wallet.id}
                style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={styles.walletHeader}>
                  <View style={styles.walletIconAndName}>
                    <View style={[styles.walletIconBox, { backgroundColor: wallet.color + '20' }]}>
                      <Text style={styles.walletIcon}>{wallet.icon}</Text>
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={[styles.walletName, { color: colors.text }]}>{wallet.name}</Text>
                      <Text style={[styles.walletBalance, { color: colors.textMuted }]}>
                        Balance: {formatCurrency(walletBalances[String(wallet.id)] || 0, true)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.walletDate, { color: colors.textMuted }]}>
                    {new Date(wallet.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.walletActions, { borderTopColor: colors.cardBorder }]}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.primaryBg }]}
                    onPress={() => handleEditPress(wallet)}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]}
                    onPress={() => handleDeleteWallet(wallet)}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Wallet Modal */}
      <Modal visible={isAddingWallet} transparent animationType="slide" onRequestClose={closeModals}>
        <Pressable style={styles.modalOverlay} onPress={closeModals}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}
              onPress={e => e.stopPropagation()}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.textMuted + '40' }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Wallet</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Wallet Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="e.g., Savings"
                  placeholderTextColor={colors.textMuted + '60'}
                  value={walletName}
                  onChangeText={setWalletName}
                  autoFocus
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Initial Balance (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '60'}
                  value={walletAmount}
                  onChangeText={setWalletAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.btnCancel, { backgroundColor: colors.background }]} onPress={closeModals}>
                  <Text style={[styles.btnCancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnSave, { backgroundColor: colors.primary }, !walletName.trim() && { opacity: 0.5 }]}
                  onPress={handleAddWallet}
                  disabled={!walletName.trim()}
                >
                  <Text style={styles.btnSaveText}>Create</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal visible={isEditingWallet} transparent animationType="slide" onRequestClose={closeModals}>
        <Pressable style={styles.modalOverlay} onPress={closeModals}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}
              onPress={e => e.stopPropagation()}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.textMuted + '40' }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Wallet</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Wallet Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Wallet name"
                  placeholderTextColor={colors.textMuted + '60'}
                  value={walletName}
                  onChangeText={setWalletName}
                  autoFocus
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Balance</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '60'}
                  value={walletAmount}
                  onChangeText={setWalletAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.infoGroup}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Current Wallet Total</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatCurrency(walletBalances[String(selectedWallet?.id || '')] || 0, true)}
                </Text>
                <Text style={[styles.infoHint, { color: colors.textMuted }]}>This total includes transactions in this wallet.</Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.btnCancel, { backgroundColor: colors.background }]} onPress={closeModals}>
                  <Text style={[styles.btnCancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnSave, { backgroundColor: colors.primary }, !walletName.trim() && { opacity: 0.5 }]}
                  onPress={handleEditWallet}
                  disabled={!walletName.trim()}
                >
                  <Text style={styles.btnSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: 'flex-start' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loaderContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { fontSize: 14 },
  walletsList: { gap: 12 },
  walletCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  walletHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletIconAndName: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  walletIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  walletIcon: { fontSize: 24 },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  walletBalance: { fontSize: 12 },
  walletDate: { fontSize: 12, marginLeft: 8 },
  walletActions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { width: '100%' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, borderTopWidth: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  infoGroup: { padding: 12, marginBottom: 20, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  infoValue: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  infoHint: { fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnCancelText: { fontSize: 16, fontWeight: '600' },
  btnSave: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
