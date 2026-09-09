import { db } from '@/lib/firebaseClient';
import {
  collection, getDocs, query, where, orderBy, limit as firestoreLimit
} from 'firebase/firestore';
import * as partsDal from './parts';
import * as poDal from './purchaseOrders';

/**
 * Aggregates inventory summary.
 */
export async function getInventorySummary(tenantId: string) {
  const allParts = await partsDal.getAll(tenantId);
  const totalParts = allParts.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalValue = allParts.reduce((acc, p) => acc + ((p.quantity || 0) * (p.value || 0)), 0);
  
  const byType = allParts.reduce((acc: Record<string, number>, p) => {
    const type = p.type || 'Unknown';
    acc[type] = (acc[type] || 0) + (p.quantity || 0);
    return acc;
  }, {});

  return { totalParts, totalValue, byType };
}

/**
 * Gets stock alerts.
 */
export async function getStockAlerts(tenantId: string) {
  const allParts = await partsDal.getAll(tenantId);
  const lowStock = allParts.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) < (p.parLevel || 0));
  const zeroStock = allParts.filter(p => (p.quantity || 0) === 0);
  return { lowStock, zeroStock };
}

/**
 * Aggregates supplier spend from POs.
 */
export async function getSupplierSpend(tenantId: string) {
  const allPOs = await poDal.getAll(tenantId);
  const spendBySupplier = allPOs.reduce((acc: Record<string, number>, po) => {
    if (po.supplier) {
      acc[po.supplier] = (acc[po.supplier] || 0) + (po.value || 0);
    }
    return acc;
  }, {});
  return spendBySupplier;
}

/**
 * Calculates PO fulfillment rate.
 */
export async function getPOFulfillmentRate(tenantId: string) {
  const allPOs = await poDal.getAll(tenantId);
  if (allPOs.length === 0) return 0;
  
  const completed = allPOs.filter(po => po.status === 'completed').length;
  return (completed / allPOs.length) * 100;
}

/**
 * Gets recent activity from audit logs.
 */
export async function getRecentActivity(tenantId: string, limitCount: number = 10) {
  const q = query(
    collection(db, 'auditLogs'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
