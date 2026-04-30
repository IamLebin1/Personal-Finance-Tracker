import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import type { Category, CategoryType } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';
import {
  addCustomCategory,
  getCategories,
  getDefaultCategories,
  removeCustomCategory,
} from '../services/categoryService';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryManagement'>;

const typeOptions: Array<{ id: CategoryType; label: string }> = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

export default function CategoryManagement({ navigation }: Props) {
  const { colors } = useTheme();
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    const rows = await getCategories(activeType);
    setCategories(rows);
  }, [activeType]);

  useFocusEffect(
    useCallback(() => {
      loadCategories().catch(() => undefined);
      return () => {};
    }, [loadCategories])
  );

  const defaultKeys = useMemo(() => new Set(getDefaultCategories(activeType).map(item => item.key)), [activeType]);

  const handleAdd = async () => {
    try {
      await addCustomCategory({ type: activeType, label: newLabel, icon: newIcon });
      setNewLabel('');
      setNewIcon('🏷️');
      setIsAddVisible(false);
      await loadCategories();
    } catch (err) {
      Alert.alert('Could not add category', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert('Delete category', `Remove "${category.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCustomCategory(activeType, category.key);
            await loadCategories();
          } catch (err) {
            Alert.alert('Could not delete category', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewLabel(category.label);
    setNewIcon(category.icon || '🏷️');
    setIsAddVisible(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Manage Categories</Text>
          </View>
          <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setIsAddVisible(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        <View style={[styles.segmentWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}> 
          {typeOptions.map(option => {
            const active = option.id === activeType;
            return (
              <Pressable
                key={option.id}
                onPress={() => setActiveType(option.id)}
                style={[
                  styles.segmentBtn,
                  { borderColor: colors.cardBorder },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.segmentText, { color: active ? '#fff' : colors.textMuted }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listWrap}>
          {categories.map(item => {
            return (
              <View key={item.key} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}> 
                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
                </View>
                <Pressable onPress={() => handleEdit(item)} style={[styles.editBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '20' }]}> 
                  <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(item)} style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]}> 
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={isAddVisible} transparent animationType="slide" onRequestClose={() => { setIsAddVisible(false); setEditingCategory(null); }}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAddVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingCategory ? 'Edit Category' : 'Add Category'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Label</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="e.g. Coffee"
              placeholderTextColor={colors.textMuted + '80'}
              autoFocus
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Icon (Emoji)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
              value={newIcon}
              onChangeText={setNewIcon}
              placeholder="🏷️"
              placeholderTextColor={colors.textMuted + '80'}
            />
            <View style={styles.actions}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: colors.background }]} onPress={() => setIsAddVisible(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }, !newLabel.trim() && styles.disabled]}
                onPress={async () => {
                  if (editingCategory) {
                    try {
                      // lazy-load updateCategory
                      const mod = await import('../services/categoryService');
                      await mod.updateCategory(activeType, editingCategory.key, { label: newLabel.trim(), icon: newIcon.trim() });
                      setEditingCategory(null);
                      setIsAddVisible(false);
                      await loadCategories();
                    } catch (err) {
                      Alert.alert('Could not update category', err instanceof Error ? err.message : 'Unknown error');
                    }
                  } else {
                    await handleAdd();
                  }
                }}
                disabled={!newLabel.trim()}
              >
                <Text style={styles.saveText}>{editingCategory ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  backIcon: { fontSize: 24, fontWeight: '300' },
  title: { fontSize: 28, fontWeight: '800' },
  addBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  segmentWrap: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 6, marginBottom: 18, gap: 8 },
  segmentBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  segmentText: { fontWeight: '700' },
  listWrap: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { fontSize: 20 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  deleteText: { fontWeight: '700', fontSize: 12 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1 },
  editText: { fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, padding: 20, paddingBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontWeight: '700' },
  saveBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
