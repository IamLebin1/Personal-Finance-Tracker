import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login:
    | {
        prefillEmail?: string;
        registeredName?: string;
      }
    | undefined;
  Register: undefined;
};

export type TransactionsStackParamList = {
  Transactions: undefined;
  TransactionForm: {
    transactionId?: string;
  };
};

export type MainTabParamList = {
  TransactionsStack: NavigatorScreenParams<TransactionsStackParamList> | undefined;
  History: undefined;
  Accounts: undefined;
  Analytics: undefined;
};