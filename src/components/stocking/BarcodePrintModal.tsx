'use client';

import React, { useState, useRef } from 'react';
import LabelPreview, { LabelData, LabelSize, BarcodeMode } from './LabelPreview';

interface BarcodePrintModalProps {
  data: LabelData;
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodePrintModal({
  data,
  isOpen,
  onClose,
}: BarcodePrintModalProps) {
  const [size, setSize] = useState<LabelSize>('standard');
  const [mode, setMode] = useState<BarcodeMode>('both');
  const printableRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.modalTitle}>🖨️ Print Barcode / QR Label</h2>
            <p style={styles.modalSubtitle}>
              Generate physical labels for warehouse shelves, bins, parts, or totes
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Configuration Controls */}
        <div style={styles.controlGrid}>
          {/* Label Size Selector */}
          <div>
            <label style={styles.controlLabel}>Label Dimensions</label>
            <div style={styles.pillGroup}>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(size === 'compact' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setSize('compact')}
              >
                2" × 1" (Compact)
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(size === 'standard' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setSize('standard')}
              >
                3" × 2" (Standard)
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(size === 'large' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setSize('large')}
              >
                4" × 3" (Large Rack)
              </button>
            </div>
          </div>

          {/* Barcode Mode Selector */}
          <div>
            <label style={styles.controlLabel}>Symbology Format</label>
            <div style={styles.pillGroup}>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(mode === 'both' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setMode('both')}
              >
                QR + Barcode
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(mode === 'barcode' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setMode('barcode')}
              >
                1D Barcode (Code128)
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(mode === 'qr' ? styles.pillBtnActive : {}),
                }}
                onClick={() => setMode('qr')}
              >
                2D QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Area */}
        <div style={styles.previewContainer}>
          <div style={styles.previewCaption}>
            Previewing: <strong>{data.title}</strong>
          </div>
          <div style={styles.previewWrapper}>
            <LabelPreview
              data={data}
              size={size}
              mode={mode}
              printableRef={printableRef}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={styles.primaryPrintBtn} onClick={handlePrint}>
            🖨️ Send to Printer
          </button>
        </div>
      </div>

      {/* Global Print Styles Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .warehouse-printable-label,
          .warehouse-printable-label * {
            visibility: visible !important;
          }
          .warehouse-printable-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    overflowY: 'auto',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '12px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  modalSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  controlGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  controlLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  pillGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  pillBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  previewContainer: {
    backgroundColor: '#f1f5f9',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  previewCaption: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  previewWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    overflowX: 'auto',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  secondaryBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryPrintBtn: {
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
};
