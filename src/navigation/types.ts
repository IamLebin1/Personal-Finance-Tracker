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
  TransactionsStack: undefined;
  AddTransaction: undefined;
  Analytics: undefined;
};