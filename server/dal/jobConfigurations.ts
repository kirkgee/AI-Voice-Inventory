import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';
import { JobModelConfig } from '@/types/jobModels';

export async function getAll(tenantId: string): Promise<DalResult<JobModelConfig[]>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('jobConfigurations').where('tenantId', '==', tenantId).get();
    return {
      success: true,
      data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as JobModelConfig),
    };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function getById(tenantId: string, id: string): Promise<DalResult<JobModelConfig | null>> {
  try {
    const db = getDb();
    const doc = await db.collection('jobConfigurations').doc(id).get();
    if (!doc.exists) return { success: true, data: null };
    const data = sanitizeDocument(doc) as JobModelConfig;
    if (data.tenantId !== tenantId) return { success: true, data: null };
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function create(
  tenantId: string,
  data: Partial<JobModelConfig>
): Promise<DalResult<JobModelConfig>> {
  try {
    const db = getDb();
    const docRef = db.collection('jobConfigurations').doc();
    const payload = { ...data, tenantId, createdAt: new Date(), updatedAt: new Date() };
    await docRef.set(payload);
    return { success: true, data: { id: docRef.id, ...payload } as JobModelConfig };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function update(
  tenantId: string,
  id: string,
  data: Partial<JobModelConfig>
): Promise<DalResult<JobModelConfig>> {
  try {
    const db = getDb();
    const docRef = db.collection('jobConfigurations').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return { success: false, error: { error: 'Job configuration not found', code: 'NOT_FOUND', retryable: false } };
    if (existing.data()?.tenantId !== tenantId) return { success: false, error: { error: 'Unauthorized tenant access', code: 'UNAUTHORIZED', retryable: false } };

    const payload = { ...data, updatedAt: new Date() };
    await docRef.update(payload);
    return { success: true, data: { id, ...existing.data(), ...payload } as JobModelConfig };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function remove(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
    const db = getDb();
    const docRef = db.collection('jobConfigurations').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return { success: false, error: { error: 'Job configuration not found', code: 'NOT_FOUND', retryable: false } };
    if (existing.data()?.tenantId !== tenantId) return { success: false, error: { error: 'Unauthorized tenant access', code: 'UNAUTHORIZED', retryable: false } };


    await docRef.delete();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
