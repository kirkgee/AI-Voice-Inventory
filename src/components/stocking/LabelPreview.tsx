'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export type LabelType = 'part' | 'bin' | 'location';
export type LabelSize = 'compact' | 'standard' | 'large';
export type BarcodeMode = 'both' | 'barcode' | 'qr';

export interface LabelData {
  type: LabelType;
  title: string;          // e.g. "SKU: RES-10K-0805" or "BIN: A-102" or "LOC: Main Warehouse"
  subtitle?: string;       // e.g. Description "10k Ohm Chip Resistor 0805" or "Row 2, Shelf 4"
  barcodeValue: string;    // Raw string for 1D barcode (e.g. "RES-10K" or "BIN-A-102")
  qrValue: string;         // Raw string for QR (e.g. "PART:RES-10K" or "BIN:loc-1:A-102")
  locationName?: string;
  binName?: string;
  quantity?: number;
  parLevel?: number;
  tenantId?: string;
}

interface LabelPreviewProps {
  data: LabelData;
  size?: LabelSize;
  mode?: BarcodeMode;
  printableRef?: React.RefObject<HTMLDivElement | null>;
}

export default function LabelPreview({
  data,
  size = 'standard',
  mode = 'both',
  printableRef,
}: LabelPreviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Generate 1D barcode with JsBarcode
  useEffect(() => {
    if (mode === 'qr' || !svgRef.current || !data.barcodeValue) return;

    try {
      setBarcodeError(null);
      JsBarcode(svgRef.current, data.barcodeValue, {
        format: 'CODE128',
        lineColor: '#000000',
        width: size === 'compact' ? 1.5 : 2,
        height: size === 'compact' ? 32 : size === 'large' ? 55 : 42,
        displayValue: true,
        fontSize: size === 'compact' ? 11 : 13,
        textMargin: 2,
        margin: 2,
      });
    } catch (err: any) {
      console.warn('JsBarcode render error:', err);
      setBarcodeError('Invalid barcode format');
    }
  }, [data.barcodeValue, size, mode]);

  // Generate 2D QR Code with qrcode
  useEffect(() => {
    if (mode === 'barcode' || !data.qrValue) return;

    const qrSize = size === 'compact' ? 90 : size === 'large' ? 150 : 120;
    QRCode.toDataURL(data.qrValue, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [data.qrValue, size, mode]);

  const sizeStyles = {
    compact: { width: '280px', minHeight: '140px', padding: '10px' },
    standard: { width: '360px', minHeight: '220px', padding: '16px' },
    large: { width: '440px', minHeight: '280px', padding: '20px' },
  }[size];

  return (
    <div
      ref={printableRef}
      className="warehouse-printable-label"
      style={{
        ...styles.container,
        ...sizeStyles,
      }}
    >
      {/* Top Header Badge & Tag */}
      <div style={styles.headerRow}>
        <span style={styles.typeBadge}>
          {data.type === 'part' ? 'PART / MATERIAL' : data.type === 'bin' ? 'WAREHOUSE BIN' : 'STORAGE LOCATION'}
        </span>
        {data.tenantId && <span style={styles.tenantTag}>{data.tenantId}</span>}
      </div>

      {/* Main Title & Subtitle */}
      <div style={styles.titleSection}>
        <div style={styles.title}>{data.title}</div>
        {data.subtitle && <div style={styles.subtitle}>{data.subtitle}</div>}
      </div>

      {/* Location / Bin Context Info if applicable */}
      {(data.locationName || data.binName || data.parLevel !== undefined) && (
        <div style={styles.metadataRow}>
          {data.locationName && (
            <span style={styles.metaItem}>
              <strong>Loc:</strong> {data.locationName}
            </span>
          )}
          {data.binName && (
            <span style={styles.metaItem}>
              <strong>Bin:</strong> {data.binName}
            </span>
          )}
          {data.parLevel !== undefined && (
            <span style={styles.metaItem}>
              <strong>Par:</strong> {data.parLevel}
            </span>
          )}
          {data.quantity !== undefined && (
            <span style={styles.metaItem}>
              <strong>Qty:</strong> {data.quantity}
            </span>
          )}
        </div>
      )}

      {/* Codes Area: Barcode (1D) and/or QR (2D) */}
      <div style={styles.codesArea}>
        {/* 1D Barcode */}
        {(mode === 'both' || mode === 'barcode') && (
          <div style={styles.barcodeWrap}>
            {barcodeError ? (
              <div style={styles.barcodeFallback}>{data.barcodeValue}</div>
            ) : (
              <svg ref={svgRef} style={{ maxWidth: '100%' }} />
            )}
          </div>
        )}

        {/* 2D QR Code */}
        {(mode === 'both' || mode === 'qr') && qrDataUrl && (
          <div style={styles.qrWrap}>
            <img
              src={qrDataUrl}
              alt={`QR for ${data.title}`}
              style={{
                width: size === 'compact' ? 70 : size === 'large' ? 120 : 96,
                height: size === 'compact' ? 70 : size === 'large' ? 120 : 96,
                display: 'block',
              }}
            />
            <span style={styles.qrCaption}>Scan with App</span>
          </div>
        )}
      </div>

      {/* Footer Timestamp */}
      <div style={styles.footerRow}>
        <span>AI-Voice-Inventory Suite</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '2px solid #000000',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
    margin: '0 auto',
    pageBreakInside: 'avoid',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px dashed #666666',
    paddingBottom: '4px',
    marginBottom: '6px',
  },
  typeBadge: {
    fontSize: '0.6875rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#000000',
    backgroundColor: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  tenantTag: {
    fontSize: '0.625rem',
    color: '#666666',
    fontWeight: 500,
  },
  titleSection: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 800,
    lineHeight: 1.2,
    wordBreak: 'break-word',
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: '#333333',
    marginTop: '2px',
    lineHeight: 1.3,
  },
  metadataRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '0.75rem',
    backgroundColor: '#f8fafc',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
  },
  metaItem: {
    color: '#1e293b',
  },
  codesArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: '12px',
    marginTop: 'auto',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  barcodeWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '1 1 auto',
    minWidth: '140px',
  },
  barcodeFallback: {
    padding: '8px',
    border: '1px dashed #999',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  qrWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCaption: {
    fontSize: '0.5625rem',
    color: '#666666',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.5625rem',
    color: '#888888',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '4px',
  },
};
