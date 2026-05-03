import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { config } from '../config/appConfig';
import { getAuthSession } from '../services/authSession';
import * as pinService from '../services/pinService';
import { DarkPalette } from '../constants/theme';

export default function SecuritySettings() {
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  
  // Auth Session
  const session = getAuthSession();
  const userId = session?.userId || '';

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PIN State
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');

  // Simulated Security Toggles
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);

  useEffect(() => {
    const loadPinStatus = async () => {
      if (!userId) return;
      const enabled = await pinService.isPinEnabled(userId);
      setIsPinEnabled(enabled);
    };
    loadPinStatus();
  }, [userId]);

  const handleTogglePin = async (value: boolean) => {
    if (value) {
      setPinStep('enter');
      setPinInput('');
      setConfirmPinInput('');
      setShowPinModal(true);
    } else {
      if (!userId) return;
      await pinService.setPinEnabled(userId, false);
      setIsPinEnabled(false);
      Alert.alert('PIN Disabled', 'PIN access has been turned off.');
    }
  };

  const handleKeyPress = (num: string) => {
    if (pinStep === 'enter') {
      if (pinInput.length < 4) {
        const newVal = pinInput + num;
        setPinInput(newVal);
        if (newVal.length === 4) {
          setTimeout(() => setPinStep('confirm'), 300);
        }
      }
    } else {
      if (confirmPinInput.length < 4) {
        const newVal = confirmPinInput + num;
        setConfirmPinInput(newVal);
        if (newVal.length === 4) {
          handleCompletePin(newVal);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (pinStep === 'enter') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      if (confirmPinInput.length === 0) {
        setPinStep('enter');
      } else {
        setConfirmPinInput(prev => prev.slice(0, -1));
      }
    }
  };

  const handleCompletePin = async (finalConfirm: string) => {
    if (!userId) return;
    if (pinInput === finalConfirm) {
      await pinService.setPin(userId, pinInput);
      await pinService.setPinEnabled(userId, true);
      setIsPinEnabled(true);
      setShowPinModal(false);
      Alert.alert('Success', 'PIN has been set successfully.');
    } else {
      Alert.alert('Mismatch', 'PINs do not match. Please try again.');
      setPinStep('enter');
      setPinInput('');
      setConfirmPinInput('');
    }
  };

  const renderDot = (index: number, val: string) => {
    const isActive = val.length > index;
    return (
      <View key={index} style={[styles.modalDot, isActive && styles.modalDotActive]} />
    );
  };

  const renderKey = (val: string) => (
    <TouchableOpacity 
      key={val} 
      style={styles.modalKey} 
      onPress={() => handleKeyPress(val)}
    >
      <Text style={styles.modalKeyText}>{val}</Text>
    </TouchableOpacity>
  );

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
      return;
    }

    const session = getAuthSession();
    if (!session?.token) return;

    try {
      setIsSaving(true);
      const response = await fetch(`${config.apiBaseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while updating password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Security & Credentials</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <Text style={styles.sectionTitle}>PIN Access</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Enable PIN Lock</Text>
              <Text style={styles.switchSub}>Require a PIN to access the application</Text>
            </View>
            <Switch
              value={isPinEnabled}
              onValueChange={handleTogglePin}
              trackColor={{ false: '#0a0c1f', true: DarkPalette.primary }}
              thumbColor="#fff"
            />
          </View>
          
          {isPinEnabled && (
            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.changePinButton}
              onPress={() => {
                setPinStep('enter');
                setPinInput('');
                setConfirmPinInput('');
                setShowPinModal(true);
              }}
            >
              <Text style={styles.changePinText}>Change Security PIN</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>CURRENT PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor="#636781"
            secureTextEntry
          />

          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor="#636781"
            secureTextEntry
          />

          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor="#636781"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Additional Security</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Two-Factor Authentication</Text>
              <Text style={styles.switchSub}>Add an extra layer of security</Text>
            </View>
            <Switch
              value={is2FAEnabled}
              onValueChange={setIs2FAEnabled}
              trackColor={{ false: '#0a0c1f', true: '#8a6eff' }}
              thumbColor={Platform.OS === 'android' ? (is2FAEnabled ? '#fff' : '#636781') : ''}
            />
          </View>

          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: '#232859', marginTop: 16, paddingTop: 16 }]}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Biometric Login</Text>
              <Text style={styles.switchSub}>Use FaceID or Fingerprint</Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={setIsBiometricsEnabled}
              trackColor={{ false: '#0a0c1f', true: '#8a6eff' }}
              thumbColor={Platform.OS === 'android' ? (isBiometricsEnabled ? '#fff' : '#636781') : ''}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Your security is our priority. PINs are stored locally on your device and are never shared.
          </Text>
        </View>

      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>
              {pinStep === 'enter' ? 'Create Security PIN' : 'Confirm Security PIN'}
            </Text>
            <Text style={styles.modalSub}>
              {pinStep === 'enter' 
                ? 'Choose a 4-digit PIN for access' 
                : 'Repeat the PIN to verify'}
            </Text>
            
            <View style={styles.modalDotsWrapper}>
              {[0, 1, 2, 3].map(i => renderDot(i, pinStep === 'enter' ? pinInput : confirmPinInput))}
            </View>

            <View style={styles.modalKeypad}>
              <View style={styles.modalRow}>
                {['1', '2', '3'].map(renderKey)}
              </View>
              <View style={styles.modalRow}>
                {['4', '5', '6'].map(renderKey)}
              </View>
              <View style={styles.modalRow}>
                {['7', '8', '9'].map(renderKey)}
              </View>
              <View style={styles.modalRow}>
                <TouchableOpacity 
                  activeOpacity={0.6}
                  style={styles.modalKey} 
                  onPress={() => setShowPinModal(false)}
                >
                  <Text style={[styles.modalKeyText, { fontSize: 13, color: DarkPalette.danger, fontWeight: '700' }]}>CLOSE</Text>
                </TouchableOpacity>
                {renderKey('0')}
                <TouchableOpacity 
                  activeOpacity={0.6}
                  style={styles.modalKey} 
                  onPress={handleBackspace}
                >
                  <Text style={[styles.modalKeyText, { color: DarkPalette.primary }]}>⌫</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070817',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 24 : 8,
    paddingBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#f4f6ff',
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  sectionTitle: {
    color: '#8a90c6',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232859',
    marginBottom: 24,
  },
  label: {
    color: '#8a90c6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#0a0c1f',
    borderWidth: 1,
    borderColor: '#232859',
    borderRadius: 16,
    color: '#f4f6ff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#8a6eff',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#8a6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    color: '#f4f6ff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchSub: {
    color: '#636781',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  changePinButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(138, 110, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(138, 110, 255, 0.15)',
    alignItems: 'center',
  },
  changePinText: {
    color: '#8a6eff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoBox: {
    backgroundColor: 'rgba(138, 110, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 110, 255, 0.1)',
  },
  infoText: {
    color: '#8a90c6',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#070817',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSub: {
    color: '#8a90c6',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  modalDotsWrapper: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 18,
  },
  modalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  modalDotActive: {
    backgroundColor: '#8a6eff',
    borderColor: '#8a6eff',
    transform: [{ scale: 1.15 }],
  },
  modalKeypad: {
    width: '100%',
    gap: 14,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  modalKey: {
    flex: 1,
    aspectRatio: 1.6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
});
