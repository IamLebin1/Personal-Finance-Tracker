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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

var config = require('../config/Config');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const REMEMBER_EMAIL_KEY = 'remembered_email';

const PasswordEye = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {!visible ? (
      <>
        <Path
          d="M2 12C3.8 8.2 7.5 6 12 6C16.5 6 20.2 8.2 22 12C20.2 15.8 16.5 18 12 18C7.5 18 3.8 15.8 2 12Z"
          stroke="#E9D5FF"
          strokeWidth={1.8}
        />
        <Path d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z" stroke="#E9D5FF" strokeWidth={1.8} />
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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then(savedEmail => {
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    });
  }, []);

  useEffect(() => {
    const prefillEmail = route.params?.prefillEmail?.trim();
    const registeredName = route.params?.registeredName?.trim();

    if (prefillEmail) {
      setEmail(prefillEmail);
    }

    if (registeredName) {
      Alert.alert('Welcome, ' + registeredName, 'Your account is ready. Please sign in.');
    }
  }, [route.params?.prefillEmail, route.params?.registeredName]);

  const _forgotPassword = () => {
    Alert.alert(
      'Forgot password',
      'Password reset is not connected yet. Please contact support or register a new account for now.',
    );
  };

  const _login = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setSubmitting(true);

    fetch(config.settings.serverPath + '/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    })
      .then(respond => respond.json())
      .then(respondJson => {
        setSubmitting(false);

        if (respondJson.affected > 0) {
          if (rememberMe) {
            AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
          } else {
            AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
          }

          Alert.alert('Success', 'Login successful.');
          if (!rememberMe) {
            setEmail('');
          }
          setPassword('');
          login(
            respondJson?.user?.fullName ||
              (respondJson?.user?.email ? String(respondJson.user.email).split('@')[0] : 'User'),
          );
        } else {
          Alert.alert('Login failed', 'Invalid email or password.');
        }
      })
      .catch(err => {
        setSubmitting(false);
        Alert.alert('Error', 'Unable to login. Check your connection.');
      });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bgLayer}>
        <View style={styles.ambientHalo} />
        <View style={styles.ambientFade} />
      </View>

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
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@premium.com"
            placeholderTextColor="#636277"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
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

            <Pressable onPress={_forgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={_login}
            disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Need an account? Create one</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  bgLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  ambientHalo: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    top: -170,
    right: -120,
    backgroundColor: 'rgba(107, 70, 193, 0.22)',
  },
  ambientFade: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    bottom: -150,
    left: -80,
    backgroundColor: 'rgba(67, 56, 202, 0.14)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: '#d8b4fe',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: '#6b46c1',
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