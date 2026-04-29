import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  Vibration,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStackNavigator';
import * as pinService from '../services/pinService';
import { getAuthSession } from '../services/authSession';
import { DarkPalette } from '../constants/theme';

const { width } = Dimensions.get('window');

type Props = any;

const BackgroundDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <Svg height="100%" width="100%">
      <Defs>
        <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={DarkPalette.primary} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={DarkPalette.background} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="80%" cy="10%" r="150" fill="url(#grad1)" />
      <Circle cx="10%" cy="90%" r="100" fill="url(#grad1)" />
    </Svg>
  </View>
);

const PinEntryScreen = ({ navigation }: Props) => {
  const [pin, setPin] = useState('');
  const maxLength = 4;
  const session = getAuthSession();
  const userId = session?.userId || '';

  const handlePress = (num: string) => {
    if (pin.length < maxLength) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === maxLength && userId) {
      const verify = async () => {
        // Small delay for visual feedback of the last dot
        setTimeout(async () => {
          const isValid = await pinService.validatePin(userId, pin);
          if (isValid) {
            navigation.replace('MainTabs');
          } else {
            try {
              Vibration.vibrate(400);
            } catch (err) {
              console.warn('Vibration failed', err);
            }
            Alert.alert('Incorrect PIN', 'Please try again.');
            setPin('');
          }
        }, 100);
      };
      verify();
    }
  }, [pin, navigation, userId]);

  const renderDot = (index: number) => {
    const isActive = pin.length > index;
    return (
      <View 
        key={index} 
        style={[
          styles.dot, 
          isActive && styles.dotActive
        ]} 
      />
    );
  };

  const renderKey = (val: string) => (
    <TouchableOpacity 
      key={val} 
      activeOpacity={0.6}
      style={styles.key} 
      onPress={() => handlePress(val)}
    >
      <Text style={styles.keyText}>{val}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <BackgroundDecor />
      
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>👛</Text>
        </View>
        <Text style={styles.title}>Secure Access</Text>
        <Text style={styles.subtitle}>Enter your security PIN to unlock</Text>
      </View>

      <View style={styles.dotsWrapper}>
        {[0, 1, 2, 3].map(renderDot)}
      </View>

      <View style={styles.keypadContainer}>
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map(renderKey)}
        </View>
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map(renderKey)}
        </View>
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map(renderKey)}
        </View>
        <View style={styles.keypadRow}>
          <View style={styles.emptyKey} />
          {renderKey('0')}
          <TouchableOpacity 
            style={styles.key} 
            activeOpacity={0.6}
            onPress={handleBackspace}
          >
            <Text style={styles.backspaceIcon}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.footerAction}
        onPress={() => {
          Alert.alert(
            'Reset PIN', 
            'For security, you must sign out and sign in again to reset your PIN.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => navigation.replace('Login') }
            ]
          );
        }}
      >
        <Text style={styles.footerText}>Forgot Security PIN?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DarkPalette.background,
    paddingTop: 80,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 110, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(138, 110, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    color: DarkPalette.primary,
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: DarkPalette.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  dotsWrapper: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 60,
    height: 20,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    backgroundColor: DarkPalette.primary,
    borderColor: DarkPalette.primary,
    transform: [{ scale: 1.2 }],
    shadowColor: DarkPalette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  keypadContainer: {
    width: width * 0.85,
    gap: 15,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  key: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    flex: 1,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  backspaceIcon: {
    fontSize: 22,
    color: DarkPalette.primary,
    fontWeight: '600',
  },
  footerAction: {
    marginTop: 'auto',
    marginBottom: 40,
    padding: 12,
  },
  footerText: {
    color: DarkPalette.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PinEntryScreen;

