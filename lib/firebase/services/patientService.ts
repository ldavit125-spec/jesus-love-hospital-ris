import {
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config';
import { getPatientsCollection } from '../collections';
import type { Patient } from '../types';

/**
 * Fetch all patients from Firestore with safety checks
 */
export async function getPatients(): Promise<Patient[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const colRef = getPatientsCollection();
    if (!colRef) return [];

    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return [];

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error: any) {
    console.warn('[patientService] getPatients error:', error?.message || error);
    return [];
  }
}

/**
 * Fetch a single patient by document ID or patientId
 */
export async function getPatientById(idOrPatientId: string): Promise<Patient | null> {
  if (!isFirebaseConfigured || !db || !idOrPatientId) {
    return null;
  }

  try {
    const colRef = getPatientsCollection();
    if (!colRef) return null;

    // First try document ID
    const docRef = doc(colRef, idOrPatientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    // Next try query by patientId field
    const q = query(colRef, where('patientId', '==', idOrPatientId), limit(1));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return { id: firstDoc.id, ...firstDoc.data() };
    }

    return null;
  } catch (error: any) {
    console.warn('[patientService] getPatientById error:', error?.message || error);
    return null;
  }
}
