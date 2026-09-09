import { db } from '@/lib/firebaseClient';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
  Unsubscribe, DocumentData, QuerySnapshot
} from 'firebase/firestore';

export interface User {
  id: string;
  tenantId: string;
  email?: string;
  role?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const COLLECTION_NAME = 'users';

function mapDocToUser(docId: string, data: DocumentData): User {
  return {
    id: docId,
    ...data,
  } as User;
}

/**
 * Gets all users for a tenant.
 */
export async function getAll(tenantId: string): Promise<User[]> {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToUser(doc.id, doc.data()));
}

/**
 * Subscribes to all users for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (users: User[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const users = snapshot.docs.map(doc => mapDocToUser(doc.id, doc.data()));
      callback(users, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a user by ID.
 */
export async function getById(tenantId: string, id: string): Promise<User | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToUser(snapshot.id, data);
}

/**
 * Gets a user by email.
 */
export async function getByEmail(tenantId: string, email: string): Promise<User | null> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('tenantId', '==', tenantId),
    where('email', '==', email)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return mapDocToUser(snapshot.docs[0].id, snapshot.docs[0].data());
}

/**
 * Creates a new user.
 */
export async function create(tenantId: string, data: Omit<User, 'id' | 'tenantId'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing user.
 */
export async function update(tenantId: string, id: string, data: Partial<User>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a user.
 */
export async function deleteUser(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
