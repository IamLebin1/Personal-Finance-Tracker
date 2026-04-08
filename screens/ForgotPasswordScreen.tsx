import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { config } from '../config/appConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const PasswordEye = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {!visible ? (
      <>
        <Path
          d="M2 12C3.8 8.2 7.5 6 12 6C16.5 6 20.2 8.2 22 12C20.2 15.8 16.5 18 12 18C7.5 18 3.8 15.8 2 12Z"
          stroke="#E9D5FF"
          strokeWidth={1.8}
        />
        <Path
          d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z"
          stroke="#E9D5FF"
          strokeWidth={1.8}
        />
      </>
    ) : (
      <>
        <Path
          d="M2 12C3.8 8.2 7.5 6 12 6C16.5 6 20.2 8.2 22 12C20.2 15.8 16.5 18 12 18C7.5 18 3.8 15.8 2 12Z"
          stroke="#E9D5FF"
          strokeWidth={1.8}
        />
        <Path d="M4 4L20 20" stroke="#E9D5FF" strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const ForgotPasswordScreen = ({ navigation, route }: Props) => {
  const [username, setUsername] = useState(route.params?.prefillUsername ?? '');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenRequested, setTokenRequested] = useState(false);

  const requestResetToken = () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      Alert.alert('Missing details', 'Enter your username first.');
      return;
    }

    setSubmitting(true);

    fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: trimmedUsername }),
    })
      .then(async response => {
        const responseJson = await response.json();
        if (!response.ok) {
          throw new Error(responseJson?.message || 'Unable to request token');
        }
        return responseJson;
      })
      .then(responseJson => {
        setResetToken(responseJson.resetToken ?? '');
        setTokenRequested(true);
        Alert.alert('Reset token created', `Use this token to reset your password:\n${responseJson.resetToken}`);
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to request reset token.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const resetPassword = () => {
    const trimmedToken = resetToken.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedToken || !trimmedPassword) {
      Alert.alert('Missing details', 'Enter the token and a new password.');
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

    fetch(`${config.apiBaseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: trimmedToken, newPassword: trimmedPassword }),
    })
      .then(async response => {
        const responseJson = await response.json();
        if (!response.ok) {
          throw new Error(responseJson?.message || 'Unable to reset password');
        }
        return responseJson;
      })
      .then(() => {
        Alert.alert('Success', 'Password updated. Please sign in again.');
        navigation.replace('Login', { prefillEmail: username.trim() });
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to reset password.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.logoSquare}>
              <Text style={styles.logoText}>$</Text>
            </View>
            <Text style={styles.brandText}>MIDNIGHT GLASS</Text>
          </View>
          <Text style={styles.helpText}>Help</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Request a reset token, then update your password.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="demo-user"
            placeholderTextColor="#636277"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
          />

          <TouchableOpacity
            style={[styles.secondaryButton, submitting && styles.buttonDisabled]}
            onPress={requestResetToken}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>{submitting ? 'Working...' : 'Request Reset Token'}</Text>
          </TouchableOpacity>

          {tokenRequested ? (
            <>
              <Text style={styles.label}>RESET TOKEN</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="paste token here"
                placeholderTextColor="#636277"
                style={styles.input}
                value={resetToken}
                onChangeText={setResetToken}
              />

              <Text style={styles.label}>NEW PASSWORD</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  placeholder="........"
                  placeholderTextColor="#636277"
                  secureTextEntry={!showPassword}
                  cursorColor="#D8B4FE"
                  selectionColor="#D8B4FE"
                  style={[styles.input, styles.passwordInput, styles.passwordInputTone]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <PasswordEye visible={showPassword} />
                </Pressable>
              </View>

              <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                placeholder="........"
                placeholderTextColor="#636277"
                secureTextEntry={!showPassword}
                cursorColor="#D8B4FE"
                selectionColor="#D8B4FE"
                style={[styles.input, styles.passwordInputTone]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                onPress={resetPassword}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>{submitting ? 'Resetting...' : 'Reset Password'}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090a1f',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 120,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#6b46c1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  brandText: {
    color: '#f6f6f8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  hero: {
    marginBottom: 22,
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#121436',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c2f6e',
  },
  label: {
    color: '#8f96ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#171b46',
    borderWidth: 1,
    borderColor: '#31376e',
    borderRadius: 16,
    color: '#f6f6f8',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 78,
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(216, 180, 254, 0.14)',
  },
  passwordInputTone: {
    color: '#E9D5FF',
    borderColor: 'rgba(216, 180, 254, 0.35)',
  },
  secondaryButton: {
    backgroundColor: '#1f224f',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#d8b4fe',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#7f5bff',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    color: '#d8b4fe',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
