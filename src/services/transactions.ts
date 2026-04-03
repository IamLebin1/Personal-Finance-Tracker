import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  TransactionDraft,
  TransactionRecord,
} from '../types/transactions';

const transactionsCollection = collection(db, 'transactions');

const mapDocument = (snapshot: any): TransactionRecord => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId,
    amount: Number(data.amount),
    category: data.category,
    note: data.note ?? '',
    type: data.type,
    occurredOn: data.occurredOn,
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
};

export const subscribeToTransactions = (
  userId: string,
  onChange: (records: TransactionRecord[]) => void,
) => {
  const transactionQuery = query(
    transactionsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(200),
  );

  return onSnapshot(transactionQuery, snapshot => {
    onChange(snapshot.docs.map(mapDocument));
  });
};

export const getTransactionById = async (transactionId: string) => {
  const ref = doc(db, 'transactions', transactionId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapDocument(snapshot);
};

export const saveTransaction = async (
  userId: string,
  draft: TransactionDraft,
  transactionId?: string,
) => {
  const payload = {
    userId,
    amount: Number(draft.amount),
    category: draft.category.trim(),
    note: draft.note.trim(),
    type: draft.type,
    occurredOn: draft.occurredOn,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (transactionId) {
    const { createdAt, ...updatePayload } = payload;

    await updateDoc(doc(db, 'transactions', transactionId), {
      ...updatePayload,
    });
    return transactionId;
  }

  const created = await addDoc(transactionsCollection, payload);
  return created.id;
};

export const removeTransaction = async (transactionId: string) => {
  await deleteDoc(doc(db, 'transactions', transactionId));
};