import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { config } from '../config/appConfig';
import { getAuthSession } from '../services/authSession';

export default function SecuritySettings() {
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Simulated Security Toggles
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);

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
            🔒 Your data is encrypted and stored securely. We recommend using a unique password for this application.
          </Text>
        </View>

      </ScrollView>
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
});
