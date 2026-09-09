import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';

export interface Location {
  id: string;
  tenantId: string;
  name?: string;
  bins?: any[];
  [key: string]: any;
}


/**
 * Get all locations with bins
 */
export async function getAll(tenantId: string): Promise<DalResult<Location[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('locations').where('tenantId', '==', tenantId).get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as Location) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get single location
 */
export async function getById(tenantId: string, id: string): Promise<DalResult<Location | null>> {
  try {
  const db = getDb();
  const doc = await db.collection('locations').doc(id).get();
  if (!doc.exists) return { success: true, data: null };
  const data = sanitizeDocument(doc) as Location;
  if (data.tenantId !== tenantId) return { success: true, data: null };
  return { success: true, data: data };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Create location
 */
export async function create(tenantId: string, data: Partial<Location>): Promise<DalResult<Location>> {
  try {
  const db = getDb();
  const docRef = db.collection('locations').doc();
  const payload = { ...data, tenantId, createdAt: new Date() };
  await docRef.set(payload);
  return { success: true, data: { id: docRef.id, ...payload } as Location };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Update location (including bins)
 */
export async function update(tenantId: string, id: string, data: Partial<Location>): Promise<DalResult<Location>> {
  try {
  const db = getDb();
  const docRef = db.collection('locations').doc(id);
  await docRef.update({ ...data, updatedAt: new Date() });
  const updated = await docRef.get();
  return { success: true, data: sanitizeDocument(updated) as Location };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Delete location
 */
async function deleteLocation(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
  const db = getDb();
  await db.collection('locations').doc(id).delete();

    return { success: true, data: undefined as any };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
export { deleteLocation as delete };

/**
 * Get parts assigned to a specific bin
 */
export async function getPartsInBin(tenantId: string, locationId: string, binName: string): Promise<DalResult<any[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts')
    .where('tenantId', '==', tenantId)
    .where('locationId', '==', locationId)
    .where('binName', '==', binName)
    .get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc)) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Get parts not assigned to any bin
 */
export async function getUnassignedParts(tenantId: string): Promise<DalResult<any[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts')
    .where('tenantId', '==', tenantId)
    .get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc)).filter((p: any) => !p.locationId) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
