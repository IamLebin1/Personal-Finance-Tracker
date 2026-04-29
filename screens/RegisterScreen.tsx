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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

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

const RegisterScreen = ({ navigation }: Props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const register = () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      Alert.alert('Missing details', 'Enter your username and password.');
      return;
    }

    if (trimmedUsername.length < 3) {
      Alert.alert('Invalid username', 'Use at least 3 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The password confirmation does not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Terms required', 'Please agree to the Terms and Privacy Policy.');
      return;
    }

    setSubmitting(true);

    fetch(`${config.apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: trimmedUsername,
        password: trimmedPassword,
      }),
    })
      .then(async response => {
        const rawResponse = await response.text();
        let responseJson: { message?: string } | null = null;

        try {
          responseJson = rawResponse ? JSON.parse(rawResponse) : null;
        } catch {
          responseJson = null;
        }

        if (!response.ok) {
          throw new Error(responseJson?.message || rawResponse || 'Registration failed');
        }
        return responseJson;
      })
      .then(() => {
        Alert.alert('Success', 'Account created. Please sign in.');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setAgreeTerms(false);
        navigation.navigate('Login', { prefillEmail: trimmedUsername, registeredName: trimmedUsername });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Please try again. If you are using a real phone, set API_BASE_URL to your PC LAN IP.';
        Alert.alert('Registration failed', message);
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
              <Text style={styles.logoText}>👛</Text>
            </View>
            <Text style={styles.brandText}>MIDNIGHT GLASS</Text>
          </View>
          <Text style={styles.helpText}>Help</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Secure your financial future today.</Text>
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

          <Text style={styles.label}>PASSWORD</Text>
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
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <PasswordEye visible={showPassword} />
            </Pressable>
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              placeholder="........"
              placeholderTextColor="#636277"
              secureTextEntry={!showConfirmPassword}
              cursorColor="#D8B4FE"
              selectionColor="#D8B4FE"
              style={[styles.input, styles.passwordInput, styles.passwordInputTone]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <PasswordEye visible={showConfirmPassword} />
            </Pressable>
          </View>

          <Pressable style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.termsText}>I agree to the Terms of Service and Privacy Policy.</Text>
          </Pressable>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={register}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? Sign In</Text>
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
  termsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#464555',
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#1a1926',
  },
  checkboxChecked: {
    borderColor: '#6b46c1',
    backgroundColor: '#6b46c1',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
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

export default RegisterScreen;
