import { Part } from '@/lib/dal/parts';
import { PurchaseOrder } from '@/lib/dal/purchaseOrders';

export interface ActivePOReference {
  poId: string;
  status: string;
  supplier?: string;
  quantityOrdered: number;
  expectedDeliveryDate?: string | Date;
}

export interface PartInventoryMetrics {
  quantityInStock: number;
  parLevel: number;
  quantityOnOrder: number;
  netAvailable: number; // in stock + on order
  parDeficit: number; // how much below par
  stockHealth: 'healthy' | 'low_stock' | 'critical' | 'backordered';
  activePOs: ActivePOReference[];
}

/**
 * Calculates on-order quantities and inventory health metrics for a part
 */
export function calculatePartMetrics(
  part: Part,
  purchaseOrders: PurchaseOrder[]
): PartInventoryMetrics {
  const quantityInStock = Number(part.quantity ?? 0);
  const parLevel = Number(part.parLevel ?? 0);

  // Filter to active, uncompleted purchase orders
  const activePOs: ActivePOReference[] = [];
  let quantityOnOrder = 0;

  for (const po of purchaseOrders) {
    if (po.status === 'completed' || po.status === 'cancelled') {
      continue;
    }

    if (po.items && Array.isArray(po.items)) {
      for (const item of po.items) {
        const matchesPart =
          (item.partId && item.partId === part.id) ||
          (item.sku && part.sku && item.sku.toLowerCase() === part.sku.toLowerCase());

        if (matchesPart) {
          const qty = Number(item.quantity || 0);
          quantityOnOrder += qty;
          activePOs.push({
            poId: po.id,
            status: po.status || 'ordered',
            supplier: po.supplier,
            quantityOrdered: qty,
            expectedDeliveryDate: po.expectedDeliveryDate,
          });
        }
      }
    }
  }

  const netAvailable = quantityInStock + quantityOnOrder;
  const parDeficit = Math.max(0, parLevel - quantityInStock);

  let stockHealth: PartInventoryMetrics['stockHealth'] = 'healthy';
  if (quantityInStock === 0 && quantityOnOrder > 0) {
    stockHealth = 'backordered';
  } else if (quantityInStock === 0) {
    stockHealth = 'critical';
  } else if (parLevel > 0 && quantityInStock <= parLevel) {
    stockHealth = 'low_stock';
  }

  return {
    quantityInStock,
    parLevel,
    quantityOnOrder,
    netAvailable,
    parDeficit,
    stockHealth,
    activePOs,
  };
}
