'use client';

import React from 'react';
import { JobModelConfig, WorkflowStatusOption } from '@/types/jobModels';
import { RepairOrderCosts } from '@/types/repairExecution';

export interface JobSummaryModuleProps {
  config: JobModelConfig;
  status: string;
  onStatusChange: (status: string) => void;
  costs: RepairOrderCosts;
  onAdditionalFeesChange: (fees: number) => void;
  onEquipmentFeesChange: (fees: number) => void;
  internalNotes?: string;
  onInternalNotesChange: (notes: string) => void;
  clientSummary?: string;
  onClientSummaryChange: (summary: string) => void;
}

export default function JobSummaryModule({
  config,
  status,
  onStatusChange,
  costs,
  onAdditionalFeesChange,
  onEquipmentFeesChange,
  internalNotes,
  onInternalNotesChange,
  clientSummary,
  onClientSummaryChange,
}: JobSummaryModuleProps) {
  const workflowStatuses: WorkflowStatusOption[] = config.statusWorkflow || [
    { id: 'intake', label: 'Intake', color: '#64748b' },
    { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { id: 'completed', label: 'Completed', color: '#10b981', isFinal: true },
  ];

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>💰</div>
        <div>
          <h3 style={styles.headerTitle}>Financial Summary & Execution Status</h3>
          <p style={styles.headerSubtitle}>
            Cost rollup, billable totals, and job workflow status transition
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Status Workflow Selector */}
        <div style={styles.col}>
          <label style={styles.label}>Execution Workflow Stage</label>
          <div style={styles.statusButtonsContainer}>
            {workflowStatuses.map(st => {
              const isSelected = status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onStatusChange(st.id)}
                  style={{
                    ...styles.statusBtn,
                    backgroundColor: isSelected ? st.color : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#334155',
                    borderColor: isSelected ? st.color : '#e2e8f0',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {isSelected && '✓ '}
                  {st.label}
                  {st.isFinal && ' 🏁'}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={styles.label}>Customer-Facing Service Summary</label>
            <textarea
              rows={3}
              value={clientSummary || ''}
              onChange={e => onClientSummaryChange(e.target.value)}
              placeholder="Summary of work completed for client invoice/ticket..."
              style={styles.textarea}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={styles.label}>Internal Shop / Tech Notes</label>
            <textarea
              rows={2}
              value={internalNotes || ''}
              onChange={e => onInternalNotesChange(e.target.value)}
              placeholder="Internal diagnostics, parts supplier notes, RMA RMA logs..."
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Financial Rollup Column */}
        <div style={styles.col}>
          <div style={styles.costBox}>
            <h4 style={styles.costBoxTitle}>Cost & Billing Calculation</h4>

            <div style={styles.costRow}>
              <span style={styles.costLabel}>Parts & Materials:</span>
              <span style={styles.costValue}>${(costs.partsTotal || 0).toFixed(2)}</span>
            </div>

            <div style={styles.costRow}>
              <span style={styles.costLabel}>Labor & Manpower:</span>
              <span style={styles.costValue}>${(costs.laborTotal || 0).toFixed(2)}</span>
            </div>

            <div style={styles.costRow}>
              <span style={styles.costLabel}>Equipment & Machinery Fee:</span>
              <div style={styles.feeInputWrapper}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={costs.equipmentTotal || 0}
                  onChange={e =>
                    onEquipmentFeesChange(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  style={styles.feeInput}
                />
              </div>
            </div>

            <div style={styles.costRow}>
              <span style={styles.costLabel}>Shop Supplies / Disposal / Freight:</span>
              <div style={styles.feeInputWrapper}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={costs.additionalFees || 0}
                  onChange={e =>
                    onAdditionalFeesChange(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  style={styles.feeInput}
                />
              </div>
            </div>

            <div style={styles.grandTotalDivider} />

            <div style={styles.grandTotalRow}>
              <span style={styles.grandTotalLabel}>Total Job Execution:</span>
              <span style={styles.grandTotalValue}>${(costs.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
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
    backgroundColor: '#fef08a',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '8px',
  },
  statusButtonsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  statusBtn: {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  costBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px 20px',
  },
  costBoxTitle: {
    margin: '0 0 16px 0',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  costRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '0.875rem',
  },
  costLabel: {
    color: '#64748b',
  },
  costValue: {
    fontWeight: 600,
    color: '#1e293b',
  },
  feeInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  feeInput: {
    width: '75px',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    textAlign: 'right',
    fontSize: '0.875rem',
  },
  grandTotalDivider: {
    borderTop: '2px dashed #cbd5e1',
    margin: '14px 0',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#2563eb',
  },
};
