'use client';

import React from 'react';
import { JobModelConfig, CustomFieldDefinition } from '@/types/jobModels';
import { PriorityLevel } from '@/types/repairExecution';
import { Partner } from '@/lib/dal/partners';

export interface JobInfoModuleProps {
  config: JobModelConfig;
  orderNumber: string;
  title: string;
  onTitleChange: (val: string) => void;
  priority: PriorityLevel;
  onPriorityChange: (val: PriorityLevel) => void;
  crmPartnerId?: string;
  crmPartnerName?: string;
  onPartnerChange: (partnerId: string, partnerName: string) => void;
  assignedTechnicianName?: string;
  onTechnicianChange: (val: string) => void;
  customFieldValues: Record<string, any>;
  onCustomFieldChange: (fieldId: string, val: any) => void;
  partnersList: Partner[];
  startDate?: string;
  onStartDateChange?: (val: string) => void;
}

export default function JobInfoModule({
  config,
  orderNumber,
  title,
  onTitleChange,
  priority,
  onPriorityChange,
  crmPartnerId,
  crmPartnerName,
  onPartnerChange,
  assignedTechnicianName,
  onTechnicianChange,
  customFieldValues,
  onCustomFieldChange,
  partnersList,
  startDate,
  onStartDateChange,
}: JobInfoModuleProps) {
  function handleSelectPartner(e: React.ChangeEvent<HTMLSelectElement>) {
    const pId = e.target.value;
    if (!pId) {
      onPartnerChange('', '');
      return;
    }
    const partner = partnersList.find(p => p.id === pId);
    onPartnerChange(pId, partner?.name || 'Unknown Client');
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.headerIcon}>📋</div>
        <div>
          <h3 style={styles.headerTitle}>Job Specification & CRM Client Details</h3>
          <p style={styles.headerSubtitle}>
            Configured for <strong>{config.name}</strong> ({config.targetAudience})
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Work Order # */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Work Order Reference</label>
          <input
            type="text"
            value={orderNumber}
            disabled
            style={{ ...styles.input, backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600 }}
          />
        </div>

        {/* Priority */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Job Priority</label>
          <select
            value={priority}
            onChange={e => onPriorityChange(e.target.value as PriorityLevel)}
            style={styles.select}
          >
            <option value="low">🟢 Low (Routine / Scheduled)</option>
            <option value="medium">🔵 Medium (Standard Turnaround)</option>
            <option value="high">🟠 High (Expedited)</option>
            <option value="urgent">🔴 Urgent (Immediate Emergency / SLA)</option>
          </select>
        </div>

        {/* CRM Partner / Client */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>
            CRM Client / Account <span style={styles.req}>*</span>
          </label>
          <select
            value={crmPartnerId || ''}
            onChange={handleSelectPartner}
            style={styles.select}
          >
            <option value="">-- Select Client from CRM --</option>
            {partnersList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name || 'Unnamed Partner'} {p.type ? `(${p.type})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Tech / Lead */}
        <div style={styles.fieldCol}>
          <label style={styles.label}>Assigned Lead / Technician</label>
          <input
            type="text"
            value={assignedTechnicianName || ''}
            onChange={e => onTechnicianChange(e.target.value)}
            placeholder="e.g. Alex Rivera, Senior Tech"
            style={styles.input}
          />
        </div>

        {/* Job Title / Problem Summary */}
        <div style={{ ...styles.fieldCol, gridColumn: 'span 2' }}>
          <label style={styles.label}>
            Job Title / Scope Summary <span style={styles.req}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="e.g. Main Board Diagnostic & Recell / South Wing Shingle Replacement"
            style={styles.input}
          />
        </div>

        {/* Start Date */}
        {onStartDateChange && (
          <div style={styles.fieldCol}>
            <label style={styles.label}>Execution Start Date</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={e => onStartDateChange(e.target.value)}
              style={styles.input}
            />
          </div>
        )}
      </div>

      {/* Dynamic Model Custom Fields */}
      {config.customFields && config.customFields.length > 0 && (
        <div style={styles.customSection}>
          <div style={styles.customSectionTitle}>
            Model-Specific Specifications ({config.customFields.length})
          </div>
          <div style={styles.grid}>
            {config.customFields.map((field: CustomFieldDefinition) => {
              const currentVal = customFieldValues[field.name] ?? field.defaultValue ?? '';

              return (
                <div
                  key={field.id || field.name}
                  style={{
                    ...styles.fieldCol,
                    gridColumn: field.type === 'textarea' ? 'span 2' : 'span 1',
                  }}
                >
                  <label style={styles.label}>
                    {field.label} {field.required && <span style={styles.req}>*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={currentVal}
                      onChange={e => onCustomFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      rows={3}
                      style={styles.textarea}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={currentVal}
                      onChange={e => onCustomFieldChange(field.name, e.target.value)}
                      style={styles.select}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={Boolean(currentVal)}
                        onChange={e => onCustomFieldChange(field.name, e.target.checked)}
                        style={{ marginRight: '8px', width: '16px', height: '16px' }}
                      />
                      <span>Confirmed / Cleared</span>
                    </label>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={currentVal}
                      onChange={e =>
                        onCustomFieldChange(
                          field.name,
                          field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                        )
                      }
                      placeholder={field.placeholder || ''}
                      style={styles.input}
                    />
                  )}

                  {field.helpText && <span style={styles.helpText}>{field.helpText}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
    backgroundColor: '#eff6ff',
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
  textarea: {
    padding: '9px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    fontFamily: 'inherit',
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#1e293b',
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '4px',
  },
  customSection: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px dashed #e2e8f0',
  },
  customSectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
};
