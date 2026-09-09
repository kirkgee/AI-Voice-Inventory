import { db } from '@/lib/firebaseClient';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, writeBatch, serverTimestamp,
  Unsubscribe, DocumentData, QuerySnapshot
} from 'firebase/firestore';

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  status?: string;
  expectedDeliveryDate?: string | Date;
  value?: number;
  supplier?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const COLLECTION_NAME = 'purchaseOrders';

function mapDocToPO(docId: string, data: DocumentData): PurchaseOrder {
  return {
    id: docId,
    ...data,
  } as PurchaseOrder;
}

/**
 * Gets all purchase orders for a tenant.
 */
export async function getAll(tenantId: string, filters?: any): Promise<PurchaseOrder[]> {
  let q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  // Additional filters could be chained here if needed
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToPO(doc.id, doc.data()));
}

/**
 * Subscribes to all purchase orders for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (pos: PurchaseOrder[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const pos = snapshot.docs.map(doc => mapDocToPO(doc.id, doc.data()));
      callback(pos, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a PO by ID.
 */
export async function getById(tenantId: string, id: string): Promise<PurchaseOrder | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToPO(snapshot.id, data);
}

/**
 * Creates a new PO.
 */
export async function create(tenantId: string, data: Omit<PurchaseOrder, 'id' | 'tenantId'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing PO.
 */
export async function update(tenantId: string, id: string, data: Partial<PurchaseOrder>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a PO.
 */
export async function deletePO(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Gets open POs.
 */
export async function getOpen(tenantId: string): Promise<PurchaseOrder[]> {
  const allPOs = await getAll(tenantId);
  return allPOs.filter(po => po.status !== 'completed' && po.status !== 'cancelled');
}

/**
 * Gets overdue POs.
 */
export async function getOverdue(tenantId: string): Promise<PurchaseOrder[]> {
  const allPOs = await getOpen(tenantId);
  const now = new Date();
  return allPOs.filter(po => {
    if (!po.expectedDeliveryDate) return false;
    const delivery = new Date(po.expectedDeliveryDate);
    return delivery < now;
  });
}

/**
 * Gets total value of POs, optionally filtered by status.
 */
export async function getTotalValue(tenantId: string, status?: string): Promise<number> {
  const allPOs = await getAll(tenantId);
  return allPOs
    .filter(po => (status ? po.status === status : true))
    .reduce((acc, po) => acc + (po.value || 0), 0);
}

/**
 * Updates status of a PO.
 */
export async function updateStatus(tenantId: string, id: string, status: string): Promise<void> {
  await update(tenantId, id, { status });
}

/**
 * Bulk deletes POs.
 */
export async function bulkDelete(tenantId: string, ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach(id => {
    batch.delete(doc(db, COLLECTION_NAME, id));
  });
  await batch.commit();
}
