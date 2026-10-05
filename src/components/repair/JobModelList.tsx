'use client';

import React from 'react';
import { JobModelConfig } from '@/types/jobModels';
import { seedDefaultPresets, deleteConfig } from '@/lib/dal/jobConfigurations';

export interface JobModelListProps {
  tenantId: string;
  configurations: JobModelConfig[];
  onSelectConfig: (config: JobModelConfig) => void;
  onNewConfig: () => void;
  onLaunchExecutionWithConfig: (configId: string) => void;
  onReload: () => void;
}

export default function JobModelList({
  tenantId,
  configurations,
  onSelectConfig,
  onNewConfig,
  onLaunchExecutionWithConfig,
  onReload,
}: JobModelListProps) {
  async function handleSeedPresets() {
    if (confirm('Do you want to re-seed the standard industry job model presets for this tenant?')) {
      await seedDefaultPresets(tenantId);
      onReload();
    }
  }

  async function handleDelete(configId: string, name: string) {
    if (confirm(`Are you sure you want to delete configuration "${name}"?`)) {
      await deleteConfig(tenantId, configId);
      onReload();
    }
  }

  return (
    <div>
      {/* Top Banner & Actions */}
      <div style={styles.headerRow}>
        <div>
          <h3 style={styles.heading}>Service Administration: Job Model Configurations</h3>
          <p style={styles.subheading}>
            Manage workflow schemas, customize custom fields, labor rates, and quality inspection gates across diverse tenant operations.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button type="button" onClick={handleSeedPresets} style={styles.outlineBtn}>
            🔄 Restore Factory Presets
          </button>
          <button type="button" onClick={onNewConfig} style={styles.primaryBtn}>
            ＋ New Job Model Configuration
          </button>
        </div>
      </div>

      {/* Grid of Configurations */}
      <div style={styles.grid}>
        {configurations.map(config => {
          const mod = config.modules;
          return (
            <div key={config.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.badgeRow}>
                  <span style={styles.codeBadge}>{config.code}</span>
                  <span style={styles.envBadge}>
                    {config.environmentType.replace('_', ' ')}
                  </span>
                  {config.isDefault && <span style={styles.defaultBadge}>Default</span>}
                </div>
                <h4 style={styles.cardTitle}>{config.name}</h4>
                <p style={styles.targetAudience}>
                  Target: <strong>{config.targetAudience}</strong>
                </p>
              </div>

              <p style={styles.description}>{config.description}</p>

              {/* Modules Active */}
              <div style={styles.moduleSection}>
                <div style={styles.sectionLabel}>Active Sub-Modules:</div>
                <div style={styles.modulePills}>
                  {mod.assetTracking.enabled && (
                    <span style={styles.modulePill} title="Asset Tracking">🏷️ Asset ID</span>
                  )}
                  {mod.inventoryConsumption.enabled && (
                    <span style={styles.modulePill} title="Inventory Usage">📦 BOM / Parts</span>
                  )}
                  {mod.laborTracking.enabled && (
                    <span style={styles.modulePill} title="Labor & Manpower">👷‍♂️ Manpower ({mod.laborTracking.roles.length} roles)</span>
                  )}
                  {mod.equipmentTracking.enabled && (
                    <span style={styles.modulePill} title="Supporting Equipment">🧰 Tools & Machinery</span>
                  )}
                  {mod.qualityChecklist.enabled && (
                    <span style={styles.modulePill} title="Quality Checklist">🛡️ QA ({mod.qualityChecklist.steps.length} gates)</span>
                  )}
                </div>
              </div>

              {/* Custom fields & workflow count */}
              <div style={styles.metaRow}>
                <span>Custom Fields: <strong>{config.customFields?.length || 0}</strong></span>
                <span>Workflow Stages: <strong>{config.statusWorkflow?.length || 0}</strong></span>
              </div>

              {/* Card Footer Actions */}
              <div style={styles.cardFooter}>
                <button
                  type="button"
                  onClick={() => onLaunchExecutionWithConfig(config.id)}
                  style={styles.launchBtn}
                >
                  ⚡ Start Execution
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onSelectConfig(config)}
                    style={styles.editBtn}
                  >
                    Edit Schema
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(config.id, config.name)}
                    style={styles.delBtn}
                    title="Delete model"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  heading: {
    margin: '0 0 4px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  subheading: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
    maxWidth: '680px',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  outlineBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    marginBottom: '12px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  codeBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  envBadge: {
    fontSize: '0.7rem',
    textTransform: 'capitalize',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  defaultBadge: {
    fontSize: '0.7rem',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  targetAudience: {
    margin: 0,
    fontSize: '0.8125rem',
    color: '#475569',
  },
  description: {
    fontSize: '0.85rem',
    color: '#64748b',
    lineHeight: 1.4,
    margin: '0 0 16px 0',
    flex: 1,
  },
  moduleSection: {
    marginBottom: '14px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '6px',
    textTransform: 'uppercase',
  },
  modulePills: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  modulePill: {
    fontSize: '0.75rem',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '2px 6px',
    color: '#334155',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '16px',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginTop: 'auto',
  },
  launchBtn: {
    padding: '7px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  editBtn: {
    padding: '7px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  delBtn: {
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    backgroundColor: '#fee2e2',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};
