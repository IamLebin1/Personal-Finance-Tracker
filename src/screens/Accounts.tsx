import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import type { AccountDraft, AccountRecord, AccountStatus } from '../types/accounts';
import { fetchAccounts, saveAccount } from '../services/accounts';

type DraftState = {
  section: string;
  institution: string;
  accountName: string;
  accountType: string;
  balance: string;
  maskedNumber: string;
  status: AccountStatus;
  growthPct: string;
  accentColor: string;
};

const defaultDraft: DraftState = {
  section: 'Checking & Savings',
  institution: 'Chase Bank',
  accountName: 'CHASE CHECKING',
  accountType: 'Visa',
  balance: '12450.00',
  maskedNumber: '**** 4521',
  status: 'Active',
  growthPct: '0',
  accentColor: '#117aca',
};

const statusTone: Record<AccountStatus, { bg: string; text: string; border: string }> = {
  Active: { bg: 'rgba(16,185,129,0.10)', text: '#34D399', border: 'rgba(16,185,129,0.25)' },
  'Due Soon': { bg: 'rgba(245,158,11,0.10)', text: '#FBBF24', border: 'rgba(245,158,11,0.25)' },
  Growing: { bg: 'rgba(59,130,246,0.10)', text: '#60A5FA', border: 'rgba(59,130,246,0.25)' },
  Inactive: { bg: 'rgba(100,116,139,0.12)', text: '#94A3B8', border: 'rgba(100,116,139,0.25)' },
};

