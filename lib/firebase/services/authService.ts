import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config';

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<{ user: User | null; error?: string }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: 'Firebase Auth가 구성되지 않았습니다.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { user: userCredential.user };
  } catch (err: any) {
    let message = '로그인에 실패했습니다.';
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      message = '이메일 또는 비밀번호가 일치하지 않습니다.';
    } else if (code === 'auth/invalid-email') {
      message = '올바른 이메일 형식이 아닙니다.';
    } else if (code === 'auth/too-many-requests') {
      message = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    } else if (err?.message) {
      message = err.message;
    }
    return { user: null, error: message };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: true };
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || '로그아웃 실패' };
  }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}
