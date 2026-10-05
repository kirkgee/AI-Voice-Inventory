'use client';

import React, { useState, useEffect } from 'react';
import { JobModelConfig } from '@/types/jobModels';
import {
  RepairOrder,
  InventoryUsageItem,
  LaborEntry,
  ToolEntry,
  ChecklistItemState,
  AssetDetails,
  PriorityLevel,
  RepairOrderCosts,
} from '@/types/repairExecution';
import { Part } from '@/lib/dal/parts';
import { Partner } from '@/lib/dal/partners';
import {
  create as createOrder,
  update as updateOrder,
  deductInventory,
} from '@/lib/dal/repairOrders';

import JobInfoModule from './modules/JobInfoModule';
import AssetTrackingModule from './modules/AssetTrackingModule';
import InventoryUsageModule from './modules/InventoryUsageModule';
import LaborManpowerModule from './modules/LaborManpowerModule';
import ToolsEquipmentModule from './modules/ToolsEquipmentModule';
import QualityChecklistModule from './modules/QualityChecklistModule';
import JobSummaryModule from './modules/JobSummaryModule';

export interface JobExecutionFormProps {
  tenantId: string;
  configurations: JobModelConfig[];
  selectedConfigId?: string;
  existingOrder?: RepairOrder | null;
  partsList: Part[];
  partnersList: Partner[];
  onPartCreated: (newPart: Part) => void;
  onSaved: (orderId: string) => void;
  onCancel: () => void;
}

