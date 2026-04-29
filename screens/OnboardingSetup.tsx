import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { setPreferredCurrency, type CurrencyCode, convertToUsd, getCurrencyState } from '../services/currencyService';
import { createWallet } from '../services/walletApi';
import { setSelectedWalletId } from '../services/walletService';
import { insertTransaction } from '../services/transactionApi';
import { getAuthSession, loadAuthSession } from '../services/authSession';
import { setOnboardingCompleted } from '../services/onboardingService';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSetup'>;

export default function OnboardingSetup({ navigation }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [walletName, setWalletName] = useState('Main Wallet');
  const [walletWorth, setWalletWorth] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const parsedWorth = useMemo(() => {
    const normalized = walletWorth.replace(/,/g, '').trim();
    if (!normalized) return 0;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }, [walletWorth]);

  const currencySymbol = currency === 'MYR' ? 'RM' : '$';
  const currencyLabel = currency === 'MYR' ? 'MYR' : 'USD';

  const handleContinue = async () => {
    // Ensure session is loaded from AsyncStorage before proceeding
    let session = getAuthSession();
    if (!session) {
      session = await loadAuthSession();
    }
    
    const userId = session?.userId || '';
    const safeWalletName = walletName.trim();

    if (!userId || !session?.token) {
      Alert.alert('Session expired', 'Please login again.');
      navigation.replace('Login');
      return;
    }

    if (!safeWalletName) {
      Alert.alert('Wallet name required', 'Please enter a wallet name.');
      return;
    }

    if (Number.isNaN(parsedWorth) || parsedWorth < 0) {
      Alert.alert('Invalid amount', 'Wallet worth must be a valid number of 0 or more.');
      return;
    }

    setSubmitting(true);

    try {
      await setPreferredCurrency(currency);

      const wallet = await createWallet({
        name: safeWalletName,
      });

      await setSelectedWalletId(String(wallet.id));

      if (parsedWorth > 0) {
        // Convert from selected currency to USD for storage
        const amountInUsd = convertToUsd(parsedWorth, currency);
        
        await insertTransaction({
          amount: amountInUsd,
          type: 'income',
          category: 'Initial Balance',
          date: new Date().toISOString(),
          note: 'Initial wallet setup',
          userId,
          walletId: String(wallet.id),
        });
      }

      await setOnboardingCompleted(userId, true);
      navigation.replace('MainTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to finish setup right now.';
      
      // If token is invalid/expired, redirect to login
      if (message.includes('Invalid or expired token') || message.includes('Missing auth token')) {
        Alert.alert('Session expired', 'Your session has expired. Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Setup failed', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Let's Set Up Your Wallet</Text>
          <Text style={styles.subtitle}>Choose currency and create your first wallet before entering the app.</Text>

          <Text style={styles.label}>Currency</Text>
          <View style={styles.segmentWrap}>
            <Pressable
              style={[styles.segmentBtn, currency === 'USD' && styles.segmentBtnActive]}
              onPress={() => setCurrency('USD')}
            >
              <Text style={[styles.segmentText, currency === 'USD' && styles.segmentTextActive]}>USD ($)</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, currency === 'MYR' && styles.segmentBtnActive]}
              onPress={() => setCurrency('MYR')}
            >
              <Text style={[styles.segmentText, currency === 'MYR' && styles.segmentTextActive]}>MYR (RM)</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Wallet Name</Text>
          <TextInput
            value={walletName}
            onChangeText={setWalletName}
            style={styles.input}
            placeholder="Main Wallet"
            placeholderTextColor="#7d8494"
            maxLength={40}
          />

          <Text style={styles.label}>Wallet Worth (Initial Amount - {currencyLabel})</Text>
          <TextInput
            value={walletWorth}
            onChangeText={setWalletWorth}
            style={styles.input}
            placeholder={`0 ${currencySymbol}`}
            placeholderTextColor="#7d8494"
            keyboardType="decimal-pad"
          />

          <Text style={styles.hint}>
            If amount is more than 0, we will create an "Initial Balance" income transaction automatically.
          </Text>

          <Pressable style={[styles.primaryBtn, submitting && styles.disabledBtn]} onPress={handleContinue} disabled={submitting}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Saving setup...' : 'Continue to App'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090a1f' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 36 },
  title: { color: '#f5f7ff', fontSize: 30, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#aeb6cc', fontSize: 14, lineHeight: 22, marginBottom: 28 },
  label: { color: '#dce3f9', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#121630',
    borderWidth: 1,
    borderColor: '#20284d',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentBtnActive: { backgroundColor: '#6d5cff' },
  segmentText: { color: '#8f97b1', fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: '#ffffff' },
  input: {
    backgroundColor: '#11162c',
    borderWidth: 1,
    borderColor: '#263056',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f5f7ff',
    fontSize: 15,
    marginBottom: 14,
  },
  hint: { color: '#8f97b1', fontSize: 12, lineHeight: 18, marginBottom: 22 },
  primaryBtn: {
    backgroundColor: '#6d5cff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.7 },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
