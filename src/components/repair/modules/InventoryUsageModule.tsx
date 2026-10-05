'use client';

import React, { useState } from 'react';
import { JobModelConfig } from '@/types/jobModels';
import { InventoryUsageItem } from '@/types/repairExecution';
import { Part } from '@/lib/dal/parts';
import PartSearchSelect from '@/components/PartSearchSelect';
import QuickAddPartModal from '@/components/QuickAddPartModal';

export interface InventoryUsageModuleProps {
  config: JobModelConfig;
  inventoryUsed: InventoryUsageItem[];
  onInventoryChange: (items: InventoryUsageItem[]) => void;
  partsList: Part[];
  onPartCreated: (newPart: Part) => void;
  stockDeducted: boolean;
  onDeductNow?: () => void;
  isDeducting?: boolean;
}

function emptyItem(): InventoryUsageItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    partId: '',
    sku: '',
    description: '',
    quantityUsed: 1,
    unitCost: 0,
    unitPrice: 0,
    totalPrice: 0,
    deducted: false,
  };
}

export default function InventoryUsageModule({
  config,
  inventoryUsed,
  onInventoryChange,
  partsList,
  onPartCreated,
  stockDeducted,
  onDeductNow,
  isDeducting = false,
}: InventoryUsageModuleProps) {
  const invConfig = config.modules.inventoryConsumption;
  if (!invConfig?.enabled) return null;

  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [modalTargetIndex, setModalTargetIndex] = useState<number | null>(null);

  function handleLineChange<K extends keyof InventoryUsageItem>(
    index: number,
    field: K,
    val: InventoryUsageItem[K]
  ) {
    const next = [...inventoryUsed];
    const item = { ...next[index], [field]: val };

    if (field === 'quantityUsed' || field === 'unitPrice') {
      const q = field === 'quantityUsed' ? Number(val) : item.quantityUsed;
      const p = field === 'unitPrice' ? Number(val) : item.unitPrice;
      item.totalPrice = Math.round(q * p * 100) / 100;
    }

    next[index] = item;
    onInventoryChange(next);
  }

  function handleSelectPart(index: number, part: Part) {
    if (!part.id) {
      handleLineChange(index, 'partId', '');
      handleLineChange(index, 'sku', '');
      handleLineChange(index, 'description', '');
      return;
    }

    const next = [...inventoryUsed];
    const unitPrice = part.value || 0;
    const qty = next[index]?.quantityUsed || 1;
    next[index] = {
      ...next[index],
      partId: part.id,
      sku: part.sku || '',
      description: part.description || '',
      unitCost: part.value || 0,
      unitPrice: unitPrice,
      totalPrice: Math.round(qty * unitPrice * 100) / 100,
    };
    onInventoryChange(next);
  }

  function addLine() {
    onInventoryChange([...inventoryUsed, emptyItem()]);
  }

  function removeLine(index: number) {
    if (inventoryUsed.length <= 1) {
      onInventoryChange([emptyItem()]);
      return;
    }
    onInventoryChange(inventoryUsed.filter((_, i) => i !== index));
  }

  function openCreatePartModal(index: number) {
    setModalTargetIndex(index);
    setShowAddPartModal(true);
  }

  function handleQuickPartCreated(part: Part) {
    onPartCreated(part);
    if (modalTargetIndex !== null) {
      handleSelectPart(modalTargetIndex, part);
    }
    setShowAddPartModal(false);
    setModalTargetIndex(null);
  }

  const partsTotal = inventoryUsed.reduce((sum, it) => sum + (it.totalPrice || 0), 0);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>📦</div>
        <div style={{ flex: 1 }}>
          <h3 style={styles.headerTitle}>Inventory & Bill of Materials (BOM) Usage</h3>
          <p style={styles.headerSubtitle}>
            Allocate stock from warehouse/depot and track components consumed during repair execution
          </p>
        </div>
        <div style={styles.stockBadgeContainer}>
          {stockDeducted ? (
            <span style={styles.stockDeductedBadge}>✓ Stock Deducted from Inventory</span>
          ) : (
            <span style={styles.stockPendingBadge}>⏳ Inventory Deduction Pending</span>
          )}
        </div>
      </div>

      {inventoryUsed.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ margin: '0 0 12px 0', color: '#64748b' }}>No parts or materials allocated yet.</p>
          <button type="button" onClick={addLine} style={styles.primaryButton}>
            ＋ Add First Part / Material
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '42%' }}>Inventory Part / Description</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>In Stock</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>Qty Used</th>
                <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Unit Price ($)</th>
                <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Line Total ($)</th>
                <th style={{ ...styles.th, width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {inventoryUsed.map((item, idx) => {
                const matchedPart = partsList.find(p => p.id === item.partId);
                const currentStock = matchedPart?.quantity ?? 0;
                const isStockLow = currentStock < item.quantityUsed;

                return (
                  <tr key={item.id || idx} style={styles.tr}>
                    <td style={styles.td}>
                      <PartSearchSelect
                        parts={partsList}
                        selectedPartId={item.partId}
                        onSelect={p => handleSelectPart(idx, p)}
                        onAddNew={() => openCreatePartModal(idx)}
                        placeholder="Search SKU or part name..."
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {item.partId ? (
                        <span
                          style={{
                            ...styles.stockPill,
                            backgroundColor: isStockLow ? '#fee2e2' : '#f0fdf4',
                            color: isStockLow ? '#b91c1c' : '#15803d',
                            borderColor: isStockLow ? '#fecaca' : '#bbf7d0',
                          }}
                        >
                          {currentStock} avl
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantityUsed}
                        onChange={e =>
                          handleLineChange(idx, 'quantityUsed', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        style={styles.qtyInput}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e =>
                          handleLineChange(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        style={styles.priceInput}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      ${(item.totalPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        style={styles.deleteButton}
                        title="Remove line"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Actions & Total */}
      <div style={styles.footerRow}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" onClick={addLine} style={styles.outlineButton}>
            ＋ Add Part / Material
          </button>
          {!stockDeducted && onDeductNow && inventoryUsed.some(i => i.partId) && (
            <button
              type="button"
              onClick={onDeductNow}
              disabled={isDeducting}
              style={styles.deductNowButton}
            >
              {isDeducting ? 'Deducting Stock...' : '⚡ Deduct Stock Now'}
            </button>
          )}
        </div>
        <div style={styles.totalBadge}>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Parts & Materials Subtotal:</span>
          <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>${partsTotal.toFixed(2)}</strong>
        </div>
      </div>

      {showAddPartModal && (
        <QuickAddPartModal
          tenantId={config.tenantId}
          onPartCreated={handleQuickPartCreated}
          onClose={() => {
            setShowAddPartModal(false);
            setModalTargetIndex(null);
          }}
        />
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap',
  },
  headerIcon: {
    fontSize: '1.5rem',
    backgroundColor: '#dbeafe',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  headerSubtitle: {
    margin: '3px 0 0 0',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  stockBadgeContainer: {
    marginLeft: 'auto',
  },
  stockDeductedBadge: {
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    border: '1px solid #bbf7d0',
  },
  stockPendingBadge: {
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  theadRow: {
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '10px 12px',
    fontWeight: 600,
    color: '#475569',
    fontSize: '0.8125rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '10px 12px',
    verticalAlign: 'middle',
  },
  stockPill: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  qtyInput: {
    width: '60px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  priceInput: {
    width: '80px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    textAlign: 'right',
    fontSize: '0.875rem',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: '12px',
  },
  outlineButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deductNowButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  totalBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
  },
};
