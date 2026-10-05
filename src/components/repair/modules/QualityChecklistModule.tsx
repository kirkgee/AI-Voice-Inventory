'use client';

import React, { useEffect } from 'react';
import { JobModelConfig, ChecklistStepDefinition } from '@/types/jobModels';
import { ChecklistItemState, ChecklistStepStatus } from '@/types/repairExecution';

export interface QualityChecklistModuleProps {
  config: JobModelConfig;
  checklistResults: ChecklistItemState[];
  onChecklistChange: (results: ChecklistItemState[]) => void;
}

export default function QualityChecklistModule({
  config,
  checklistResults,
  onChecklistChange,
}: QualityChecklistModuleProps) {
  const qcConfig = config.modules.qualityChecklist;
  if (!qcConfig?.enabled) return null;

  const steps = qcConfig.steps || [];

  // Auto-initialize checklist from config steps if not yet populated
  useEffect(() => {
    if (checklistResults.length === 0 && steps.length > 0) {
      const initial: ChecklistItemState[] = steps.map((s: ChecklistStepDefinition) => ({
        stepId: s.id,
        title: s.title,
        status: 'pending',
        notes: '',
      }));
      onChecklistChange(initial);
    }
  }, [config.id]);

  function setStatus(stepId: string, status: ChecklistStepStatus) {
    const next = checklistResults.map(item => {
      if (item.stepId === stepId) {
        return { ...item, status };
      }
      return item;
    });
    onChecklistChange(next);
  }

  function setNotes(stepId: string, notes: string) {
    const next = checklistResults.map(item => {
      if (item.stepId === stepId) {
        return { ...item, notes };
      }
      return item;
    });
    onChecklistChange(next);
  }

  const completedCount = checklistResults.filter(
    r => r.status === 'passed' || r.status === 'na'
  ).length;
  const totalCount = checklistResults.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>🛡️</div>
        <div style={{ flex: 1 }}>
          <h3 style={styles.headerTitle}>Quality Assurance & Safety Inspection Checklist</h3>
          <p style={styles.headerSubtitle}>
            Mandatory procedural gates, burn-in diagnostics, and safety protocol sign-off
          </p>
        </div>
        <div style={styles.progressContainer}>
          <div style={styles.progressText}>
            {completedCount}/{totalCount} Completed ({progressPct}%)
          </div>
          <div style={styles.progressBarTrack}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? '#10b981' : '#3b82f6',
              }}
            />
          </div>
        </div>
      </div>

      <div style={styles.stepsList}>
        {steps.map((step, idx) => {
          const state = checklistResults.find(r => r.stepId === step.id) || {
            stepId: step.id,
            title: step.title,
            status: 'pending',
            notes: '',
          };

          return (
            <div key={step.id || idx} style={styles.stepItem}>
              <div style={styles.stepHeaderRow}>
                <div style={styles.stepTitleWrapper}>
                  <span style={styles.stepNumber}>{idx + 1}</span>
                  <div>
                    <span style={styles.stepTitle}>{step.title}</span>
                    {step.required && <span style={styles.requiredBadge}>Required</span>}
                    {step.description && (
                      <p style={styles.stepDesc}>{step.description}</p>
                    )}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    onClick={() => setStatus(step.id, 'passed')}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: state.status === 'passed' ? '#dcfce7' : '#ffffff',
                      color: state.status === 'passed' ? '#15803d' : '#64748b',
                      borderColor: state.status === 'passed' ? '#86efac' : '#e2e8f0',
                      fontWeight: state.status === 'passed' ? 600 : 400,
                    }}
                  >
                    ✓ Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(step.id, 'failed')}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: state.status === 'failed' ? '#fee2e2' : '#ffffff',
                      color: state.status === 'failed' ? '#b91c1c' : '#64748b',
                      borderColor: state.status === 'failed' ? '#fca5a5' : '#e2e8f0',
                      fontWeight: state.status === 'failed' ? 600 : 400,
                    }}
                  >
                    ✗ Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(step.id, 'na')}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: state.status === 'na' ? '#f1f5f9' : '#ffffff',
                      color: state.status === 'na' ? '#475569' : '#94a3b8',
                      borderColor: state.status === 'na' ? '#cbd5e1' : '#e2e8f0',
                    }}
                  >
                    N/A
                  </button>
                </div>
              </div>

              {/* Inspector note input */}
              <div style={styles.notesRow}>
                <input
                  type="text"
                  value={state.notes || ''}
                  onChange={e => setNotes(step.id, e.target.value)}
                  placeholder="Verification notes / measured values (optional)..."
                  style={styles.noteInput}
                />
              </div>
            </div>
          );
        })}
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
    backgroundColor: '#ecfdf5',
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
  progressContainer: {
    marginLeft: 'auto',
    textAlign: 'right',
    minWidth: '160px',
  },
  progressText: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '4px',
  },
  progressBarTrack: {
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stepItem: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
    backgroundColor: '#f8fafc',
  },
  stepHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  },
  stepTitleWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    flex: 1,
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '2px',
  },
  stepTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  stepDesc: {
    margin: '4px 0 0 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  requiredBadge: {
    marginLeft: '8px',
    fontSize: '0.7rem',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontWeight: 600,
  },
  buttonGroup: {
    display: 'flex',
    gap: '6px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  notesRow: {
    marginTop: '8px',
    paddingLeft: '34px',
  },
  noteInput: {
    width: '100%',
    padding: '6px 10px',
    fontSize: '0.8125rem',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
};
