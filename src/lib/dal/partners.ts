import { db } from '@/lib/firebaseClient';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
  Unsubscribe, DocumentData, QuerySnapshot
} from 'firebase/firestore';

export interface Partner {
  id: string;
  tenantId: string;
  name?: string;
  type?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const COLLECTION_NAME = 'partners';

function mapDocToPartner(docId: string, data: DocumentData): Partner {
  return {
    id: docId,
    ...data,
  } as Partner;
}

/**
 * Gets all partners for a tenant.
 */
export async function getAll(tenantId: string): Promise<Partner[]> {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToPartner(doc.id, doc.data()));
}

/**
 * Subscribes to all partners for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (partners: Partner[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const partners = snapshot.docs.map(doc => mapDocToPartner(doc.id, doc.data()));
      callback(partners, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a partner by ID.
 */
export async function getById(tenantId: string, id: string): Promise<Partner | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToPartner(snapshot.id, data);
}

/**
 * Creates a new partner.
 */
export async function create(tenantId: string, data: Omit<Partner, 'id' | 'tenantId'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing partner.
 */
export async function update(tenantId: string, id: string, data: Partial<Partner>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a partner.
 */
export async function deletePartner(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Searches for partners client-side.
 */
export async function search(tenantId: string, searchQuery: string): Promise<Partner[]> {
  const allPartners = await getAll(tenantId);
  const lowerQuery = searchQuery.toLowerCase();
  return allPartners.filter(partner => 
    partner.name?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Gets partners by type.
 */
export async function getByType(tenantId: string, type: string): Promise<Partner[]> {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('tenantId', '==', tenantId),
    where('type', '==', type)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToPartner(doc.id, doc.data()));
}
