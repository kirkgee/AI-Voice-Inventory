import { db } from '@/lib/firebaseClient';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
  Unsubscribe, DocumentData, QuerySnapshot
} from 'firebase/firestore';

export interface Location {
  id: string;
  tenantId: string;
  name?: string;
  bins?: any[];
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const COLLECTION_NAME = 'locations';

function mapDocToLocation(docId: string, data: DocumentData): Location {
  return {
    id: docId,
    ...data,
  } as Location;
}

/**
 * Gets all locations for a tenant.
 */
export async function getAll(tenantId: string): Promise<Location[]> {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToLocation(doc.id, doc.data()));
}

/**
 * Subscribes to all locations for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (locations: Location[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const locations = snapshot.docs.map(doc => mapDocToLocation(doc.id, doc.data()));
      callback(locations, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a location by ID.
 */
export async function getById(tenantId: string, id: string): Promise<Location | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToLocation(snapshot.id, data);
}

/**
 * Creates a new location.
 */
export async function create(tenantId: string, data: Omit<Location, 'id' | 'tenantId'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing location.
 */
export async function update(tenantId: string, id: string, data: Partial<Location>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a location.
 */
export async function deleteLocation(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Gets parts assigned to a specific bin in a location.
 */
export async function getPartsInBin(tenantId: string, locationId: string, binName: string) {
  const q = query(
    collection(db, 'parts'),
    where('tenantId', '==', tenantId),
    where('locationId', '==', locationId),
    where('binName', '==', binName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Gets parts without an assigned location.
 */
export async function getUnassignedParts(tenantId: string) {
  const q = query(
    collection(db, 'parts'),
    where('tenantId', '==', tenantId)
    // Client-side filtering may be required for absence of field or null
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, any>))
    .filter(part => !part.locationId);
}
