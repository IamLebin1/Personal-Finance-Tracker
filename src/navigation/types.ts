export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TransactionsStackParamList = {
  Transactions: undefined;
  TransactionForm: {
    transactionId?: string;
  };
};

export type MainTabParamList = {
  TransactionsStack: undefined;
  Analytics: undefined;
};