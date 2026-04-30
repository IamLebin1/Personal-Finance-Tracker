import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/appConfig';

export type CurrencyCode = 'USD' | 'MYR';

export interface CurrencyState {
  code: CurrencyCode;
  usdToMyrRate: number;
  socketConnected: boolean;
  lastUpdatedAt: number | null;
}

type Listener = () => void;

type AlphaVantageRatePayload = {
  'Realtime Currency Exchange Rate'?: {
    '5. Exchange Rate'?: string;
  };
  Note?: string;
  Information?: string;
  'Error Message'?: string;
};

const CURRENCY_KEY = '@preferred_currency';
const CACHED_RATE_KEY = '@cached_usd_myr_rate';
const DEFAULT_USD_TO_MYR_RATE = 4.7;
const ALPHA_VANTAGE_API_KEY = 'PDPVJNHOMEBYB4B5';
const ALPHA_VANTAGE_RATE_URL =
  `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=MYR&apikey=${ALPHA_VANTAGE_API_KEY}`;
const POLL_INTERVAL_MS = 700000;

let state: CurrencyState = {
  code: (config.currencyCode?.toUpperCase() === 'MYR' ? 'MYR' : 'USD') as CurrencyCode,
  usdToMyrRate: DEFAULT_USD_TO_MYR_RATE,
  socketConnected: false,
  lastUpdatedAt: null,
};

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let shouldPoll = true;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

function setState(partial: Partial<CurrencyState>): void {
  state = { ...state, ...partial };
  notifyListeners();
}

function parseCurrencyCode(value: string | null | undefined): CurrencyCode {
  return String(value || '').toUpperCase() === 'MYR' ? 'MYR' : 'USD';
}

export function subscribeCurrency(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrencyState(): CurrencyState {
  return state;
}

export function getCurrencySymbol(code: CurrencyCode = state.code): string {
  return code === 'MYR' ? 'RM' : '$';
}

export function convertFromUsd(amount: number, code: CurrencyCode = state.code): number {
  if (code === 'MYR') {
    return amount * state.usdToMyrRate;
  }

  return amount;
}

export function convertToUsd(amount: number, code: CurrencyCode = state.code): number {
  if (code === 'MYR') {
    return amount / state.usdToMyrRate;
  }

  return amount;
}

export function formatCurrencyFromUsd(
  amount: number,
  options?: {
    showSign?: boolean;
    currencyCode?: CurrencyCode;
  },
): string {
  const targetCurrency = options?.currencyCode ?? state.code;
  const converted = convertFromUsd(amount, targetCurrency);
  const showSign = options?.showSign ?? false;
  const sign = converted < 0 ? '-' : showSign && converted > 0 ? '+' : '';

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(converted));

    return `${sign}${formatted}`;
  } catch {
    const symbol = getCurrencySymbol(targetCurrency);
    return `${sign}${symbol}${Math.abs(converted).toFixed(2)}`;
  }
}

export async function loadCurrencyPreference(): Promise<CurrencyCode> {
  try {
    const value = await AsyncStorage.getItem(CURRENCY_KEY);
    const parsed = parseCurrencyCode(value);
    setState({ code: parsed });
    return parsed;
  } catch {
    return state.code;
  }
}

export async function setPreferredCurrency(code: CurrencyCode): Promise<void> {
  setState({ code });

  try {
    await AsyncStorage.setItem(CURRENCY_KEY, code);
  } catch (error) {
    console.error('Failed to save preferred currency', error);
  }
}

async function fetchUsdToMyrRate(): Promise<number | null> {
  try {
    // Use AbortController to implement a timeout for fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(ALPHA_VANTAGE_RATE_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AlphaVantageRatePayload;
    if (payload.Note || payload.Information || payload['Error Message']) {
      return null;
    }

    const rateText = payload['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
    const rate = Number(rateText);
    if (!Number.isFinite(rate) || rate <= 0) {
      return null;
    }

    // Cache successful rate
    try {
      await AsyncStorage.setItem(CACHED_RATE_KEY, String(rate));
    } catch (error) {
      console.error('Failed to cache currency rate', error);
    }

    return rate;
  } catch (error) {
    console.warn('Currency rate fetch failed, will use cached rate:', error);
    return null;
  }
}

function clearPollTimer(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function scheduleNextPoll(): void {
  if (!shouldPoll || pollTimer) {
    return;
  }

  pollTimer = setTimeout(() => {
    pollTimer = null;
    void pollRate();
  }, POLL_INTERVAL_MS);
}

async function pollRate(): Promise<void> {
  const nextRate = await fetchUsdToMyrRate();

  if (nextRate) {
    setState({
      usdToMyrRate: nextRate,
      lastUpdatedAt: Date.now(),
      socketConnected: true,
    });
  } else {
    // Attempt to restore from cache when fetch fails
    try {
      const cached = await AsyncStorage.getItem(CACHED_RATE_KEY);
      if (cached) {
        const cachedRate = Number(cached);
        if (Number.isFinite(cachedRate) && cachedRate > 0) {
          setState({ socketConnected: false }); // Offline mode
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load cached rate', error);
    }
    setState({ socketConnected: false });
  }

  scheduleNextPoll();
}

export async function startCurrencyRateFeed(): Promise<void> {
  if (started) {
    return;
  }

  started = true;
  shouldPoll = true;

  // Load cached rate on startup
  try {
    const cached = await AsyncStorage.getItem(CACHED_RATE_KEY);
    if (cached) {
      const cachedRate = Number(cached);
      if (Number.isFinite(cachedRate) && cachedRate > 0) {
        setState({ usdToMyrRate: cachedRate });
      }
    }
  } catch (error) {
    console.error('Failed to load cached currency rate on startup', error);
  }

  await pollRate();
}

export function stopCurrencyRateFeed(): void {
  shouldPoll = false;
  clearPollTimer();

  setState({ socketConnected: false });
}
