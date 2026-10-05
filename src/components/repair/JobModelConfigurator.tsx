'use client';

import React, { useState } from 'react';
import {
  JobModelConfig,
  JobEnvironmentType,
  CustomFieldDefinition,
  ChecklistStepDefinition,
  LaborRoleDefinition,
  ToolRequirementDefinition,
  WorkflowStatusOption,
} from '@/types/jobModels';
import { getDefaultJobModelPresets } from '@/lib/presets/defaultJobModels';
import { create as createConfig, update as updateConfig } from '@/lib/dal/jobConfigurations';

export interface JobModelConfiguratorProps {
  tenantId: string;
  existingConfig?: JobModelConfig | null;
  onSaved: (configId: string) => void;
  onCancel: () => void;
}

export default function JobModelConfigurator({
  tenantId,
  existingConfig,
  onSaved,
  onCancel,
}: JobModelConfiguratorProps) {
  const isEdit = Boolean(existingConfig);

  // Core metadata
  const [name, setName] = useState(existingConfig?.name || '');
  const [code, setCode] = useState(existingConfig?.code || '');
  const [description, setDescription] = useState(existingConfig?.description || '');
  const [targetAudience, setTargetAudience] = useState(existingConfig?.targetAudience || 'Customer Equipment');
  const [environmentType, setEnvironmentType] = useState<JobEnvironmentType>(
    existingConfig?.environmentType || 'general_repair'
  );
  const [isDefault, setIsDefault] = useState(existingConfig?.isDefault || false);

  // Modules config
  const [assetTracking, setAssetTracking] = useState<{
    enabled: boolean;
    requireSerial?: boolean;
    requireModel?: boolean;
    ownershipTypes: ('client' | 'internal_fleet' | 'rental' | 'site')[];
  }>(
    existingConfig?.modules.assetTracking || {
      enabled: true,
      requireSerial: true,
      requireModel: true,
      ownershipTypes: ['client', 'internal_fleet'],
    }
  );


  const [inventoryConsumption, setInventoryConsumption] = useState(
    existingConfig?.modules.inventoryConsumption || {
      enabled: true,
      autoDeductStock: true,
      allowCustomParts: true,
      trackBatchLot: true,
    }
  );

  const [laborTracking, setLaborTracking] = useState(
    existingConfig?.modules.laborTracking || {
      enabled: true,
      roles: [
        { id: 'lead-tech', roleName: 'Lead Technician', defaultHourlyRate: 75 },
        { id: 'assistant', roleName: 'Assistant / Apprentice', defaultHourlyRate: 45 },
      ],
    }
  );

  const [equipmentTracking, setEquipmentTracking] = useState(
    existingConfig?.modules.equipmentTracking || {
      enabled: true,
      defaultTools: [
        { id: 'tool-main', name: 'Standard Tool Kit & Diagnostics', required: true },
      ],
    }
  );

  const [qualityChecklist, setQualityChecklist] = useState(
    existingConfig?.modules.qualityChecklist || {
      enabled: true,
      steps: [
        { id: 'qc-visual', title: 'Initial Visual Inspection', required: true },
        { id: 'qc-final', title: 'Final Operational Testing', required: true },
      ],
    }
  );

  // Custom Fields
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(
    existingConfig?.customFields || []
  );

  // Status Workflow
  const [statusWorkflow, setStatusWorkflow] = useState<WorkflowStatusOption[]>(
    existingConfig?.statusWorkflow || [
      { id: 'intake', label: 'Intake / Received', color: '#64748b' },
      { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
      { id: 'qa_review', label: 'Quality Verification', color: '#06b6d4' },
      { id: 'completed', label: 'Completed', color: '#10b981', isFinal: true },
    ]
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load preset helper
  function applyPreset(presetCode: string) {
    const presets = getDefaultJobModelPresets(tenantId);
    const chosen = presets.find(p => p.code === presetCode);
    if (!chosen) return;

    setName(chosen.name);
    setCode(chosen.code);
    setDescription(chosen.description);
    setTargetAudience(chosen.targetAudience);
    setEnvironmentType(chosen.environmentType);
    setAssetTracking({ ...chosen.modules.assetTracking });
    setInventoryConsumption({ ...chosen.modules.inventoryConsumption });
    setLaborTracking({
      ...chosen.modules.laborTracking,
      roles: [...chosen.modules.laborTracking.roles],
    });
    setEquipmentTracking({
      ...chosen.modules.equipmentTracking,
      defaultTools: [...chosen.modules.equipmentTracking.defaultTools],
    });
    setQualityChecklist({
      ...chosen.modules.qualityChecklist,
      steps: [...chosen.modules.qualityChecklist.steps],
    });
    setCustomFields(chosen.customFields.map(cf => ({ ...cf })));
    setStatusWorkflow(chosen.statusWorkflow.map(sw => ({ ...sw })));
  }

  // --- Handlers for Custom Fields ---
  function addCustomField() {
    const newField: CustomFieldDefinition = {
      id: `field-${Date.now()}`,
      name: `customField_${customFields.length + 1}`,
      label: `Custom Field ${customFields.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
    };
    setCustomFields([...customFields, newField]);
  }

  function updateCustomField(index: number, field: Partial<CustomFieldDefinition>) {
    const next = [...customFields];
    next[index] = { ...next[index], ...field };
    setCustomFields(next);
  }

  function removeCustomField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  // --- Handlers for Labor Roles ---
  function addLaborRole() {
    const newRole: LaborRoleDefinition = {
      id: `role-${Date.now()}`,
      roleName: 'Specialist',
      defaultHourlyRate: 85,
    };
    setLaborTracking({
      ...laborTracking,
      roles: [...laborTracking.roles, newRole],
    });
  }

  function updateLaborRole(index: number, key: keyof LaborRoleDefinition, val: any) {
    const next = [...laborTracking.roles];
    next[index] = { ...next[index], [key]: val };
    setLaborTracking({ ...laborTracking, roles: next });
  }

  function removeLaborRole(index: number) {
    setLaborTracking({
      ...laborTracking,
      roles: laborTracking.roles.filter((_, i) => i !== index),
    });
  }

  // --- Handlers for Checklist Steps ---
  function addChecklistStep() {
    const newStep: ChecklistStepDefinition = {
      id: `step-${Date.now()}`,
      title: 'New Verification Gate',
      required: true,
    };
    setQualityChecklist({
      ...qualityChecklist,
      steps: [...qualityChecklist.steps, newStep],
    });
  }

  function updateChecklistStep(index: number, key: keyof ChecklistStepDefinition, val: any) {
    const next = [...qualityChecklist.steps];
    next[index] = { ...next[index], [key]: val };
    setQualityChecklist({ ...qualityChecklist, steps: next });
  }

  function removeChecklistStep(index: number) {
    setQualityChecklist({
      ...qualityChecklist,
      steps: qualityChecklist.steps.filter((_, i) => i !== index),
    });
  }

  // --- Handlers for Default Tools ---
  function addDefaultTool() {
    const newTool: ToolRequirementDefinition = {
      id: `tool-${Date.now()}`,
      name: 'Specialized Tool',
      required: true,
    };
    setEquipmentTracking({
      ...equipmentTracking,
      defaultTools: [...equipmentTracking.defaultTools, newTool],
    });
  }

  function updateDefaultTool(index: number, key: keyof ToolRequirementDefinition, val: any) {
    const next = [...equipmentTracking.defaultTools];
    next[index] = { ...next[index], [key]: val };
    setEquipmentTracking({ ...equipmentTracking, defaultTools: next });
  }

  function removeDefaultTool(index: number) {
    setEquipmentTracking({
      ...equipmentTracking,
      defaultTools: equipmentTracking.defaultTools.filter((_, i) => i !== index),
    });
  }

  // --- Save Config ---
  async function handleSave() {
    if (!name.trim()) {
      setErrorMsg('Please provide a Configuration Name.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Please provide a unique Model Code (e.g. DEPOT-CLIENT, ROOF-COMM).');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: Omit<JobModelConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      environmentType,
      targetAudience: targetAudience.trim(),
      isDefault,
      isActive: true,
      modules: {
        assetTracking,
        inventoryConsumption,
        laborTracking,
        equipmentTracking,
        qualityChecklist,
      },
      customFields,
      statusWorkflow,
    };

    try {
      let savedId = '';
      if (isEdit && existingConfig?.id) {
        await updateConfig(tenantId, existingConfig.id, payload);
        savedId = existingConfig.id;
      } else {
        savedId = await createConfig(tenantId, payload);
      }
      onSaved(savedId);
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      setErrorMsg(err?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <button type="button" onClick={onCancel} style={styles.backBtn}>
            ← Back to Configurations
          </button>
          <h2 style={styles.title}>
            {isEdit ? `Edit Job Model: ${name}` : 'Create Job Model Configuration'}
          </h2>
          <p style={styles.subtitle}>
            Design custom execution schemas, define required inventory workflows, and tailor fields for specific industries or departments
          </p>
        </div>

        {/* Preset Selector */}
        {!isEdit && (
          <div style={styles.presetBox}>
            <span style={styles.presetLabel}>Load Industry Preset:</span>
            <div style={styles.presetButtons}>
              <button
                type="button"
                onClick={() => applyPreset('DEPOT-CLIENT')}
                style={styles.presetBtn}
              >
                🔬 Depot Client RMA
              </button>
              <button
                type="button"
                onClick={() => applyPreset('DEPOT-FLEET')}
                style={styles.presetBtn}
              >
                📱 Leased Fleet Refurb
              </button>
              <button
                type="button"
                onClick={() => applyPreset('HEAVY-EQUIP')}
                style={styles.presetBtn}
              >
                🚜 Heavy Machinery
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ROOF-CONST')}
                style={styles.presetBtn}
              >
                🏠 Roofing / Construction
              </button>
            </div>
          </div>
        )}
      </div>

      {errorMsg && <div style={styles.errorAlert}>⚠️ {errorMsg}</div>}

      {/* SECTION 1: Identity & Scope */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>1. Model Identification & Industry Scope</h3>
        <div style={styles.grid}>
          <div style={styles.col}>
            <label style={styles.label}>
              Configuration Name <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Commercial Roofing Execution / Depot Client Repair"
              style={styles.input}
            />
          </div>

          <div style={styles.col}>
            <label style={styles.label}>
              Model Code / Key <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. ROOF-COMM or DEPOT-RMA"
              style={styles.input}
            />
          </div>

          <div style={styles.col}>
            <label style={styles.label}>Job Environment / Industry Archetype</label>
            <select
              value={environmentType}
              onChange={e => setEnvironmentType(e.target.value as JobEnvironmentType)}
              style={styles.select}
            >
              <option value="electronics_depot">Electronics Depot / RMA Bench</option>
              <option value="heavy_equipment">Heavy Machinery & Industrial Equipment</option>
              <option value="construction_roofing">Roofing, Framing & Construction Jobsite</option>
              <option value="fleet_maintenance">Fleet & Vehicle Maintenance</option>
              <option value="general_repair">General Service & Repair Shop</option>
              <option value="custom">Custom Enterprise Archetype</option>
            </select>
          </div>

          <div style={styles.col}>
            <label style={styles.label}>Target Equipment / Asset Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="e.g. Client-Owned Devices / Leased Fleet / Site Property"
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.col, gridColumn: 'span 2' }}>
            <label style={styles.label}>Model Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Operational description of when technicians or managers should use this configuration..."
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.col, gridColumn: 'span 2' }}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                style={{ width: '18px', height: '18px', marginRight: '8px' }}
              />
              <span>Set as Default Job Model for this Tenant</span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: Modular Sub-Systems Activation */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>2. Execution Sub-Modules</h3>
        <p style={styles.cardSubtitle}>
          Enable or disable modules to streamline what workers see for this specific job model
        </p>

        <div style={styles.modulesGrid}>
          {/* Asset Tracking Module Toggle */}
          <div style={styles.moduleBox}>
            <label style={styles.moduleToggleLabel}>
              <input
                type="checkbox"
                checked={assetTracking.enabled}
                onChange={e =>
                  setAssetTracking({ ...assetTracking, enabled: e.target.checked })
                }
                style={styles.checkbox}
              />
              <strong>🏷️ Equipment / Asset Tracking</strong>
            </label>
            <p style={styles.moduleDesc}>
              Track serial number, model, VIN, and ownership custody (client vs internal fleet).
            </p>
            {assetTracking.enabled && (
              <div style={styles.moduleOptions}>
                <label style={styles.inlineCheckbox}>
                  <input
                    type="checkbox"
                    checked={assetTracking.requireSerial}
                    onChange={e =>
                      setAssetTracking({ ...assetTracking, requireSerial: e.target.checked })
                    }
                  />
                  <span>Require Serial #</span>
                </label>
                <label style={styles.inlineCheckbox}>
                  <input
                    type="checkbox"
                    checked={assetTracking.requireModel}
                    onChange={e =>
                      setAssetTracking({ ...assetTracking, requireModel: e.target.checked })
                    }
                  />
                  <span>Require Model #</span>
                </label>
              </div>
            )}
          </div>

          {/* Inventory Consumption Module Toggle */}
          <div style={styles.moduleBox}>
            <label style={styles.moduleToggleLabel}>
              <input
                type="checkbox"
                checked={inventoryConsumption.enabled}
                onChange={e =>
                  setInventoryConsumption({
                    ...inventoryConsumption,
                    enabled: e.target.checked,
                  })
                }
                style={styles.checkbox}
              />
              <strong>📦 Inventory / BOM Usage</strong>
            </label>
            <p style={styles.moduleDesc}>
              Connect work order to stock parts, track consumption, and auto-deduct inventory.
            </p>
            {inventoryConsumption.enabled && (
              <div style={styles.moduleOptions}>
                <label style={styles.inlineCheckbox}>
                  <input
                    type="checkbox"
                    checked={inventoryConsumption.autoDeductStock}
                    onChange={e =>
                      setInventoryConsumption({
                        ...inventoryConsumption,
                        autoDeductStock: e.target.checked,
                      })
                    }
                  />
                  <span>Allow Direct Stock Deduction</span>
                </label>
              </div>
            )}
          </div>

          {/* Labor Tracking Module Toggle */}
          <div style={styles.moduleBox}>
            <label style={styles.moduleToggleLabel}>
              <input
                type="checkbox"
                checked={laborTracking.enabled}
                onChange={e =>
                  setLaborTracking({ ...laborTracking, enabled: e.target.checked })
                }
                style={styles.checkbox}
              />
              <strong>👷‍♂️ Labor & Manpower Tracking</strong>
            </label>
            <p style={styles.moduleDesc}>
              Log technician hours, crew headcounts, and trade billing rates.
            </p>
          </div>

          {/* Equipment Tracking Module Toggle */}
          <div style={styles.moduleBox}>
            <label style={styles.moduleToggleLabel}>
              <input
                type="checkbox"
                checked={equipmentTracking.enabled}
                onChange={e =>
                  setEquipmentTracking({
                    ...equipmentTracking,
                    enabled: e.target.checked,
                  })
                }
                style={styles.checkbox}
              />
              <strong>🧰 Supporting Tools & Machinery Check</strong>
            </label>
            <p style={styles.moduleDesc}>
              Check out air compressors, oscilloscopes, scaffolding, or service crane trucks.
            </p>
          </div>

          {/* Quality Checklist Module Toggle */}
          <div style={styles.moduleBox}>
            <label style={styles.moduleToggleLabel}>
              <input
                type="checkbox"
                checked={qualityChecklist.enabled}
                onChange={e =>
                  setQualityChecklist({
                    ...qualityChecklist,
                    enabled: e.target.checked,
                  })
                }
                style={styles.checkbox}
              />
              <strong>🛡️ Quality & Safety Checklist</strong>
            </label>
            <p style={styles.moduleDesc}>
              Enforce burn-in diagnostics, OSHA lockout clearance, or magnetic nail sweeps.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Dynamic Model-Specific Custom Fields */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={styles.cardTitle}>3. Custom Specification Fields</h3>
            <p style={styles.cardSubtitle}>
              Create fields required specifically for this job model (e.g. RMA #, Roof Pitch, Engine Hours, Hydraulic PSI)
            </p>
          </div>
          <button type="button" onClick={addCustomField} style={styles.secondaryBtn}>
            ＋ Add Custom Field
          </button>
        </div>

        {customFields.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>
            No custom fields configured for this model yet. Click &quot;Add Custom Field&quot; to define one.
          </p>
        ) : (
          <div style={styles.fieldsList}>
            {customFields.map((field, idx) => (
              <div key={field.id || idx} style={styles.customFieldRow}>
                <div style={{ width: '22%' }}>
                  <label style={styles.miniLabel}>Field Key (variable)</label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={e => updateCustomField(idx, { name: e.target.value })}
                    placeholder="e.g. rmaNumber"
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '28%' }}>
                  <label style={styles.miniLabel}>Display Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateCustomField(idx, { label: e.target.value })}
                    placeholder="e.g. RMA / Defect #"
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '18%' }}>
                  <label style={styles.miniLabel}>Type</label>
                  <select
                    value={field.type}
                    onChange={e => updateCustomField(idx, { type: e.target.value as any })}
                    style={styles.select}
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Numeric</option>
                    <option value="select">Dropdown Select</option>
                    <option value="date">Date Picker</option>
                    <option value="boolean">Toggle / Checkbox</option>
                    <option value="textarea">Multi-line Text</option>
                  </select>
                </div>
                <div style={{ width: '18%' }}>
                  <label style={styles.miniLabel}>Options / Placeholder</label>
                  <input
                    type="text"
                    value={field.type === 'select' ? field.options?.join(', ') || '' : field.placeholder || ''}
                    onChange={e => {
                      if (field.type === 'select') {
                        updateCustomField(idx, {
                          options: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        });
                      } else {
                        updateCustomField(idx, { placeholder: e.target.value });
                      }
                    }}
                    placeholder={field.type === 'select' ? 'Opt 1, Opt 2, Opt 3' : 'Placeholder text...'}
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '8%', textAlign: 'center', paddingTop: '18px' }}>
                  <label style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateCustomField(idx, { required: e.target.checked })}
                    />
                    <br />Req?
                  </label>
                </div>
                <div style={{ width: '6%', textAlign: 'center', paddingTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    style={styles.deleteBtn}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: Labor Roles Setup */}
      {laborTracking.enabled && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={styles.cardTitle}>4. Labor Roles & Hourly Rates</h3>
              <p style={styles.cardSubtitle}>
                Pre-configure trade roles and billable hourly rates for this job environment
              </p>
            </div>
            <button type="button" onClick={addLaborRole} style={styles.secondaryBtn}>
              ＋ Add Labor Role
            </button>
          </div>

          <div style={styles.fieldsList}>
            {laborTracking.roles.map((role, idx) => (
              <div key={role.id || idx} style={styles.customFieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.miniLabel}>Role Title</label>
                  <input
                    type="text"
                    value={role.roleName}
                    onChange={e => updateLaborRole(idx, 'roleName', e.target.value)}
                    placeholder="e.g. Master Diesel Mechanic / Lead Shingle Installer"
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '160px' }}>
                  <label style={styles.miniLabel}>Default Hourly Rate ($/hr)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={role.defaultHourlyRate}
                    onChange={e =>
                      updateLaborRole(idx, 'defaultHourlyRate', parseFloat(e.target.value) || 0)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '40px', textAlign: 'center', paddingTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => removeLaborRole(idx)}
                    style={styles.deleteBtn}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: Quality Checklist Setup */}
      {qualityChecklist.enabled && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={styles.cardTitle}>5. Quality Assurance Checklist Steps</h3>
              <p style={styles.cardSubtitle}>
                Mandatory operational gates that workers must verify before finishing the job
              </p>
            </div>
            <button type="button" onClick={addChecklistStep} style={styles.secondaryBtn}>
              ＋ Add Checklist Step
            </button>
          </div>

          <div style={styles.fieldsList}>
            {qualityChecklist.steps.map((step, idx) => (
              <div key={step.id || idx} style={styles.customFieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.miniLabel}>Step Title</label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={e => updateChecklistStep(idx, 'title', e.target.value)}
                    placeholder="e.g. 4-Hour Burn-In Diagnostic Pass / Complete Tear-off Inspection"
                    style={styles.input}
                  />
                </div>
                <div style={{ width: '80px', textAlign: 'center', paddingTop: '18px' }}>
                  <label style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={step.required}
                      onChange={e => updateChecklistStep(idx, 'required', e.target.checked)}
                    />
                    <br />Req?
                  </label>
                </div>
                <div style={{ width: '40px', textAlign: 'center', paddingTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => removeChecklistStep(idx)}
                    style={styles.deleteBtn}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Save Bar */}
      <div style={styles.bottomBar}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? 'Saving...' : '💾 Save Job Model Configuration'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    paddingBottom: '80px',
  },
  topBar: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  backBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    marginBottom: '10px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
  },
  presetBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  presetLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
  },
  presetButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  presetBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #93c5fd',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  cardSubtitle: {
    margin: '0 0 16px 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '6px',
  },
  miniLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    marginBottom: '4px',
    display: 'block',
  },
  req: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    width: '100%',
  },
  select: {
    padding: '8px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    width: '100%',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#1e293b',
    padding: '6px 0',
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  moduleBox: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  moduleToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    color: '#0f172a',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  moduleDesc: {
    margin: '8px 0 0 26px',
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.4,
  },
  moduleOptions: {
    margin: '12px 0 0 26px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inlineCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    color: '#334155',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  customFieldRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '10px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px',
  },
  errorAlert: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginBottom: '20px',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
    zIndex: 50,
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 22px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
