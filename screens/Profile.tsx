import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  ActivityIndicator,
  StatusBar,
  InteractionManager,
  Animated,
  Platform,
  Modal,
  Dimensions,
  Image,
  TextInput
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { config } from '../config/appConfig';
import { clearAuthSession, getAuthSession } from '../services/authSession';
import { getTransactionsByUser } from '../services/transactionApi';
import { formatCurrency } from '../services/transactionService';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '🐱', '🐶', '🦊', '🦁', '🦄', '🚀', '⭐', '🌈', '💎',
  '😎', '🥳', '👻', '🤖', '👾', '🎮', '💡', '🔥', '🎨', '👔', '👑', '🍕'
];

function ThemeSegmentedToggle({ theme, onToggle, colors }: { theme: 'dark' | 'light', onToggle: () => void, colors: any }) {
  const isDark = theme === 'dark';
  const slideAnim = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [isDark]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 64],
  });

  return (
    <View style={[styles.segmentedContainer, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
      <Animated.View style={[styles.segmentedActive, { transform: [{ translateX }], backgroundColor: colors.primary }]} />
      <Pressable onPress={() => theme === 'light' && onToggle()} style={styles.segmentBtn}>
        <Text style={[styles.segmentText, isDark ? { color: '#fff' } : { color: colors.textMuted }]}>Dark</Text>
      </Pressable>
      <Pressable onPress={() => theme === 'dark' && onToggle()} style={styles.segmentBtn}>
        <Text style={[styles.segmentText, !isDark ? { color: '#fff' } : { color: colors.textMuted }]}>White</Text>
      </Pressable>
    </View>
  );
}

export default function Profile() {
  const navigation = useNavigation();
  const { theme, toggleTheme, colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState({ count: 0, totalIncome: 0, totalExpense: 0 });
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  
  const session = getAuthSession();

  const loadData = useCallback(() => {
    let isMounted = true;
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const txs = await getTransactionsByUser();
        const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const response = await fetch(`${config.apiBaseUrl}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${session?.token}` }
        });
        const data = await response.json();

        if (isMounted) {
          setStats({ count: txs.length, totalIncome: income, totalExpense: expense });
          setProfileData(data);
          if (data.profilePic && data.profilePic.startsWith('http')) {
            setPhotoUrlInput(data.profilePic);
          }
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    setIsLoading(true);
    return () => { isMounted = false; task.cancel(); };
  }, [session?.token]);

  useFocusEffect(loadData);

  const handleUpdateAvatar = async (avatar: string) => {
    setIsAvatarModalVisible(false);
    setIsUpdating(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}` 
        },
        body: JSON.stringify({
          username: profileData.username,
          email: profileData.email,
          phone: profileData.phone,
          profilePic: avatar
        })
      });
      if (response.ok) {
        setProfileData((prev: any) => ({ ...prev, profilePic: avatar }));
      } else {
        Alert.alert('Error', 'Failed to update profile picture.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePhotoUrl = () => {
    if (!photoUrlInput.trim().startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid image URL starting with http:// or https://');
      return;
    }
    handleUpdateAvatar(photoUrlInput.trim());
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await clearAuthSession();
          navigation.navigate('Login' as never);
        }
      }
    ]);
  };

  const accountRows = useMemo(() => [
    { id: 'details', icon: '👤', title: 'Personal Details', subtitle: 'Name, Email, Phone' },
    { id: 'security', icon: '🔒', title: 'Security & Credentials', subtitle: 'Password, 2FA, FaceID' },
  ], []);

  const generalRows = useMemo(() => [
    { id: 'budget', icon: '📊', title: 'Monthly Budget', subtitle: 'Set your spending limits' },
    { id: 'notifications', icon: '🔔', title: 'Notifications', subtitle: 'Alerts, Reminders' },
    { id: 'currency', icon: '💵', title: 'Default Currency', subtitle: 'USD ($)' },
  ], []);

  const supportRows = useMemo(() => [
    { id: 'help', icon: '🙋', title: 'Help & Support', subtitle: 'FAQ, Contact us' },
    { id: 'privacy', icon: '🛡️', title: 'Privacy Policy', subtitle: 'Data usage & terms' },
  ], []);

  const handleRowPress = (item: any) => {
    if (item.id === 'details') navigation.navigate('ProfileDetails' as never);
    else if (item.id === 'security') navigation.navigate('SecuritySettings' as never);
    else if (item.id === 'budget') navigation.navigate('Budget' as never);
    else Alert.alert(item.title, `The ${item.title.toLowerCase()} feature will be available in the next update.`);
  };

  const displayName = profileData?.username || session?.username || 'User';
  const profilePic = profileData?.profilePic || '';
  const isPhoto = profilePic.startsWith('http');

  const renderSection = (title: string, rows: any[]) => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {rows.map((row, idx) => (
          <Pressable key={row.id} style={[styles.rowItem, idx === rows.length - 1 && styles.rowItemLast, { borderBottomColor: colors.cardBorder }]} onPress={() => handleRowPress(row)}>
            <View style={[styles.rowIconBg, { backgroundColor: colors.cardBorder }]}><Text style={styles.rowIcon}>{row.icon}</Text></View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{row.title}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{row.subtitle}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.cardBorder }]}>›</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Pressable 
            style={[styles.avatarWrap, { backgroundColor: colors.cardBorder, borderColor: colors.primary }]}
            onPress={() => setIsAvatarModalVisible(true)}
          >
            {isUpdating ? (
              <ActivityIndicator color={colors.primary} />
            ) : isPhoto ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarTextMain, { color: colors.text }]}>{profilePic || displayName.charAt(0).toUpperCase()}</Text>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.editIcon}>✎</Text>
            </View>
          </Pressable>
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{profileData?.email || 'No email set'}</Text>
          <View style={[styles.badge, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Premium Member</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Txns</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{isLoading ? '...' : stats.count}</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{isLoading ? '...' : formatCurrency(stats.totalIncome)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>{isLoading ? '...' : formatCurrency(stats.totalExpense)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.rowItem, styles.rowItemLast]}>
            <View style={[styles.rowIconBg, { backgroundColor: colors.cardBorder }]}><Text style={styles.rowIcon}>{isDark ? '🌙' : '☀️'}</Text></View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{isDark ? 'Premium Dark' : 'Bright White'}</Text>
            </View>
            <ThemeSegmentedToggle theme={theme} onToggle={toggleTheme} colors={colors} />
          </View>
        </View>

        {renderSection('Account', accountRows)}
        {renderSection('General', generalRows)}
        {renderSection('Support', supportRows)}

        <Pressable style={[styles.signOutWrap, { borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' }]} onPress={handleSignOut}>
          <Text style={[styles.signOut, { color: colors.danger }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal visible={isAvatarModalVisible} transparent animationType="fade" onRequestClose={() => setIsAvatarModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAvatarModalVisible(false)}>
          <View style={[styles.avatarModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Avatar</Text>
            
            <View style={styles.urlInputSection}>
              <TextInput 
                style={[styles.urlInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                placeholder="Paste Photo URL here..."
                placeholderTextColor={colors.textMuted + '60'}
                value={photoUrlInput}
                onChangeText={setPhotoUrlInput}
              />
              <Pressable style={[styles.urlSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleUpdatePhotoUrl}>
                <Text style={styles.urlSubmitText}>Use Photo</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
              {AVATAR_OPTIONS.map(avatar => (
                <Pressable key={avatar} style={[styles.avatarOption, { backgroundColor: colors.background }]} onPress={() => handleUpdateAvatar(avatar)}>
                  <Text style={styles.avatarOptionText}>{avatar}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 },
  header: { fontSize: 28, fontWeight: '800', textAlign: 'left', marginBottom: 24, letterSpacing: -0.5 },
  profileCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, paddingVertical: 24, marginBottom: 20 },
  avatarWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 3, marginBottom: 14, position: 'relative', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  avatarTextMain: { fontSize: 42, fontWeight: '800' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editIcon: { color: '#fff', fontSize: 14 },
  name: { fontSize: 24, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  badge: { marginTop: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 32 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  statValue: { fontSize: 15, fontWeight: '800' },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4 },
  sectionCard: { borderRadius: 24, borderWidth: 1, marginBottom: 24, paddingHorizontal: 4 },
  rowItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  rowItemLast: { borderBottomWidth: 0 },
  rowIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rowIcon: { fontSize: 16 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  chevron: { fontSize: 24, fontWeight: '400', marginLeft: 8 },
  signOutWrap: { marginTop: 8, marginBottom: 40, borderRadius: 20, borderWidth: 1, paddingVertical: 16 },
  signOut: { textAlign: 'center', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  segmentedContainer: { flexDirection: 'row', width: 120, height: 36, borderRadius: 18, padding: 4, borderWidth: 1, position: 'relative', alignItems: 'center' },
  segmentedActive: { position: 'absolute', width: 52, height: 28, borderRadius: 14 },
  segmentBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  segmentText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  avatarModal: { width: width * 0.85, maxHeight: '75%', borderRadius: 32, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  urlInputSection: { marginBottom: 20 },
  urlInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10, borderWidth: 1 },
  urlSubmitBtn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  urlSubmitText: { color: '#fff', fontWeight: '700' },
  divider: { height: 1, width: '100%', marginBottom: 20 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  avatarOption: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarOptionText: { fontSize: 32 },
});
