import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  status?: string;
  expectedDeliveryDate?: string;
  value?: number;
  [key: string]: any;
}


/**
 * Get all POs
 */
export async function getAll(tenantId: string, filters?: any): Promise<DalResult<PurchaseOrder[]>> {
  try {
  const db = getDb();
  let query: any = db.collection('purchaseOrders').where('tenantId', '==', tenantId);
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  const snapshot = await query.get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as PurchaseOrder) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get single PO
 */
export async function getById(tenantId: string, id: string): Promise<DalResult<PurchaseOrder | null>> {
  try {
  const db = getDb();
  const doc = await db.collection('purchaseOrders').doc(id).get();
  if (!doc.exists) return { success: true, data: null };
  const data = sanitizeDocument(doc) as PurchaseOrder;
  if (data.tenantId !== tenantId) return { success: true, data: null };
  return { success: true, data: data };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Create PO
 */
export async function create(tenantId: string, data: Partial<PurchaseOrder>): Promise<DalResult<PurchaseOrder>> {
  try {
  const db = getDb();
  const docRef = db.collection('purchaseOrders').doc();
  const payload = { ...data, tenantId, createdAt: new Date() };
  await docRef.set(payload);
  return { success: true, data: { id: docRef.id, ...payload } as PurchaseOrder };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update PO
 */
export async function update(tenantId: string, id: string, data: Partial<PurchaseOrder>): Promise<DalResult<PurchaseOrder>> {
  try {
  const db = getDb();
  const docRef = db.collection('purchaseOrders').doc(id);
  const payload = { ...data, updatedAt: new Date() };
  await docRef.update(payload);
  const updated = await docRef.get();
  return { success: true, data: sanitizeDocument(updated) as PurchaseOrder };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete PO
 */
async function deletePo(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
  const db = getDb();
  await db.collection('purchaseOrders').doc(id).delete();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
export { deletePo as delete };

/**
 * Get POs with status != 'completed' and != 'cancelled'
 */
export async function getOpen(tenantId: string): Promise<DalResult<PurchaseOrder[]>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('purchaseOrders').where('tenantId', '==', tenantId).get();
    const data = snapshot.docs.map((doc: any) => sanitizeDocument(doc) as PurchaseOrder)
      .filter((po: PurchaseOrder) => po.status !== 'completed' && po.status !== 'cancelled');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get POs past their expected delivery date
 */
export async function getOverdue(tenantId: string): Promise<DalResult<PurchaseOrder[]>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('purchaseOrders').where('tenantId', '==', tenantId).get();
    const now = new Date().toISOString();
    const data = snapshot.docs.map((doc: any) => sanitizeDocument(doc) as PurchaseOrder)
      .filter((po: PurchaseOrder) => po.expectedDeliveryDate && po.expectedDeliveryDate < now && po.status !== 'completed' && po.status !== 'cancelled');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Sum of all PO values
 */
export async function getTotalValue(tenantId: string, status?: string): Promise<DalResult<number>> {
  try {
    const posRes = await getAll(tenantId, { status });
    if (!posRes.success) throw posRes.error;
    return { success: true, data: posRes.data.reduce((sum, po) => sum + (po.value || 0), 0) };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete multiple POs
 */
export async function bulkDelete(tenantId: string, ids: string[]): Promise<DalResult<void>> {
  try {
  const db = getDb();
  const batch = db.batch();
  for (const id of ids) {
    const docRef = db.collection('purchaseOrders').doc(id);
    batch.delete(docRef);
  }
  await batch.commit();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Change PO status
 */
export async function updateStatus(tenantId: string, id: string, status: string): Promise<DalResult<PurchaseOrder>> {
  try {
    return await update(tenantId, id, { status });
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
