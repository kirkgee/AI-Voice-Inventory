'use client';

import React, { useState } from 'react';
import { Part, create as createPart } from '@/lib/dal/parts';

export interface QuickAddPartModalProps {
  tenantId: string;
  onPartCreated: (part: Part) => void;
  onClose: () => void;
  /** Optional: pre-fill the supplier field (e.g. from the PO's supplier) */
  defaultSupplier?: string;
}

interface FormState {
  sku: string;
  description: string;
  supplier: string;
  type: string;
  quantity: string;
  parLevel: string;
  value: string;
}

const initialForm: FormState = {
  sku: '',
  description: '',
  supplier: '',
  type: '',
  quantity: '0',
  parLevel: '0',
  value: '0',
};

export default function QuickAddPartModal({
  tenantId,
  onPartCreated,
  onClose,
  defaultSupplier = '',
}: QuickAddPartModalProps) {
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    supplier: defaultSupplier,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const qty = Number(form.quantity);
    if (isNaN(qty) || qty < 0) {
      newErrors.quantity = 'Quantity must be a non-negative number';
    }

    const par = Number(form.parLevel);
    if (isNaN(par) || par < 0) {
      newErrors.parLevel = 'Par level must be a non-negative number';
    }

    const val = Number(form.value);
    if (isNaN(val) || val < 0) {
      newErrors.value = 'Value must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const partData = {
        sku: form.sku.trim(),
        description: form.description.trim(),
        supplier: form.supplier.trim() || undefined,
        type: form.type.trim() || undefined,
        quantity: Number(form.quantity),
        parLevel: Number(form.parLevel),
        value: Number(form.value),
      };

      const newId = await createPart(tenantId, partData);

      const newPart: Part = {
        id: newId,
        tenantId,
        ...partData,
      };

      onPartCreated(newPart);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to create part. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Create New Part</h3>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {saveError && (
          <div style={styles.errorBanner}>
            {saveError}
          </div>
        )}

        <div style={styles.form}>
          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>
                SKU <span style={styles.required}>*</span>
              </label>
              <input
                style={{
                  ...styles.input,
                  ...(errors.sku ? styles.inputError : {}),
                }}
                type="text"
                value={form.sku}
                onChange={e => handleChange('sku', e.target.value)}
                placeholder="e.g. WDG-1234"
                disabled={saving}
                autoFocus
              />
              {errors.sku && <span style={styles.fieldError}>{errors.sku}</span>}
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Type</label>
              <input
                style={styles.input}
                type="text"
                value={form.type}
                onChange={e => handleChange('type', e.target.value)}
                placeholder="e.g. Widget, Fastener"
                disabled={saving}
              />
            </div>
          </div>

          <div style={styles.fieldFull}>
            <label style={styles.label}>
              Description <span style={styles.required}>*</span>
            </label>
            <input
              style={{
                ...styles.input,
                ...(errors.description ? styles.inputError : {}),
              }}
              type="text"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Part description"
              disabled={saving}
            />
            {errors.description && (
              <span style={styles.fieldError}>{errors.description}</span>
            )}
          </div>

          <div style={styles.fieldFull}>
            <label style={styles.label}>Supplier</label>
            <input
              style={styles.input}
              type="text"
              value={form.supplier}
              onChange={e => handleChange('supplier', e.target.value)}
              placeholder="Supplier name"
              disabled={saving}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Quantity</label>
              <input
                style={{
                  ...styles.input,
                  ...(errors.quantity ? styles.inputError : {}),
                }}
                type="number"
                min="0"
                value={form.quantity}
                onChange={e => handleChange('quantity', e.target.value)}
                disabled={saving}
              />
              {errors.quantity && (
                <span style={styles.fieldError}>{errors.quantity}</span>
              )}
            </div>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Par Level</label>
              <input
                style={{
                  ...styles.input,
                  ...(errors.parLevel ? styles.inputError : {}),
                }}
                type="number"
                min="0"
                value={form.parLevel}
                onChange={e => handleChange('parLevel', e.target.value)}
                disabled={saving}
              />
              {errors.parLevel && (
                <span style={styles.fieldError}>{errors.parLevel}</span>
              )}
            </div>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Unit Value ($)</label>
              <input
                style={{
                  ...styles.input,
                  ...(errors.value ? styles.inputError : {}),
                }}
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={e => handleChange('value', e.target.value)}
                disabled={saving}
              />
              {errors.value && (
                <span style={styles.fieldError}>{errors.value}</span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.saveBtn,
              ...(saving ? styles.saveBtnDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Part'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 12px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 8px',
    borderRadius: '4px',
    lineHeight: 1,
  },
  errorBanner: {
    margin: '12px 24px 0',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
  form: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  fieldHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldThird: {
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
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: '#ef4444',
    marginTop: '2px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '12px 24px 20px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
