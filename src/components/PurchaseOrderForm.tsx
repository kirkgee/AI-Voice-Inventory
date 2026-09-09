'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Part, getAll as getAllParts } from '@/lib/dal/parts';
import {
  PurchaseOrder,
  create as createPO,
  update as updatePO,
} from '@/lib/dal/purchaseOrders';
import PartSearchSelect from './PartSearchSelect';
import QuickAddPartModal from './QuickAddPartModal';

// ─── Types ───────────────────────────────────────────────

export interface POLineItem {
  partId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderFormProps {
  tenantId: string;
  /** Pass an existing PO to enter edit mode; omit for create mode */
  existingPO?: PurchaseOrder | null;
  onSaved?: (poId: string) => void;
  onCancel?: () => void;
}

interface POFormState {
  supplier: string;
  status: string;
  expectedDeliveryDate: string;
  notes: string;
}

const STATUS_OPTIONS = ['draft', 'ordered', 'shipped', 'completed', 'cancelled'];

function emptyLineItem(): POLineItem {
  return { partId: '', sku: '', description: '', quantity: 1, unitPrice: 0 };
}

// ─── Component ───────────────────────────────────────────

export default function PurchaseOrderForm({
  tenantId,
  existingPO,
  onSaved,
  onCancel,
}: PurchaseOrderFormProps) {
  const isEdit = Boolean(existingPO);

  // ─ Parts list (shared across all line item selectors)
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);

  // ─ Quick-add modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  /** Index of the line item that triggered the modal, so we can auto-assign the new part */
  const [addPartForLineIndex, setAddPartForLineIndex] = useState<number | null>(null);

  // ─ PO header fields
  const [form, setForm] = useState<POFormState>(() => ({
    supplier: existingPO?.supplier ?? '',
    status: existingPO?.status ?? 'draft',
    expectedDeliveryDate: existingPO?.expectedDeliveryDate
      ? typeof existingPO.expectedDeliveryDate === 'string'
        ? existingPO.expectedDeliveryDate.slice(0, 10)
        : ''
      : '',
    notes: existingPO?.notes ?? '',
  }));

  // ─ Line items
  const [lineItems, setLineItems] = useState<POLineItem[]>(() => {
    if (existingPO?.items && Array.isArray(existingPO.items)) {
      return existingPO.items as POLineItem[];
    }
    return [emptyLineItem()];
  });

  // ─ Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Load parts ────────────────────────────────────────

