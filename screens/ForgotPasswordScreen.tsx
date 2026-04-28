import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { config } from '../config/appConfig';
import { DarkPalette } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const PasswordEye = ({ visible }: { visible: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {!visible ? (
      <>
        <Path
          d="M2 12C3.8 8.2 7.5 6 12 6C16.5 6 20.2 8.2 22 12C20.2 15.8 16.5 18 12 18C7.5 18 3.8 15.8 2 12Z"
          stroke={DarkPalette.accent}
          strokeWidth={1.5}
        />
        <Circle cx="12" cy="12" r="3" stroke={DarkPalette.accent} strokeWidth={1.5} />
      </>
    ) : (
      <>
        <Path
          d="M2 12C3.8 8.2 7.5 6 12 6C16.5 6 20.2 8.2 22 12C20.2 15.8 16.5 18 12 18C7.5 18 3.8 15.8 2 12Z"
          stroke={DarkPalette.accent}
          strokeWidth={1.5}
          opacity={0.5}
        />
        <Path d="M4 4L20 20" stroke={DarkPalette.accent} strokeWidth={1.5} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const BackgroundDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <Svg height="100%" width="100%">
      <Defs>
        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={DarkPalette.primary} stopOpacity="0.1" />
          <Stop offset="100%" stopColor={DarkPalette.background} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="100%" cy="100%" r="200" fill="url(#grad)" />
      <Circle cx="0%" cy="0%" r="150" fill="url(#grad)" />
    </Svg>
  </View>
);

const ForgotPasswordScreen = ({ navigation, route }: Props) => {
  const [username, setUsername] = useState(route.params?.prefillUsername ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const handleReset = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername || !trimmedPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'The password confirmation does not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Request reset token
      const forgotResponse = await fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername }),
      });

      const forgotData = await forgotResponse.json();
      if (!forgotResponse.ok) {
        throw new Error(forgotData?.message || 'Unable to identify user');
      }

      const token = forgotData.resetToken;
      if (!token) {
        throw new Error('Server did not provide a reset token');
      }

      // Step 2: Use token to reset password immediately
      const resetResponse = await fetch(`${config.apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: trimmedPassword }),
      });

      const resetData = await resetResponse.json();
      if (!resetResponse.ok) {
        throw new Error(resetData?.message || 'Unable to reset password');
      }

      Alert.alert('Success', 'Your password has been updated. Please sign in.');
      navigation.replace('Login', { prefillEmail: trimmedUsername });
    } catch (error: any) {
      Alert.alert('Reset failed', error.message || 'An error occurred during reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundDecor />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your username and choose a new password.</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isFocused === 'username' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter your username"
                  placeholderTextColor="#5a5e8a"
                  style={styles.textInput}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setIsFocused('username')}
                  onBlur={() => setIsFocused(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isFocused === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  placeholder="At least 6 characters"
                  placeholderTextColor="#5a5e8a"
                  secureTextEntry={!showPassword}
                  cursorColor={DarkPalette.primary}
                  selectionColor={DarkPalette.primary}
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setIsFocused('password')}
                  onBlur={() => setIsFocused(null)}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <PasswordEye visible={showPassword} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isFocused === 'confirm' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  placeholder="Repeat your password"
                  placeholderTextColor="#5a5e8a"
                  secureTextEntry={!showPassword}
                  cursorColor={DarkPalette.primary}
                  selectionColor={DarkPalette.primary}
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setIsFocused('confirm')}
                  onBlur={() => setIsFocused(null)}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.resetButton, submitting && styles.resetButtonDisabled]}
              onPress={handleReset}
              disabled={submitting}
            >
              <Text style={styles.resetButtonText}>
                {submitting ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DarkPalette.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: DarkPalette.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  heroSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: DarkPalette.textMuted,
    fontWeight: '400',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DarkPalette.primary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  inputWrapper: {
    height: 58,
    backgroundColor: '#16193b',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#232859',
  },
  inputWrapperFocused: {
    borderColor: DarkPalette.primary,
    backgroundColor: '#1c204d',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  resetButton: {
    height: 58,
    backgroundColor: DarkPalette.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: DarkPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: DarkPalette.textMuted,
    fontSize: 15,
  },
  loginLink: {
    color: DarkPalette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;

