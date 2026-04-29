import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  StatusBar,
  Animated,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { setBudget, getBudgets } from '../services/budgetApi';
import { CATEGORIES } from '../constants/categories';
import { useCurrency } from '../services/useCurrency';
import { clearAuthSession } from '../services/authSession';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const { symbol, convertFromUsd, convertToUsd } = useCurrency();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [month] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [totalBudget, setTotalBudget] = useState('0');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBudgets(month);
      const catMap: Record<string, string> = {};
      let total = '0';
      
      data.forEach(b => {
        const converted = convertFromUsd(Number(b.amount));
        const displayValue = Number.isFinite(converted) ? converted.toFixed(2) : '0.00';
        if (b.category === 'Total') {
          total = displayValue;
        } else {
          catMap[b.category] = displayValue;
        }
      });
      
      setTotalBudget(total);
      setCategoryBudgets(catMap);
    } catch (err) {
      console.error('Failed to load budgets:', err);
      const message = err instanceof Error ? err.message : String(err);

      // Backend rejects stale session tokens with a 401.
      if (message.toLowerCase().includes('invalid or expired token')) {
        await clearAuthSession();
        navigation.replace('Login' as never);
        return;
      }
    } finally {
      setIsLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [month, convertFromUsd, fadeAnim, navigation]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSaveTotal = async () => {
    try {
      const parsed = Number(totalBudget.replace(/,/g, '').trim());
      if (!Number.isFinite(parsed) || parsed < 0) {
        Alert.alert('Invalid amount', 'Please enter a valid budget amount.');
        return;
      }

      await setBudget('Total', month, convertToUsd(parsed));
      Alert.alert('Success', 'Total monthly budget updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('invalid or expired token')) {
        await clearAuthSession();
        navigation.replace('Login' as never);
        return;
      }
      Alert.alert('Error', 'Failed to update budget.');
    }
  };

  const handleSaveCategory = async (cat: string) => {
    try {
      const val = categoryBudgets[cat] || '0';
      const parsed = Number(val.replace(/,/g, '').trim());
      if (!Number.isFinite(parsed) || parsed < 0) {
        Alert.alert('Invalid amount', 'Please enter a valid budget amount.');
        return;
      }

      await setBudget(cat, month, convertToUsd(parsed));
      Alert.alert('Success', `${cat.charAt(0).toUpperCase() + cat.slice(1)} budget updated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('invalid or expired token')) {
        await clearAuthSession();
        navigation.replace('Login' as never);
        return;
      }
      Alert.alert('Error', 'Failed to update category budget.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Monthly Budget</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>TOTAL MONTHLY BUDGET</Text>
              <View style={styles.inputRow}>
                <Text style={[styles.currency, { color: colors.primary }]}>{symbol}</Text>
                <TextInput
                  style={[styles.totalInput, { color: colors.text }]}
                  value={totalBudget}
                  onChangeText={setTotalBudget}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted + '60'}
                />
                <Pressable onPress={handleSaveTotal} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Budgets</Text>
            
            {CATEGORIES.map(cat => (
              <View key={cat.key} style={[styles.catRow, { borderBottomColor: colors.cardBorder }]}>
                <View style={[styles.catIconBox, { backgroundColor: cat.color + '20' }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
                  <View style={styles.catInputRow}>
                    <Text style={[styles.catCurrency, { color: colors.textMuted }]}>{symbol}</Text>
                    <TextInput
                      style={[styles.catInput, { color: colors.text, borderColor: colors.cardBorder }]}
                      value={categoryBudgets[cat.key] || ''}
                      onChangeText={(val) => setCategoryBudgets(prev => ({ ...prev, [cat.key]: val }))}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted + '60'}
                      onBlur={() => handleSaveCategory(cat.key)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 24, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 32 },
  cardLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 32, fontWeight: '800', marginRight: 8 },
  totalInput: { flex: 1, fontSize: 36, fontWeight: '800', paddingVertical: 8 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  catIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catIcon: { fontSize: 22 },
  catInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLabel: { fontSize: 16, fontWeight: '700' },
  catInputRow: { flexDirection: 'row', alignItems: 'center' },
  catCurrency: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  catInput: { width: 100, fontSize: 16, fontWeight: '700', textAlign: 'right', paddingVertical: 4 },
});
