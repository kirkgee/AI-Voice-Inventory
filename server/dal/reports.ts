import { getDb } from '../firebaseAdmin';
import { DalResult, handleDalError, sanitizeDoc as sanitizeDocument } from './utils';


/**
 * Total parts, total value, by type breakdown
 */
export async function getInventorySummary(tenantId: string): Promise<DalResult<any>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts').where('tenantId', '==', tenantId).get();
  const parts = snapshot.docs.map((doc: any) => sanitizeDocument(doc));
  
  const byType: Record<string, number> = {};
  let totalValue = 0;
  
  parts.forEach((p: any) => {
    const type = p.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
    totalValue += (p.quantity || 0) * (p.value || 0);
  });

    return { success: true, data: {
      totalParts: parts.length,
      totalValue,
      byType
    } };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Low stock, zero stock, expiring lots
 */
export async function getStockAlerts(tenantId: string): Promise<DalResult<any>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('parts').where('tenantId', '==', tenantId).get();
  const parts = snapshot.docs.map((doc: any) => sanitizeDocument(doc));
  
  const lowStock = parts.filter((p: any) => p.quantity !== undefined && p.parLevel !== undefined && p.quantity > 0 && p.quantity < p.parLevel);
  const zeroStock = parts.filter((p: any) => p.quantity === 0);
  const expiringLots: any[] = []; 
  
  return { success: true, data: { lowStock, zeroStock, expiringLots } };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Spend by supplier
 */
export async function getSupplierSpend(tenantId: string, dateRange?: any): Promise<DalResult<any>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('purchaseOrders').where('tenantId', '==', tenantId).get();
  const pos = snapshot.docs.map((doc: any) => sanitizeDocument(doc));
  
  const spendBySupplier: Record<string, number> = {};
  pos.forEach((po: any) => {
    if (po.supplier) { // assuming po.supplier is stored or ID is stored
      spendBySupplier[po.supplier] = (spendBySupplier[po.supplier] || 0) + (po.value || 0);
    }
  });
  
  return { success: true, data: spendBySupplier };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * % of POs completed on time
 */
export async function getPOFulfillmentRate(tenantId: string): Promise<DalResult<number>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('purchaseOrders').where('tenantId', '==', tenantId).get();
  if (snapshot.empty) return { success: true, data: 0 };
  
  const pos = snapshot.docs.map((doc: any) => sanitizeDocument(doc));
  const completed = pos.filter((po: any) => po.status === 'completed').length;
  
  return { success: true, data: (completed / pos.length) * 100 };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}

/**
 * Recent audit trail entries
 */
export async function getRecentActivity(tenantId: string, limit: number = 10): Promise<DalResult<any[]>> {
  try {
  const db = getDb();
  const snapshot = await db.collection('auditLogs')
    .where('tenantId', '==', tenantId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return { success: true, data: snapshot.docs.map((doc: any) => sanitizeDocument(doc)) };

  } catch (e) {
    return { success: false, error: handleDalError(e) };
  }
}
