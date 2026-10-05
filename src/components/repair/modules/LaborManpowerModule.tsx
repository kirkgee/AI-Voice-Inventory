'use client';

import React from 'react';
import { JobModelConfig, LaborRoleDefinition } from '@/types/jobModels';
import { LaborEntry } from '@/types/repairExecution';

export interface LaborManpowerModuleProps {
  config: JobModelConfig;
  laborEntries: LaborEntry[];
  onLaborChange: (entries: LaborEntry[]) => void;
}

function emptyLabor(defaultRole?: LaborRoleDefinition): LaborEntry {
  const roleName = defaultRole?.roleName || 'General Technician';
  const rate = defaultRole?.defaultHourlyRate || 65;
  return {
    id: `labor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    technicianName: '',
    role: roleName,
    hours: 1,
    hourlyRate: rate,
    totalCost: rate,
    date: new Date().toISOString().slice(0, 10),
  };
}

export default function LaborManpowerModule({
  config,
  laborEntries,
  onLaborChange,
}: LaborManpowerModuleProps) {
  const laborConfig = config.modules.laborTracking;
  if (!laborConfig?.enabled) return null;

  const roles = laborConfig.roles || [];

  function handleLineChange<K extends keyof LaborEntry>(
    index: number,
    field: K,
    val: LaborEntry[K]
  ) {
    const next = [...laborEntries];
    const item = { ...next[index], [field]: val };

    if (field === 'role') {
      const matchedRole = roles.find(r => r.roleName === val);
      if (matchedRole) {
        item.hourlyRate = matchedRole.defaultHourlyRate;
      }
    }

    if (field === 'hours' || field === 'hourlyRate' || field === 'role') {
      const h = field === 'hours' ? Number(val) : item.hours;
      const r = field === 'hourlyRate' ? Number(val) : item.hourlyRate;
      item.totalCost = Math.round(h * r * 100) / 100;
    }

    next[index] = item;
    onLaborChange(next);
  }

  function addLine() {
    onLaborChange([...laborEntries, emptyLabor(roles[0])]);
  }

  function removeLine(index: number) {
    if (laborEntries.length <= 1) {
      onLaborChange([emptyLabor(roles[0])]);
      return;
    }
    onLaborChange(laborEntries.filter((_, i) => i !== index));
  }

  const laborTotal = laborEntries.reduce((sum, it) => sum + (it.totalCost || 0), 0);
  const totalHours = laborEntries.reduce((sum, it) => sum + (it.hours || 0), 0);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>👷‍♂️</div>
        <div style={{ flex: 1 }}>
          <h3 style={styles.headerTitle}>Labor, Manpower & Crew Allocation</h3>
          <p style={styles.headerSubtitle}>
            Log technician hours, crew trade roles, and calculate labor rates
          </p>
        </div>
        <div style={styles.summaryBadge}>
          <span>{totalHours.toFixed(1)} hrs total</span>
        </div>
      </div>

      {laborEntries.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ margin: '0 0 12px 0', color: '#64748b' }}>No labor or manpower logged yet.</p>
          <button type="button" onClick={addLine} style={styles.primaryButton}>
            ＋ Log Labor Hours
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '28%' }}>Technician / Worker Name</th>
                <th style={{ ...styles.th, width: '26%' }}>Role / Trade</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>Hours</th>
                <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Rate ($/hr)</th>
                <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Total ($)</th>
                <th style={{ ...styles.th, width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {laborEntries.map((item, idx) => (
                <tr key={item.id || idx} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="text"
                      value={item.technicianName}
                      onChange={e => handleLineChange(idx, 'technicianName', e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      style={styles.textInput}
                    />
                  </td>
                  <td style={styles.td}>
                    <select
                      value={item.role}
                      onChange={e => handleLineChange(idx, 'role', e.target.value)}
                      style={styles.select}
                    >
                      {roles.map(r => (
                        <option key={r.id || r.roleName} value={r.roleName}>
                          {r.roleName} (${r.defaultHourlyRate}/hr)
                        </option>
                      ))}
                      <option value="Custom / Other">Custom / Other</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={item.hours}
                      onChange={e =>
                        handleLineChange(idx, 'hours', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      style={styles.numInput}
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.hourlyRate}
                      onChange={e =>
                        handleLineChange(idx, 'hourlyRate', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      style={styles.rateInput}
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    ${(item.totalCost || 0).toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      style={styles.deleteButton}
                      title="Remove entry"
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

      {/* Footer */}
      <div style={styles.footerRow}>
        <button type="button" onClick={addLine} style={styles.outlineButton}>
          ＋ Add Crew Member / Labor
        </button>
        <div style={styles.totalBadge}>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Labor Subtotal:</span>
          <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>${laborTotal.toFixed(2)}</strong>
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
    flexWrap: 'wrap',
  },
  headerIcon: {
    fontSize: '1.5rem',
    backgroundColor: '#f3e8ff',
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
  summaryBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
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
  numInput: {
    width: '65px',
    padding: '7px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  rateInput: {
    width: '80px',
    padding: '7px 8px',
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
