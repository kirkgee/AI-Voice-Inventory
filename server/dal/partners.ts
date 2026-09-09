import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';

export interface Partner {
  id: string;
  tenantId: string;
  name?: string;
  type?: string;
  [key: string]: any;
}


/**
 * Get all partners
 */
export async function getAll(tenantId: string): Promise<DalResult<Partner[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('partners').where('tenantId', '==', tenantId).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Partner) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get single partner
 */
export async function getById(tenantId: string, id: string): Promise<DalResult<Partner | null>> {
  try {
  const db = getDb();
  const doc = await db.collection('partners').doc(id).get();
  if (!doc.exists) return { success: true, data: null };
  const data = sanitizeDocument(doc) as Partner;
  if (data.tenantId !== tenantId) return { success: true, data: null };
  return { success: true, data: data };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Create partner
 */
export async function create(tenantId: string, data: Partial<Partner>): Promise<DalResult<Partner>> {
  try {
  const db = getDb();
  const docRef = db.collection('partners').doc();
  const payload = { ...data, tenantId, createdAt: new Date() };
  await docRef.set(payload);
  return { success: true, data: { id: docRef.id, ...payload } as Partner };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update partner
 */
export async function update(tenantId: string, id: string, data: Partial<Partner>): Promise<DalResult<Partner>> {
  try {
  const db = getDb();
  const docRef = db.collection('partners').doc(id);
  await docRef.update({ ...data, updatedAt: new Date() });
  const updated = await docRef.get();
  return { success: true, data: sanitizeDocument(updated) as Partner };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete partner
 */
async function deletePartner(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
  const db = getDb();
  await db.collection('partners').doc(id).delete();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
export { deletePartner as delete };

/**
 * Search partners by name
 */
export async function search(tenantId: string, query: string): Promise<DalResult<Partner[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('partners').where('tenantId', '==', tenantId).get();
  const lowerQuery = query.toLowerCase();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Partner).filter((p: Partner) => p.name?.toLowerCase().includes(lowerQuery)) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get partners of a specific type
 */
export async function getByType(tenantId: string, type: string): Promise<DalResult<Partner[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('partners').where('tenantId', '==', tenantId).where('type', '==', type).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Partner) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get partners that have active POs
 */
export async function getWithActivePOs(tenantId: string): Promise<DalResult<Partner[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('partners').where('tenantId', '==', tenantId).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Partner) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
