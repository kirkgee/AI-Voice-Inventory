import { getDb } from '../firebaseAdmin';
import { logAuditAction, extractUserFromHeaders } from '../services/auditService';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';

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
  [key: string]: any;
}


/**
 * Get all parts for a tenant
 */
export async function getAll(tenantId: string): Promise<DalResult<Part[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts').where('tenantId', '==', tenantId).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Part) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get a single part by ID
 */
export async function getById(tenantId: string, id: string): Promise<DalResult<Part | null>> {
  try {
  const db = getDb();
  const doc = await db.collection('parts').doc(id).get();
  if (!doc.exists) return { success: true, data: null };
  const data = sanitizeDocument(doc) as Part;
  if (data.tenantId !== tenantId) return { success: true, data: null };
  return { success: true, data: data };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Create a new part
 */
export async function create(tenantId: string, data: Partial<Part>): Promise<DalResult<Part>> {
  try {
  const db = getDb();
  const docRef = db.collection('parts').doc();
  const payload = { ...data, tenantId, createdAt: new Date() };
  await docRef.set(payload);
  return { success: true, data: { id: docRef.id, ...payload } as Part };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update a part
 */
export async function update(tenantId: string, id: string, data: Partial<Part>): Promise<DalResult<Part>> {
  try {
  const db = getDb();
  const docRef = db.collection('parts').doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()?.tenantId !== tenantId) {
    throw new Error('Part not found or unauthorized');
  }
  const payload = { ...data, updatedAt: new Date() };
  await docRef.update(payload);
  const updated = await docRef.get();
  return { success: true, data: sanitizeDocument(updated) as Part };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete a part
 */
async function deleteFn(tenantId: string, id: string, req?: any): Promise<DalResult<void>> {
  try {
  const db = getDb();
  const docRef = db.collection('parts').doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()?.tenantId !== tenantId) {
    throw new Error('Part not found or unauthorized');
  }
  await docRef.delete();
  
  try {
    const user = req ? extractUserFromHeaders(req) : { email: 'system' };
    await logAuditAction(tenantId, user, 'DELETE', 'part', id);
  } catch (e) {
    console.error('Failed to log audit action', e);
  }

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
export { deleteFn as delete };

/**
 * Search parts by SKU, description, supplier
 */
export async function search(tenantId: string, query: string): Promise<DalResult<Part[]>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('parts').where('tenantId', '==', tenantId).get();
    const lowerQuery = query.toLowerCase();
    const data = snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Part).filter((part: Part) => {
      return (part.sku?.toLowerCase().includes(lowerQuery)) ||
             (part.description?.toLowerCase().includes(lowerQuery)) ||
             (part.supplier?.toLowerCase().includes(lowerQuery));
    });
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get parts for a specific supplier
 */
export async function getBySupplier(tenantId: string, supplier: string): Promise<DalResult<Part[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts')
    .where('tenantId', '==', tenantId)
    .where('supplier', '==', supplier)
    .get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Part) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get parts below their par level
 */
export async function getLowStock(tenantId: string): Promise<DalResult<Part[]>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('parts').where('tenantId', '==', tenantId).get();
    const data = snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Part).filter((part: Part) => {
      return part.quantity !== undefined && part.parLevel !== undefined && part.quantity < part.parLevel;
    });
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get parts with quantity 0 that have active POs
 */
export async function getBackOrdered(tenantId: string): Promise<DalResult<Part[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts')
    .where('tenantId', '==', tenantId)
    .where('quantity', '==', 0)
    .get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Part) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get aggregate stats
 */
export async function getBulkStats(tenantId: string): Promise<DalResult<any>> {
  try {
    const partsRes = await getAll(tenantId);
    if (!partsRes.success) throw partsRes.error;
    const parts = partsRes.data;
    return {
      success: true,
      data: {
        totalCount: parts.length,
        totalValue: parts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.value || 0)), 0),
      }
    };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete multiple parts
 */
export async function bulkDelete(tenantId: string, ids: string[]): Promise<DalResult<void>> {
  try {
  const db = getDb();
  const batch = db.batch();
  for (const id of ids) {
    const docRef = db.collection('parts').doc(id);
    batch.delete(docRef);
  }
  await batch.commit();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update multiple parts
 */
export async function bulkUpdate(tenantId: string, updates: {id: string, data: Partial<Part>}[]): Promise<DalResult<void>> {
  try {
  const db = getDb();
  const batch = db.batch();
  for (const update of updates) {
    const docRef = db.collection('parts').doc(update.id);
    batch.update(docRef, { ...update.data, updatedAt: new Date() });
  }
  await batch.commit();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
