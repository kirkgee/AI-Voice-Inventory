import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';
import { RepairOrder } from '@/types/repairExecution';

export async function getAll(
  tenantId: string,
  filters?: { status?: string; partnerId?: string; configId?: string }
): Promise<DalResult<RepairOrder[]>> {
  try {
    const db = getDb();
    let query: any = db.collection('repairOrders').where('tenantId', '==', tenantId);

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.partnerId) {
      query = query.where('crmPartnerId', '==', filters.partnerId);
    }
    if (filters?.configId) {
      query = query.where('jobConfigId', '==', filters.configId);
    }

    const snapshot = await query.get();
    return {
      success: true,
      data: snapshot.docs.map((doc: any) => sanitizeDocument(doc) as RepairOrder),
    };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function getById(tenantId: string, id: string): Promise<DalResult<RepairOrder | null>> {
  try {
    const db = getDb();
    const doc = await db.collection('repairOrders').doc(id).get();
    if (!doc.exists) return { success: true, data: null };
    const data = sanitizeDocument(doc) as RepairOrder;
    if (data.tenantId !== tenantId) return { success: true, data: null };
    return { success: true, data };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function create(
  tenantId: string,
  data: Partial<RepairOrder>
): Promise<DalResult<RepairOrder>> {
  try {
    const db = getDb();
    const docRef = db.collection('repairOrders').doc();
    const payload = {
      ...data,
      tenantId,
      stockDeducted: data.stockDeducted ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await docRef.set(payload);
    return { success: true, data: { id: docRef.id, ...payload } as RepairOrder };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function update(
  tenantId: string,
  id: string,
  data: Partial<RepairOrder>
): Promise<DalResult<RepairOrder>> {
  try {
    const db = getDb();
    const docRef = db.collection('repairOrders').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return { success: false, error: { error: 'Repair order not found', code: 'NOT_FOUND', retryable: false } };
    if (existing.data()?.tenantId !== tenantId) return { success: false, error: { error: 'Unauthorized tenant access', code: 'UNAUTHORIZED', retryable: false } };

    const payload = { ...data, updatedAt: new Date() };
    await docRef.update(payload);
    return { success: true, data: { id, ...existing.data(), ...payload } as RepairOrder };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

export async function remove(tenantId: string, id: string): Promise<DalResult<void>> {
  try {
    const db = getDb();
    const docRef = db.collection('repairOrders').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return { success: false, error: { error: 'Repair order not found', code: 'NOT_FOUND', retryable: false } };
    if (existing.data()?.tenantId !== tenantId) return { success: false, error: { error: 'Unauthorized tenant access', code: 'UNAUTHORIZED', retryable: false } };


    await docRef.delete();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
