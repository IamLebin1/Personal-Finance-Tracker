import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import { config } from '../config/appConfig';
import { setAuthSession } from '../services/authSession';
import { DarkPalette } from '../constants/theme';
import * as pinService from '../services/pinService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

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
          <Stop offset="0%" stopColor={DarkPalette.primary} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={DarkPalette.background} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="100%" cy="0%" r="200" fill="url(#grad)" />
      <Circle cx="0%" cy="100%" r="150" fill="url(#grad)" />
    </Svg>
  </View>
);

const LoginScreen = ({ navigation, route }: Props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  useEffect(() => {
    const prefill = route.params?.prefillEmail?.trim();
    const registeredName = route.params?.registeredName?.trim();

    if (prefill) {
      setUsername(prefill);
    }

    if (registeredName) {
      Alert.alert('Welcome, ' + registeredName, 'Your account is ready. Please sign in.');
    }
  }, [route.params?.prefillEmail, route.params?.registeredName]);

  const login = () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      Alert.alert('Missing details', 'Enter your username and password.');
      return;
    }

    setSubmitting(true);

    fetch(`${config.apiBaseUrl}/api/auth/login`, {
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
        const responseJson = await response.json();
        if (!response.ok) {
          throw new Error(responseJson?.message || 'Invalid login');
        }
        return responseJson;
      })
      .then(async responseJson => {
        const token = String(responseJson?.token || '');
        const userId = String(responseJson?.user?.id || '');
        const loggedInUsername = String(responseJson?.user?.username || trimmedUsername);

        if (!token || !userId) {
          throw new Error('Login response missing session data');
        }

        await setAuthSession({
          token,
          userId,
          username: loggedInUsername,
        });

        Alert.alert('Success', 'Login successful.');
        setPassword('');
        if (!rememberMe) {
          setUsername('');
        }
        
        // Check for PIN access using the specific userId from response
        const pinEnabled = await pinService.isPinEnabled(userId);
        if (pinEnabled) {
          navigation.replace('PinEntry');
        } else {
          navigation.replace('MainTabs');
        }
      })
      .catch(() => {
        Alert.alert('Login failed', 'Invalid username or password.');
      })
      .finally(() => {
        setSubmitting(false);
      });
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
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>$</Text>
              </View>
              <Text style={styles.brandTitle}>Finance</Text>
            </View>
            <TouchableOpacity style={styles.helpButton}>
              <Text style={styles.helpText}>Help</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.greeting}>Welcome Back</Text>
            <Text style={styles.instruction}>Sign in to your account</Text>
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
              <Text style={styles.inputLabel}>PASSWORD</Text>
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
                  placeholder="Enter your password"
                  placeholderTextColor="#5a5e8a"
                  secureTextEntry={!showPassword}
                  cursorColor={DarkPalette.primary}
                  selectionColor={DarkPalette.primary}
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
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

            <View style={styles.optionsRow}>
              <Pressable style={styles.rememberMe} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <View style={styles.checkboxCheck} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
              onPress={login}
              disabled={submitting}
            >
              <Text style={styles.loginButtonText}>
                {submitting ? 'Authenticating...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signUpLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: DarkPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  helpButton: {
    padding: 8,
  },
  helpText: {
    color: DarkPalette.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  heroSection: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 16,
    color: DarkPalette.textMuted,
    fontWeight: '400',
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 30,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#232859',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16193b',
  },
  checkboxActive: {
    backgroundColor: DarkPalette.primary,
    borderColor: DarkPalette.primary,
  },
  checkboxCheck: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  rememberText: {
    color: DarkPalette.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    color: DarkPalette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 58,
    backgroundColor: DarkPalette.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DarkPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
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
  signUpLink: {
    color: DarkPalette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default LoginScreen;

