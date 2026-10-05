'use client';

import React, { useEffect } from 'react';
import { JobModelConfig, ToolRequirementDefinition } from '@/types/jobModels';
import { ToolEntry } from '@/types/repairExecution';

export interface ToolsEquipmentModuleProps {
  config: JobModelConfig;
  equipmentUsed: ToolEntry[];
  onEquipmentChange: (tools: ToolEntry[]) => void;
}

export default function ToolsEquipmentModule({
  config,
  equipmentUsed,
  onEquipmentChange,
}: ToolsEquipmentModuleProps) {
  const equipConfig = config.modules.equipmentTracking;
  if (!equipConfig?.enabled) return null;

  const defaultTools = equipConfig.defaultTools || [];

  // If no tools have been initialized yet, auto-populate from configuration defaults
  useEffect(() => {
    if (equipmentUsed.length === 0 && defaultTools.length > 0) {
      const initial: ToolEntry[] = defaultTools.map((t: ToolRequirementDefinition) => ({
        id: `tool-${Date.now()}-${t.id || Math.random().toString(36).slice(2, 6)}`,
        name: t.name,
        condition: 'good',
        returned: false,
        notes: t.required ? 'Required tool' : '',
      }));
      onEquipmentChange(initial);
    }
  }, [config.id]); // re-run if config changes

  function handleLineChange<K extends keyof ToolEntry>(
    index: number,
    field: K,
    val: ToolEntry[K]
  ) {
    const next = [...equipmentUsed];
    next[index] = { ...next[index], [field]: val };
    onEquipmentChange(next);
  }

  function addTool() {
    const newTool: ToolEntry = {
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      condition: 'good',
      returned: false,
    };
    onEquipmentChange([...equipmentUsed, newTool]);
  }

  function removeTool(index: number) {
    onEquipmentChange(equipmentUsed.filter((_, i) => i !== index));
  }

  const allReturned = equipmentUsed.length > 0 && equipmentUsed.every(t => t.returned);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>🧰</div>
        <div style={{ flex: 1 }}>
          <h3 style={styles.headerTitle}>Supporting Tools, Rigging & Machinery Check</h3>
          <p style={styles.headerSubtitle}>
            Track tool mobilization, custody condition, and return check-in for job execution
          </p>
        </div>
        <div>
          {allReturned ? (
            <span style={styles.returnedPill}>✓ All Equipment Returned</span>
          ) : (
            <span style={styles.deployedPill}>
              {equipmentUsed.filter(t => !t.returned).length} Tools Deployed
            </span>
          )}
        </div>
      </div>

      {equipmentUsed.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ margin: '0 0 12px 0', color: '#64748b' }}>No tools or equipment deployed.</p>
          <button type="button" onClick={addTool} style={styles.primaryButton}>
            ＋ Add Supporting Tool / Equipment
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '40%' }}>Tool / Equipment Name</th>
                <th style={{ ...styles.th, width: '22%' }}>Custody Condition</th>
                <th style={{ ...styles.th, width: '16%', textAlign: 'center' }}>Returned?</th>
                <th style={{ ...styles.th, width: '16%' }}>Notes / Tag</th>
                <th style={{ ...styles.th, width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {equipmentUsed.map((tool, idx) => (
                <tr key={tool.id || idx} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="text"
                      value={tool.name}
                      onChange={e => handleLineChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Twin-Tank Air Compressor #2"
                      style={styles.textInput}
                    />
                  </td>
                  <td style={styles.td}>
                    <select
                      value={tool.condition}
                      onChange={e => handleLineChange(idx, 'condition', e.target.value as any)}
                      style={styles.select}
                    >
                      <option value="good">🟢 Good / Operational</option>
                      <option value="fair">🟡 Fair / Minor Wear</option>
                      <option value="damaged">🔴 Damaged / Needs Service</option>
                      <option value="missing">⚠️ Missing / Not Accounted</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tool.returned}
                        onChange={e => handleLineChange(idx, 'returned', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ marginLeft: '6px', fontSize: '0.8125rem', color: tool.returned ? '#15803d' : '#64748b' }}>
                        {tool.returned ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </td>
                  <td style={styles.td}>
                    <input
                      type="text"
                      value={tool.notes || ''}
                      onChange={e => handleLineChange(idx, 'notes', e.target.value)}
                      placeholder="e.g. In Bay 3"
                      style={styles.textInput}
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeTool(idx)}
                      style={styles.deleteButton}
                      title="Remove tool"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.footerRow}>
        <button type="button" onClick={addTool} style={styles.outlineButton}>
          ＋ Add Tool / Asset
        </button>
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
    flexWrap: 'wrap',
  },
  headerIcon: {
    fontSize: '1.5rem',
    backgroundColor: '#ffedd5',
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
  returnedPill: {
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    border: '1px solid #bbf7d0',
  },
  deployedPill: {
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
  textInput: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
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
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
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
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
  },
};