  const loadParts = useCallback(async () => {
    try {
      setPartsLoading(true);
      const allParts = await getAllParts(tenantId);
      setParts(allParts);
    } catch (err) {
      console.error('Failed to load parts', err);
    } finally {
      setPartsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  // ─── Handlers ──────────────────────────────────────────

  function handleFormChange(field: keyof POFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleLineItemChange(index: number, field: keyof POLineItem, value: any) {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handlePartSelected(index: number, part: Part) {
    if (!part.id) {
      // Deselection
      handleLineItemChange(index, 'partId', '');
      handleLineItemChange(index, 'sku', '');
      handleLineItemChange(index, 'description', '');
      return;
    }
    setLineItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        partId: part.id,
        sku: part.sku || '',
        description: part.description || '',
        unitPrice: next[index].unitPrice || part.value || 0,
      };
      return next;
    });
  }

  function addLineItem() {
    setLineItems(prev => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems(prev => {
      if (prev.length <= 1) return prev; // Always keep at least one row
      return prev.filter((_, i) => i !== index);
    });
  }

  function openAddPartModal(lineIndex: number) {
    setAddPartForLineIndex(lineIndex);
    setShowAddPartModal(true);
  }

  function handlePartCreated(newPart: Part) {
    // Add the new part to the parts list so it appears in all selectors
    setParts(prev => [...prev, newPart]);

    // If we know which line item triggered the modal, auto-assign
    if (addPartForLineIndex !== null) {
      handlePartSelected(addPartForLineIndex, newPart);
    }

    setShowAddPartModal(false);
    setAddPartForLineIndex(null);
  }

  function handleCloseModal() {
    setShowAddPartModal(false);
    setAddPartForLineIndex(null);
  }

  // ─── Computed ──────────────────────────────────────────

  const totalValue = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // ─── Save ──────────────────────────────────────────────

  async function handleSave() {
    // Basic validation
    const validItems = lineItems.filter(li => li.partId);
    if (validItems.length === 0) {
      setSaveError('Please add at least one part to the purchase order.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const poData: Record<string, any> = {
        supplier: form.supplier.trim(),
        status: form.status,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
        notes: form.notes.trim(),
        items: validItems,
        value: totalValue,
      };

      let poId: string;

      if (isEdit && existingPO) {
        await updatePO(tenantId, existingPO.id, poData);
        poId = existingPO.id;
      } else {
        poId = await createPO(tenantId, poData);
      }

      onSaved?.(poId);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save purchase order.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>
        {isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
      </h2>

      {saveError && (
        <div style={styles.errorBanner}>{saveError}</div>
      )}

      {/* ── Header Fields ──────────────────────── */}
      <div style={styles.section}>
        <div style={styles.row}>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>Supplier</label>
            <input
              style={styles.input}
              type="text"
              value={form.supplier}
              onChange={e => handleFormChange('supplier', e.target.value)}
              placeholder="Supplier name"
              disabled={saving}
            />
          </div>
          <div style={styles.fieldQuarter}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={form.status}
              onChange={e => handleFormChange('status', e.target.value)}
              disabled={saving}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldQuarter}>
            <label style={styles.label}>Expected Delivery</label>
            <input
              style={styles.input}
              type="date"
              value={form.expectedDeliveryDate}
              onChange={e => handleFormChange('expectedDeliveryDate', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        <div style={styles.fieldFull}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={styles.textarea}
            value={form.notes}
            onChange={e => handleFormChange('notes', e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            disabled={saving}
          />
        </div>
      </div>

      {/* ── Line Items ─────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.subheading}>Line Items</h3>
          <button
            style={styles.addRowBtn}
            onClick={addLineItem}
            disabled={saving}
            type="button"
          >
            ＋ Add Line
          </button>
        </div>

        {partsLoading ? (
          <div style={styles.loadingText}>Loading parts...</div>
        ) : (
          <div style={styles.lineItemsContainer}>
            {/* Table header */}
            <div style={styles.lineItemHeader}>
              <div style={{ ...styles.colPart, fontWeight: 600 }}>Part</div>
              <div style={{ ...styles.colSku, fontWeight: 600 }}>SKU</div>
              <div style={{ ...styles.colQty, fontWeight: 600 }}>Qty</div>
              <div style={{ ...styles.colPrice, fontWeight: 600 }}>Unit Price</div>
              <div style={{ ...styles.colTotal, fontWeight: 600 }}>Total</div>
              <div style={styles.colActions}></div>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} style={styles.lineItemRow}>
                <div style={styles.colPart}>
                  <PartSearchSelect
                    parts={parts}
                    selectedPartId={item.partId || null}
                    onSelect={part => handlePartSelected(index, part)}
                    onAddNew={() => openAddPartModal(index)}
                    disabled={saving}
                  />
                </div>
                <div style={styles.colSku}>
                  <span style={styles.skuDisplay}>{item.sku || '—'}</span>
                </div>
                <div style={styles.colQty}>
                  <input
                    style={styles.inputSmall}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e =>
                      handleLineItemChange(index, 'quantity', Math.max(1, Number(e.target.value) || 1))
                    }
                    disabled={saving}
                  />
                </div>
                <div style={styles.colPrice}>
                  <input
                    style={styles.inputSmall}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e =>
                      handleLineItemChange(index, 'unitPrice', Math.max(0, Number(e.target.value) || 0))
                    }
                    disabled={saving}
                  />
                </div>
                <div style={styles.colTotal}>
                  <span style={styles.totalDisplay}>
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
                <div style={styles.colActions}>
                  {lineItems.length > 1 && (
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeLineItem(index)}
                      disabled={saving}
                      title="Remove line item"
                      type="button"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grand total */}
        <div style={styles.grandTotal}>
          <span>PO Total:</span>
          <span style={styles.grandTotalValue}>${totalValue.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <div style={styles.footer}>
        {onCancel && (
          <button style={styles.cancelBtn} onClick={onCancel} disabled={saving} type="button">
            Cancel
          </button>
        )}
        <button
          style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving
            ? 'Saving...'
            : isEdit
              ? 'Update Purchase Order'
              : 'Create Purchase Order'}
        </button>
      </div>

      {/* ── Quick-Add Part Modal ───────────────── */}
      {showAddPartModal && (
        <QuickAddPartModal
          tenantId={tenantId}
          onPartCreated={handlePartCreated}
          onClose={handleCloseModal}
          defaultSupplier={form.supplier}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  heading: {
    margin: '0 0 20px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
  },
  errorBanner: {
    marginBottom: '16px',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
  section: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  subheading: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  row: {
    display: 'flex',
    gap: '14px',
    marginBottom: '14px',
  },
  fieldHalf: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldQuarter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    backgroundColor: '#ffffff',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    resize: 'vertical' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  // ─ Line items table ─
  lineItemsContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  lineItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.8125rem',
    color: '#374151',
  },
  lineItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
  },
  colPart: { flex: 3, minWidth: 0 },
  colSku: { flex: 1, minWidth: '70px' },
  colQty: { width: '75px', flexShrink: 0 },
  colPrice: { width: '95px', flexShrink: 0 },
  colTotal: { width: '90px', flexShrink: 0, textAlign: 'right' as const },
  colActions: { width: '36px', flexShrink: 0, textAlign: 'center' as const },
  inputSmall: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  skuDisplay: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },
  totalDisplay: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#111827',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '2px 4px',
    opacity: 0.6,
  },
  addRowBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loadingText: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  grandTotal: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '14px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: '1.125rem',
    color: '#059669',
  },
  // ─ Footer ─
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '8px',
  },
  cancelBtn: {
    padding: '10px 22px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