export default function JobExecutionForm({
  tenantId,
  configurations,
  selectedConfigId,
  existingOrder,
  partsList,
  partnersList,
  onPartCreated,
  onSaved,
  onCancel,
}: JobExecutionFormProps) {
  const isEdit = Boolean(existingOrder);

  // Active Job Model Configuration
  const [activeConfigId, setActiveConfigId] = useState<string>(() => {
    if (existingOrder?.jobConfigId) return existingOrder.jobConfigId;
    if (selectedConfigId) return selectedConfigId;
    const defaultConf = configurations.find(c => c.isDefault) || configurations[0];
    return defaultConf ? defaultConf.id : '';
  });

  const activeConfig =
    configurations.find(c => c.id === activeConfigId) || configurations[0];

  // Form states
  const [orderNumber] = useState<string>(() => {
    if (existingOrder?.orderNumber) return existingOrder.orderNumber;
    const yr = new Date().getFullYear();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `WO-${yr}-${rnd}`;
  });

  const [title, setTitle] = useState<string>(existingOrder?.title || '');
  const [priority, setPriority] = useState<PriorityLevel>(existingOrder?.priority || 'medium');
  const [crmPartnerId, setCrmPartnerId] = useState<string>(existingOrder?.crmPartnerId || '');
  const [crmPartnerName, setCrmPartnerName] = useState<string>(existingOrder?.crmPartnerName || '');
  const [assignedTechnicianName, setAssignedTechnicianName] = useState<string>(
    existingOrder?.assignedTechnicianName || ''
  );
  const [startDate, setStartDate] = useState<string>(
    existingOrder?.startDate || new Date().toISOString().slice(0, 10)
  );

  // Dynamic custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(
    existingOrder?.customFieldValues || {}
  );

  // Modular sections state
  const [asset, setAsset] = useState<AssetDetails>(
    existingOrder?.asset || {
      identifier: '',
      make: '',
      model: '',
      ownership: 'client',
      location: '',
      notes: '',
    }
  );

  const [inventoryUsed, setInventoryUsed] = useState<InventoryUsageItem[]>(
    existingOrder?.inventoryUsed || []
  );

  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>(
    existingOrder?.laborEntries || []
  );

  const [equipmentUsed, setEquipmentUsed] = useState<ToolEntry[]>(
    existingOrder?.equipmentUsed || []
  );

  const [checklistResults, setChecklistResults] = useState<ChecklistItemState[]>(
    existingOrder?.checklistResults || []
  );

  const [status, setStatus] = useState<string>(() => {
    if (existingOrder?.status) return existingOrder.status;
    const firstStatus = activeConfig?.statusWorkflow?.[0]?.id;
    return firstStatus || 'intake';
  });

  const [additionalFees, setAdditionalFees] = useState<number>(
    existingOrder?.costs?.additionalFees || 0
  );
  const [equipmentFees, setEquipmentFees] = useState<number>(
    existingOrder?.costs?.equipmentTotal || 0
  );

  const [internalNotes, setInternalNotes] = useState<string>(existingOrder?.internalNotes || '');
  const [clientSummary, setClientSummary] = useState<string>(existingOrder?.clientSummary || '');
  const [stockDeducted, setStockDeducted] = useState<boolean>(existingOrder?.stockDeducted || false);

  // Saving / Deducting indicators
  const [saving, setSaving] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update status when config changes if currently set status is not valid for new config
  useEffect(() => {
    if (activeConfig?.statusWorkflow && activeConfig.statusWorkflow.length > 0) {
      const exists = activeConfig.statusWorkflow.some(s => s.id === status);
      if (!exists) {
        setStatus(activeConfig.statusWorkflow[0].id);
      }
    }
  }, [activeConfigId]);

  function handleCustomFieldChange(fieldId: string, val: any) {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: val,
    }));
  }

  // Cost calculation
  const partsTotal = inventoryUsed.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const laborTotal = laborEntries.reduce((sum, it) => sum + (it.totalCost || 0), 0);
  const grandTotal = partsTotal + laborTotal + equipmentFees + additionalFees;

  const currentCosts: RepairOrderCosts = {
    partsTotal: Math.round(partsTotal * 100) / 100,
    laborTotal: Math.round(laborTotal * 100) / 100,
    equipmentTotal: Math.round(equipmentFees * 100) / 100,
    additionalFees: Math.round(additionalFees * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };

  async function handleDeductNow() {
    if (!existingOrder?.id) {
      setErrorMsg('Please save the work order first before deducting stock.');
      return;
    }
    setIsDeducting(true);
    try {
      await deductInventory(tenantId, existingOrder.id, inventoryUsed, orderNumber);
      setStockDeducted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to deduct inventory stock.');
    } finally {
      setIsDeducting(false);
    }
  }

  async function handleSaveOrder(autoDeduct: boolean = false) {
    if (!title.trim()) {
      setErrorMsg('Please enter a Job Title or Scope Summary.');
      return;
    }

    if (!activeConfig) {
      setErrorMsg('Please select a valid Job Model Configuration.');
      return;
    }

    // Custom field validation
    for (const cf of activeConfig.customFields || []) {
      if (cf.required && (customFieldValues[cf.name] === undefined || customFieldValues[cf.name] === '')) {
        setErrorMsg(`Field "${cf.label}" is required.`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const orderPayload: Omit<RepairOrder, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
        orderNumber,
        jobConfigId: activeConfig.id,
        jobConfigName: activeConfig.name,
        crmPartnerId: crmPartnerId || undefined,
        crmPartnerName: crmPartnerName || undefined,
        title: title.trim(),
        status,
        priority,
        assignedTechnicianName: assignedTechnicianName.trim() || undefined,
        startDate,
        asset,
        customFieldValues,
        inventoryUsed: inventoryUsed.filter(i => i.partId),
        laborEntries,
        equipmentUsed,
        checklistResults,
        costs: currentCosts,
        stockDeducted: stockDeducted || autoDeduct,
        internalNotes: internalNotes.trim(),
        clientSummary: clientSummary.trim(),
      };

      let savedId = '';
      if (isEdit && existingOrder?.id) {
        await updateOrder(tenantId, existingOrder.id, orderPayload);
        savedId = existingOrder.id;

        if (autoDeduct && !stockDeducted) {
          await deductInventory(tenantId, savedId, orderPayload.inventoryUsed, orderNumber);
        }
      } else {
        savedId = await createOrder(tenantId, orderPayload, autoDeduct);
      }

      onSaved(savedId);
    } catch (err: any) {
      console.error('Failed to save repair execution order:', err);
      setErrorMsg(err?.message || 'An error occurred while saving the repair order.');
    } finally {
      setSaving(false);
    }
  }

  if (!activeConfig) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>No Job Model Configurations available. Please configure one in Service Administration.</p>
        <button onClick={onCancel} style={styles.outlineBtn}>Back</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Navigation & Configuration Switcher Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button type="button" onClick={onCancel} style={styles.backBtn}>
            ← Back
          </button>
          <div>
            <h2 style={styles.pageTitle}>
              {isEdit ? `Edit Execution #${orderNumber}` : `New Repair Execution`}
            </h2>
            <div style={styles.modelSelectorWrapper}>
              <label style={styles.modelSelectLabel}>Assigned Job Model:</label>
              <select
                value={activeConfigId}
                onChange={e => setActiveConfigId(e.target.value)}
                style={styles.modelSelect}
              >
                {configurations.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.targetAudience})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.topBarActions}>
          <button
            type="button"
            onClick={() => handleSaveOrder(false)}
            disabled={saving}
            style={styles.saveDraftBtn}
          >
            {saving ? 'Saving...' : '💾 Save Work Order'}
          </button>
          {activeConfig.modules.inventoryConsumption.enabled && !stockDeducted && (
            <button
              type="button"
              onClick={() => handleSaveOrder(true)}
              disabled={saving}
              style={styles.executeAndDeductBtn}
            >
              {saving ? 'Processing...' : '⚡ Save & Deduct Stock'}
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={styles.errorAlert}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Module 1: Job Info & Dynamic Model Custom Fields */}
      <JobInfoModule
        config={activeConfig}
        orderNumber={orderNumber}
        title={title}
        onTitleChange={setTitle}
        priority={priority}
        onPriorityChange={setPriority}
        crmPartnerId={crmPartnerId}
        crmPartnerName={crmPartnerName}
        onPartnerChange={(id, name) => {
          setCrmPartnerId(id);
          setCrmPartnerName(name);
        }}
        assignedTechnicianName={assignedTechnicianName}
        onTechnicianChange={setAssignedTechnicianName}
        customFieldValues={customFieldValues}
        onCustomFieldChange={handleCustomFieldChange}
        partnersList={partnersList}
        startDate={startDate}
        onStartDateChange={setStartDate}
      />

      {/* Module 2: Equipment / Asset Identification (if enabled) */}
      <AssetTrackingModule
        config={activeConfig}
        asset={asset}
        onAssetChange={setAsset}
      />

      {/* Module 3: Inventory Consumption & BOM (if enabled) */}
      <InventoryUsageModule
        config={activeConfig}
        inventoryUsed={inventoryUsed}
        onInventoryChange={setInventoryUsed}
        partsList={partsList}
        onPartCreated={onPartCreated}
        stockDeducted={stockDeducted}
        onDeductNow={isEdit ? handleDeductNow : undefined}
        isDeducting={isDeducting}
      />

      {/* Module 4: Labor & Manpower Tracking (if enabled) */}
      <LaborManpowerModule
        config={activeConfig}
        laborEntries={laborEntries}
        onLaborChange={setLaborEntries}
      />

      {/* Module 5: Supporting Equipment & Rigging (if enabled) */}
      <ToolsEquipmentModule
        config={activeConfig}
        equipmentUsed={equipmentUsed}
        onEquipmentChange={setEquipmentUsed}
      />

      {/* Module 6: Quality Assurance & Safety Checklist (if enabled) */}
      <QualityChecklistModule
        config={activeConfig}
        checklistResults={checklistResults}
        onChecklistChange={setChecklistResults}
      />

      {/* Module 7: Financial Rollup, Status Transition & Notes */}
      <JobSummaryModule
        config={activeConfig}
        status={status}
        onStatusChange={setStatus}
        costs={currentCosts}
        onAdditionalFeesChange={setAdditionalFees}
        onEquipmentFeesChange={setEquipmentFees}
        internalNotes={internalNotes}
        onInternalNotesChange={setInternalNotes}
        clientSummary={clientSummary}
        onClientSummaryChange={setClientSummary}
      />

      {/* Bottom Sticky Action Bar */}
      <div style={styles.bottomBar}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => handleSaveOrder(false)}
            disabled={saving}
            style={styles.saveDraftBtn}
          >
            {saving ? 'Saving...' : '💾 Save Work Order'}
          </button>
          {activeConfig.modules.inventoryConsumption.enabled && !stockDeducted && (
            <button
              type="button"
              onClick={() => handleSaveOrder(true)}
              disabled={saving}
              style={styles.executeAndDeductBtn}
            >
              {saving ? 'Processing...' : '⚡ Save & Deduct Stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '80px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  pageTitle: {
    margin: 0,
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  modelSelectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  modelSelectLabel: {
    fontSize: '0.8125rem',
    color: '#64748b',
    fontWeight: 500,
  },
  modelSelect: {
    padding: '5px 10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #93c5fd',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  topBarActions: {
    display: 'flex',
    gap: '10px',
  },
  saveDraftBtn: {
    padding: '9px 18px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  executeAndDeductBtn: {
    padding: '9px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
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
  outlineBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
};