const AccountsScreen = ({ navigation }: any) => {
  const { currentUserId } = useAuth();
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [accounts],
  );

  const activeCount = useMemo(
    () => accounts.filter(account => account.status === 'Active').length,
    [accounts],
  );

  const groupedAccounts = useMemo(() => {
    const map = new Map<string, AccountRecord[]>();

    accounts.forEach(account => {
      const list = map.get(account.section) ?? [];
      list.push(account);
      map.set(account.section, list);
    });

    return Array.from(map.entries());
  }, [accounts]);

  const loadAccounts = () => {
    if (!currentUserId) {
      setAccounts([]);
      return Promise.resolve();
    }

    setLoading(true);

    return fetchAccounts(currentUserId)
      .then(nextAccounts => {
        setAccounts(nextAccounts);
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to load linked accounts.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAccounts();
  }, [currentUserId]);

  const openAddAccount = () => {
    setDraft(defaultDraft);
    setModalVisible(true);
  };

  const onSaveAccount = () => {
    if (!currentUserId) {
      Alert.alert('Missing session', 'Please sign in again.');
      return;
    }

    if (!draft.accountName.trim() || !draft.institution.trim()) {
      Alert.alert('Missing details', 'Please enter the institution and account name.');
      return;
    }

    const payload: AccountDraft = {
      section: draft.section.trim(),
      institution: draft.institution.trim(),
      accountName: draft.accountName.trim(),
      accountType: draft.accountType.trim(),
      balance: Number(draft.balance) || 0,
      maskedNumber: draft.maskedNumber.trim(),
      status: draft.status,
      growthPct: Number(draft.growthPct) || 0,
      accentColor: draft.accentColor.trim() || '#4f46e5',
    };

    saveAccount(currentUserId, payload)
      .then(() => {
        setModalVisible(false);
        loadAccounts();
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to save this account.');
      });
  };

  const accountIcon = (account: AccountRecord) => {
    if (account.section.toLowerCase().includes('investment')) {
      return 'chart-line';
    }

    if (account.accountType.toLowerCase().includes('amex')) {
      return 'credit-card-outline';
    }

    return 'bank-outline';
  };

  const renderCard = (account: AccountRecord) => {
    const tone = statusTone[account.status] ?? statusTone.Active;

    return (
      <View key={account.id} style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={[styles.logoBox, { backgroundColor: account.accentColor }]}> 
            <MaterialCommunityIcons name={accountIcon(account)} size={22} color="#FFFFFF" />
          </View>

          <Pressable style={styles.moreButton}>
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>{account.accountName}</Text>
          <Text style={styles.cardValue}>RM {Number(account.balance || 0).toFixed(2)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Text style={styles.cardChip}>{account.accountType.toUpperCase()}</Text>
            <Text style={styles.cardFootnote}>{account.maskedNumber}</Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}> 
            <Text style={[styles.statusText, { color: tone.text }]}>
              {account.status === 'Growing' && account.growthPct > 0 ? '+' : ''}
              {account.status === 'Growing' && account.growthPct > 0 ? account.growthPct.toFixed(1) + '%' : account.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backgroundHalo} />
      <View style={styles.backgroundGlow} />

      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate('TransactionsStack')}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.headerTitle}>Linked Accounts</Text>

          <Pressable style={styles.addButton} onPress={openAddAccount}>
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHaloOne} />
            <View style={styles.summaryHaloTwo} />
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={styles.summaryValue}>RM {totalBalance.toFixed(2)}</Text>
            <View style={styles.summaryMetaRow}>
              <View style={styles.summaryMetaPill}>
                <MaterialCommunityIcons name="trending-up" size={14} color="#A7F3D0" />
                <Text style={styles.summaryMetaText}>+2.4%</Text>
              </View>
              <View style={styles.summaryMetaPill}>
                <Text style={styles.summaryMetaText}>{activeCount} Active Accounts</Text>
              </View>
            </View>
          </View>

          {groupedAccounts.map(([section, sectionAccounts]) => (
            <View key={section} style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>{section}</Text>
              {sectionAccounts.map(renderCard)}
            </View>
          ))}

          <Pressable style={styles.emptyCard} onPress={openAddAccount}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="plus" size={24} color="#D8B4FE" />
            </View>
            <Text style={styles.emptyTitle}>Link New Account</Text>
            <Text style={styles.emptyText}>{loading ? 'Loading accounts...' : 'Add another linked account to your finance tracker.'}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link New Account</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Section</Text>
              <TextInput style={styles.input} value={draft.section} onChangeText={text => setDraft({ ...draft, section: text })} placeholder="Checking & Savings" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Institution</Text>
              <TextInput style={styles.input} value={draft.institution} onChangeText={text => setDraft({ ...draft, institution: text })} placeholder="Bank name" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Account Name</Text>
              <TextInput style={styles.input} value={draft.accountName} onChangeText={text => setDraft({ ...draft, accountName: text })} placeholder="CHASE CHECKING" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Account Type</Text>
              <TextInput style={styles.input} value={draft.accountType} onChangeText={text => setDraft({ ...draft, accountType: text })} placeholder="Visa / Brokerage" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Balance</Text>
              <TextInput style={styles.input} value={draft.balance} onChangeText={text => setDraft({ ...draft, balance: text })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Masked Number / Note</Text>
              <TextInput style={styles.input} value={draft.maskedNumber} onChangeText={text => setDraft({ ...draft, maskedNumber: text })} placeholder="**** 4521" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Growth %</Text>
              <TextInput style={styles.input} value={draft.growthPct} onChangeText={text => setDraft({ ...draft, growthPct: text })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#64748B" />

              <Text style={styles.inputLabel}>Accent Color</Text>
              <TextInput style={styles.input} value={draft.accentColor} onChangeText={text => setDraft({ ...draft, accentColor: text })} placeholder="#117aca" placeholderTextColor="#64748B" />

              <View style={styles.statusRow}>
                {(['Active', 'Due Soon', 'Growing', 'Inactive'] as AccountStatus[]).map(item => (
                  <Pressable
                    key={item}
                    style={[styles.statusSelect, draft.status === item && styles.statusSelectActive]}
                    onPress={() => setDraft({ ...draft, status: item })}>
                    <Text style={[styles.statusSelectText, draft.status === item && styles.statusSelectTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActionRow}>
                <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={onSaveAccount}>
                  <Text style={styles.saveButtonText}>Save Account</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNavWrap} pointerEvents="box-none">
        <View style={styles.bottomNav}>
          {[
            {
              label: 'Home',
              icon: 'home',
              activeIcon: 'home',
              action: () => navigation.navigate('TransactionsStack' as never),
            },
            {
              label: 'History',
              icon: 'time-outline',
              activeIcon: 'time',
              action: () => navigation.navigate('TransactionsStack' as never),
            },
            {
              label: '',
              icon: 'add',
              activeIcon: 'add',
              action: () => navigation.navigate('AddTransaction' as never),
              fab: true,
            },
            {
              label: 'Analytics',
              icon: 'analytics-outline',
              activeIcon: 'analytics',
              action: () => navigation.navigate('Analytics' as never),
            },
            {
              label: 'Profile',
              icon: 'person-outline',
              activeIcon: 'person',
              action: () => {},
              active: true,
            },
          ].map(item => {
            if (item.fab) {
              return (
                <View key="fab" style={styles.fabSlot}>
                  <Pressable style={styles.fabButton} onPress={item.action}>
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            }

            const active = item.active;

            return (
              <Pressable key={item.label} style={styles.tabItem} onPress={item.action}>
                <Ionicons
                  name={(active ? item.activeIcon : item.icon) as any}
                  size={24}
                  color={active ? '#A78BFA' : '#64748B'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                {active ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  backgroundHalo: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    top: -160,
    right: -140,
    backgroundColor: 'rgba(79,70,229,0.22)',
  },
  backgroundGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -150,
    left: -100,
    backgroundColor: 'rgba(107,70,193,0.16)',
  },
  shell: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,14,23,0.84)',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 140,
  },
  summaryCard: {
    backgroundColor: 'rgba(30,27,46,0.70)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  summaryHaloOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -60,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryHaloTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -50,
    left: -30,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 18,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryMetaText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionWrap: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(40,36,60,0.42)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    marginBottom: 18,
  },
  cardLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardChip: {
    color: '#C4B5FD',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
  },
  cardFootnote: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderStyle: 'dashed',
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emptyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.76)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#141223',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    color: '#D8B4FE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statusSelect: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusSelectActive: {
    backgroundColor: 'rgba(107,70,193,0.30)',
    borderColor: 'rgba(167,139,250,0.40)',
  },
  statusSelectText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  statusSelectTextActive: {
    color: '#FFFFFF',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelButtonText: {
    color: '#E2E8F0',
    fontWeight: '800',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#4f46e5',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(19,18,33,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#A78BFA',
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A78BFA',
    marginTop: 2,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#251dc9',
    borderWidth: 4,
    borderColor: '#131221',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
});

export default AccountsScreen;