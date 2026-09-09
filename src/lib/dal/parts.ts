import { db } from '@/lib/firebaseClient';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, writeBatch, serverTimestamp, increment,
  Unsubscribe, DocumentData, QuerySnapshot, Query
} from 'firebase/firestore';

export interface Part {
  id: string;
  tenantId: string;
  sku?: string;
  description?: string;
  supplier?: string;
  type?: string;
  quantity?: number;
  parLevel?: number;
  value?: number;
  locationId?: string;
  binName?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const COLLECTION_NAME = 'parts';

function mapDocToPart(docId: string, data: DocumentData): Part {
  return {
    id: docId,
    ...data,
  } as Part;
}

/**
 * Gets all parts for a tenant.
 */
export async function getAll(tenantId: string): Promise<Part[]> {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToPart(doc.id, doc.data()));
}

/**
 * Subscribes to all parts for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (parts: Part[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const parts = snapshot.docs.map(doc => mapDocToPart(doc.id, doc.data()));
      callback(parts, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a part by ID.
 */
export async function getById(tenantId: string, id: string): Promise<Part | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToPart(snapshot.id, data);
}

/**
 * Creates a new part.
 */
export async function create(tenantId: string, data: Omit<Part, 'id' | 'tenantId'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing part.
 */
export async function update(tenantId: string, id: string, data: Partial<Part>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Adjusts the quantity of a part using an atomic increment.
 */
export async function adjustQuantity(tenantId: string, id: string, delta: number): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    quantity: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a part.
 */
export async function deletePart(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Searches for parts client-side by fetching all and filtering.
 */
export async function search(tenantId: string, searchQuery: string): Promise<Part[]> {
  const allParts = await getAll(tenantId);
  const lowerQuery = searchQuery.toLowerCase();
  return allParts.filter(part => 
    (part.sku?.toLowerCase().includes(lowerQuery)) || 
    (part.description?.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Gets parts that are at or below their par level.
 */
export async function getLowStock(tenantId: string): Promise<Part[]> {
  const allParts = await getAll(tenantId);
  return allParts.filter(part => {
    const qty = part.quantity || 0;
    const par = part.parLevel || 0;
    return qty < par;
  });
}

/**
 * Bulk deletes parts.
 */
export async function bulkDelete(tenantId: string, ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach(id => {
    batch.delete(doc(db, COLLECTION_NAME, id));
  });
  await batch.commit();
}

/**
 * Bulk updates parts.
 */
export async function bulkUpdate(tenantId: string, updates: { id: string; data: Partial<Part> }[]): Promise<void> {
  const batch = writeBatch(db);
  updates.forEach(({ id, data }) => {
    batch.update(doc(db, COLLECTION_NAME, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
