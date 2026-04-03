import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const registerWithEmailPassword = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
};

export const loginWithEmailPassword = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email.trim(), password);
};

export const logout = () => {
  return signOut(auth);
};

export { onAuthStateChanged };