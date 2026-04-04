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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

var config = require('../config/Config');

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

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

const RegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const _register = () => {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing details', 'Enter your full name, email, and password.');
      return;
    }

    if (trimmedFullName.length < 2) {
      Alert.alert('Invalid name', 'Please enter your full name.');
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

    fetch(config.settings.serverPath + '/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: trimmedFullName,
        email: trimmedEmail,
        password: trimmedPassword,
      }),
    })
      .then(respond => respond.json())
      .then(respondJson => {
        setSubmitting(false);

        if (respondJson.affected > 0) {
          Alert.alert('Success', 'Account created. Please sign in.');
          setFullName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setAgreeTerms(false);
          navigation.navigate('Login', {
            prefillEmail: trimmedEmail,
            registeredName: trimmedFullName,
          });
        } else {
          Alert.alert('Registration failed', 'Please try again.');
        }
      })
      .catch(err => {
        setSubmitting(false);
        Alert.alert('Error', 'Unable to register. Check your connection.');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Secure your financial future today.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Enter your name"
            placeholderTextColor="#636277"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@xxx.com"
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
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
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
            onPress={_register}
            disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? Sign In</Text>
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

export default RegisterScreen;