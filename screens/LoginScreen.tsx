import React, { useEffect, useState } from 'react';
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
import { setAuthSession } from '../services/authSession';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

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

const LoginScreen = ({ navigation, route }: Props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        navigation.replace('MainTabs');
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
          <Text style={styles.title}>Finance Tracker</Text>
          <Text style={styles.subtitle}>Sign in to continue.</Text>
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

          <View style={styles.authMetaRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={login}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Need an account? Create one</Text>
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
  authMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#464555',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  rememberText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  forgotText: {
    color: '#d8b4fe',
    fontSize: 13,
    fontWeight: '700',
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

export default LoginScreen;
