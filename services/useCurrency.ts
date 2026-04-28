import { useEffect, useState } from 'react';
import {
  convertFromUsd,
  convertToUsd,
  getCurrencyState,
  getCurrencySymbol,
  setPreferredCurrency,
  subscribeCurrency,
  type CurrencyCode,
  type CurrencyState,
} from './currencyService';

export function useCurrency() {
  const [state, setState] = useState<CurrencyState>(getCurrencyState());

  useEffect(() => {
    return subscribeCurrency(() => {
      setState(getCurrencyState());
    });
  }, []);

  return {
    ...state,
    symbol: getCurrencySymbol(state.code),
    setPreferredCurrency,
    convertFromUsd: (amount: number) => convertFromUsd(amount, state.code),
    convertToUsd: (amount: number) => convertToUsd(amount, state.code),
    toggleCurrency: () => setPreferredCurrency(state.code === 'USD' ? 'MYR' : 'USD'),
    isMyr: state.code === 'MYR',
  } as {
    code: CurrencyCode;
    usdToMyrRate: number;
    socketConnected: boolean;
    lastUpdatedAt: number | null;
    symbol: string;
    setPreferredCurrency: (code: CurrencyCode) => Promise<void>;
    convertFromUsd: (amount: number) => number;
    convertToUsd: (amount: number) => number;
    toggleCurrency: () => Promise<void>;
    isMyr: boolean;
  };
}
