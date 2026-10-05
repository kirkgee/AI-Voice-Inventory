import { db } from '@/lib/firebaseClient';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { RepairOrder, InventoryUsageItem } from '@/types/repairExecution';
import * as partsDal from './parts';

const COLLECTION_NAME = 'repairOrders';
const EVENTS_COLLECTION = 'inventory_events';

function mapDocToRepairOrder(docId: string, data: DocumentData): RepairOrder {
  return {
    id: docId,
    ...data,
  } as RepairOrder;
}

/**
 * Gets all repair orders for a tenant with optional status/partner filter.
 */
export async function getAll(
  tenantId: string,
  filters?: { status?: string; partnerId?: string; configId?: string }
): Promise<RepairOrder[]> {
  let q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.partnerId) {
    q = query(q, where('crmPartnerId', '==', filters.partnerId));
  }
  if (filters?.configId) {
    q = query(q, where('jobConfigId', '==', filters.configId));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapDocToRepairOrder(d.id, d.data()));
}

/**
 * Subscribes to all repair orders for a tenant in real-time.
 */
export function subscribeAll(
  tenantId: string,
  callback: (orders: RepairOrder[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      const orders = snapshot.docs.map(d => mapDocToRepairOrder(d.id, d.data()));
      callback(orders, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }
  );
}

/**
 * Gets a repair order by ID.
 */
export async function getById(tenantId: string, id: string): Promise<RepairOrder | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return mapDocToRepairOrder(snapshot.id, data);
}

/**
 * Creates a new repair order.
 * If autoDeductStock is enabled on creation or requested, will deduct parts.
 */
export async function create(
  tenantId: string,
  data: Omit<RepairOrder, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  autoDeductStock: boolean = false
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    stockDeducted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const orderId = docRef.id;

  if (autoDeductStock && data.inventoryUsed && data.inventoryUsed.length > 0) {
    await deductInventory(tenantId, orderId, data.inventoryUsed, data.orderNumber);
  }

  return orderId;
}

/**
 * Updates an existing repair order.
 */
export async function update(
  tenantId: string,
  id: string,
  data: Partial<RepairOrder>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates the status of a repair order.
 */
export async function updateStatus(
  tenantId: string,
  id: string,
  newStatus: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Atomically deducts inventory stock for parts consumed by this repair execution.
 * Also logs an inventory event for full traceability and auditability.
 */
export async function deductInventory(
  tenantId: string,
  orderId: string,
  inventoryItems: InventoryUsageItem[],
  orderNumber?: string
): Promise<void> {
  for (const item of inventoryItems) {
    if (!item.partId || item.quantityUsed <= 0 || item.deducted) continue;

    try {
      // 1. Decrement part quantity in inventory atomically
      await partsDal.adjustQuantity(tenantId, item.partId, -Math.abs(item.quantityUsed));

      // 2. Log inventory event
      await addDoc(collection(db, EVENTS_COLLECTION), {
        tenantId,
        eventType: 'REPAIR_USAGE',
        partId: item.partId,
        sku: item.sku || '',
        quantityDelta: -Math.abs(item.quantityUsed),
        referenceType: 'repairOrder',
        referenceId: orderId,
        referenceNumber: orderNumber || orderId,
        notes: `Consumed for repair execution ${orderNumber || orderId}`,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error(`Failed to deduct inventory for part ${item.partId}:`, err);
    }
  }

  // Mark order as stock deducted
  const docRef = doc(db, COLLECTION_NAME, orderId);
  await updateDoc(docRef, {
    stockDeducted: true,
    stockDeductedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a repair order.
 */
export async function deleteOrder(tenantId: string, id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
