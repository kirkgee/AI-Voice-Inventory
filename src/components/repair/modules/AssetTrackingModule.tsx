'use client';

import React from 'react';
import { JobModelConfig } from '@/types/jobModels';
import { AssetDetails } from '@/types/repairExecution';

export interface AssetTrackingModuleProps {
  config: JobModelConfig;
  asset: AssetDetails;
  onAssetChange: (updated: AssetDetails) => void;
}

export default function AssetTrackingModule({
  config,
  asset,
  onAssetChange,
}: AssetTrackingModuleProps) {
  const assetConfig = config.modules.assetTracking;
  if (!assetConfig?.enabled) return null;

  function updateField<K extends keyof AssetDetails>(field: K, val: AssetDetails[K]) {
    onAssetChange({
      ...asset,
      [field]: val,
    });
  }

  const ownershipOptions = assetConfig.ownershipTypes || ['client', 'internal_fleet', 'rental', 'site'];

  const ownershipLabels: Record<string, string> = {
    client: 'Client-Owned Equipment',
    internal_fleet: 'Internal / Leased Fleet Asset',
    rental: 'Third-Party Rental Asset',
    site: 'Jobsite / Fixed Property Structure',
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>🏷️</div>
        <div>
          <h3 style={styles.headerTitle}>Equipment & Asset Identification</h3>
          <p style={styles.headerSubtitle}>
            Track serial numbers, ownership custody, and asset location for this service order
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Identifier */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>
            Asset Identifier (Serial # / VIN / Unit # / Site)
            {assetConfig.requireSerial && <span style={styles.req}> *</span>}
          </label>
          <input
            type="text"
            value={asset.identifier || ''}
            onChange={e => updateField('identifier', e.target.value)}
            placeholder="e.g. SN-883910A or VIN# 1HD1..."
            style={styles.input}
          />
        </div>

        {/* Ownership */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Ownership Custody</label>
          <select
            value={asset.ownership || ownershipOptions[0] || 'client'}
            onChange={e => updateField('ownership', e.target.value as any)}
            style={styles.select}
          >
            {ownershipOptions.map(opt => (
              <option key={opt} value={opt}>
                {ownershipLabels[opt] || opt}
              </option>
            ))}
          </select>
        </div>

        {/* Make */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Make / Manufacturer</label>
          <input
            type="text"
            value={asset.make || ''}
            onChange={e => updateField('make', e.target.value)}
            placeholder="e.g. Caterpillar / Cisco / GAF Timberline"
            style={styles.input}
          />
        </div>

        {/* Model */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>
            Model / Specification
            {assetConfig.requireModel && <span style={styles.req}> *</span>}
          </label>
          <input
            type="text"
            value={asset.model || ''}
            onChange={e => updateField('model', e.target.value)}
            placeholder="e.g. 320D Excavator / Catalyst 9300 / HD Shingle"
            style={styles.input}
          />
        </div>

        {/* Location */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Physical Location / Bay / Bench</label>
          <input
            type="text"
            value={asset.location || ''}
            onChange={e => updateField('location', e.target.value)}
            placeholder="e.g. Bench 3 / Bay 2 / North Yard"
            style={styles.input}
          />
        </div>

        {/* Intake Notes */}
        <div style={{ ...styles.fieldCol, gridColumn: 'span 2' }}>
          <label style={styles.label}>Asset Condition / Intake Notes</label>
          <input
            type="text"
            value={asset.notes || ''}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="e.g. Physical casing scuffed; power supply cord intact; clean deck"
            style={styles.input}
          />
        </div>
      </div>
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
  },
  headerIcon: {
    fontSize: '1.5rem',
    backgroundColor: '#fef3c7',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '6px',
  },
  req: {
    color: '#ef4444',
  },
  input: {
    padding: '9px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  select: {
    padding: '9px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    width: '100%',
  },
};
