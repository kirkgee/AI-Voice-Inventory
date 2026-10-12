'use client';

import React, { useState } from 'react';
import { Part, update as updatePart } from '@/lib/dal/parts';
import { Location, update as updateLocation } from '@/lib/dal/locations';
import { PurchaseOrder } from '@/lib/dal/purchaseOrders';
import { calculatePartMetrics } from '@/lib/stocking/inventoryMetrics';
import {
  formatPartBarcodeString,
  formatPartQRString,
  extractBinNamesFromLocation,
} from '@/lib/stocking/barcodeUtils';
import { LabelData } from './LabelPreview';

interface PartPutawayViewProps {
  part: Part;
  locations: Location[];
  purchaseOrders: PurchaseOrder[];
  tenantId: string;
  onPartUpdated?: (updatedPart: Part) => void;
  onPrintLabel: (data: LabelData) => void;
  onSelectBin?: (location: Location, binName: string) => void;
}

export default function PartPutawayView({
  part,
  locations,
  purchaseOrders,
  tenantId,
  onPartUpdated,
  onPrintLabel,
  onSelectBin,
}: PartPutawayViewProps) {
  // Metrics calculation
  const metrics = calculatePartMetrics(part, purchaseOrders);

  // Putaway Form State
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    part.locationId || (locations[0]?.id ?? '')
  );
  const [selectedBinName, setSelectedBinName] = useState<string>(part.binName || '');
  const [isCreatingNewBin, setIsCreatingNewBin] = useState(false);
  const [customBinName, setCustomBinName] = useState('');
  const [putawayMode, setPutawayMode] = useState<'relocate' | 'add_stock'>('relocate');
  const [putawayQty, setPutawayQty] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Find currently selected location object
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const availableBins = selectedLocation ? extractBinNamesFromLocation(selectedLocation) : [];

  // Find current assigned location
  const currentAssignedLocation = locations.find((l) => l.id === part.locationId);

  // Prepare label data for printing
  const handlePrint = () => {
    const labelData: LabelData = {
      type: 'part',
      title: part.sku || part.id,
      subtitle: part.description || 'Inventory Material',
      barcodeValue: formatPartBarcodeString(part.sku || part.id),
      qrValue: formatPartQRString(part.sku || part.id, part.id),
      locationName: currentAssignedLocation?.name || part.locationId,
      binName: part.binName,
      quantity: part.quantity,
      parLevel: part.parLevel,
      tenantId,
    };
    onPrintLabel(labelData);
  };

  // Execute Putaway Action
  const handleExecutePutaway = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const targetBin = isCreatingNewBin ? customBinName.trim() : selectedBinName.trim();
      if (!selectedLocationId) {
        throw new Error('Please select a storage location.');
      }
      if (!targetBin) {
        throw new Error('Please select or specify a bin name.');
      }

      // If user created a new bin in this location, update the location document to register it
      if (isCreatingNewBin && selectedLocation && targetBin) {
        const existingBins = extractBinNamesFromLocation(selectedLocation);
        if (!existingBins.some((b) => b.toLowerCase() === targetBin.toLowerCase())) {
          const updatedBins = [...(selectedLocation.bins || []), targetBin];
          await updateLocation(tenantId, selectedLocation.id, { bins: updatedBins });
        }
      }

      // Calculate new quantity
      let newQuantity = part.quantity ?? 0;
      if (putawayMode === 'add_stock') {
        newQuantity += Math.max(1, putawayQty);
      }

      const updatePayload: Partial<Part> = {
        locationId: selectedLocationId,
        binName: targetBin,
        quantity: newQuantity,
      };

      await updatePart(tenantId, part.id, updatePayload);

      const updatedPartData = { ...part, ...updatePayload };
      if (onPartUpdated) {
        onPartUpdated(updatedPartData);
      }

      setSuccessMsg(
        putawayMode === 'add_stock'
          ? `✓ Added ${putawayQty} units and put away into ${targetBin}!`
          : `✓ Part relocated to ${selectedLocation?.name || 'Location'} / ${targetBin}!`
      );
      setIsCreatingNewBin(false);
      setCustomBinName('');
    } catch (err: any) {
      console.error('Failed to execute putaway:', err);
      setErrorMsg(err?.message || 'Failed to update putaway location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Banner Card: Part Identity */}
      <div style={styles.partCard}>
        <div style={styles.partHeaderRow}>
          <div>
            <div style={styles.skuRow}>
              <h2 style={styles.skuTitle}>{part.sku || 'No SKU'}</h2>
              {part.type && <span style={styles.typeBadge}>{part.type}</span>}
              <span
                style={{
                  ...styles.healthBadge,
                  ...(metrics.stockHealth === 'healthy'
                    ? styles.healthHealthy
                    : metrics.stockHealth === 'low_stock'
                    ? styles.healthLow
                    : metrics.stockHealth === 'backordered'
                    ? styles.healthBackordered
                    : styles.healthCritical),
                }}
              >
                {metrics.stockHealth === 'healthy'
                  ? 'In Stock'
                  : metrics.stockHealth === 'low_stock'
                  ? 'Low Stock'
                  : metrics.stockHealth === 'backordered'
                  ? 'Backordered'
                  : 'Out of Stock'}
              </span>
            </div>
            <p style={styles.description}>{part.description || 'No description provided'}</p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={styles.printBtn}
            aria-label="Print label for this part"
          >
            🖨️ Print Part Label
          </button>
        </div>

        {/* Secondary Info row */}
        <div style={styles.subInfoRow}>
          {part.supplier && (
            <span style={styles.subInfoItem}>
              <strong>Supplier:</strong> {part.supplier}
            </span>
          )}
          {part.value !== undefined && (
            <span style={styles.subInfoItem}>
              <strong>Unit Cost:</strong> ${Number(part.value).toFixed(2)}
            </span>
          )}
          <span style={styles.subInfoItem}>
            <strong>Part ID:</strong> <code style={styles.idCode}>{part.id}</code>
          </span>
        </div>
      </div>

      {/* Crucial Stock Metrics Grid */}
      <div style={styles.metricsGrid}>
        {/* Quantity In Stock */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Quantity In Stock</div>
          <div style={styles.metricValueLarge}>{metrics.quantityInStock}</div>
          <div style={styles.metricSub}>Units on Hand</div>
        </div>

        {/* Par Level */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Par Level</div>
          <div style={styles.metricValueLarge}>{metrics.parLevel}</div>
          <div style={styles.metricSub}>
            {metrics.parDeficit > 0 ? (
              <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                {metrics.parDeficit} below par
              </span>
            ) : (
              <span style={{ color: '#15803d' }}>At/above par</span>
            )}
          </div>
        </div>

        {/* Quantity On Order */}
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #2563eb' }}>
          <div style={styles.metricLabel}>Quantity On Order</div>
          <div style={{ ...styles.metricValueLarge, color: '#2563eb' }}>
            {metrics.quantityOnOrder}
          </div>
          <div style={styles.metricSub}>
            {metrics.activePOs.length > 0
              ? `${metrics.activePOs.length} active PO(s)`
              : 'No pending orders'}
          </div>
        </div>

        {/* Net Projected Total */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Projected</div>
          <div style={styles.metricValueLarge}>{metrics.netAvailable}</div>
          <div style={styles.metricSub}>In Stock + On Order</div>
        </div>
      </div>

      {/* Active Purchase Orders Breakdown (if any) */}
      {metrics.activePOs.length > 0 && (
        <div style={styles.poBreakdownBox}>
          <div style={styles.poBreakdownTitle}>
            📦 Active Purchase Orders for this Part ({metrics.quantityOnOrder} Total on Order)
          </div>
          <div style={styles.poList}>
            {metrics.activePOs.map((po, idx) => (
              <div key={idx} style={styles.poItem}>
                <div>
                  <strong>PO #{po.poId}</strong>
                  {po.supplier && <span> • {po.supplier}</span>}
                  <span style={styles.poStatusBadge}>{po.status}</span>
                </div>
                <div style={styles.poQtyText}>
                  + {po.quantityOrdered} units expected
                  {po.expectedDeliveryDate && (
                    <span style={styles.poDate}>
                      {' '}
                      ({new Date(po.expectedDeliveryDate).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Location & Bin Display */}
      <div style={styles.currentLocCard}>
        <div style={styles.locCardHeader}>
          <span style={styles.locCardTitle}>📍 Current Assigned Location & Bin</span>
          {part.locationId && part.binName && onSelectBin && currentAssignedLocation && (
            <button
              type="button"
              style={styles.viewBinLinkBtn}
              onClick={() => onSelectBin(currentAssignedLocation, part.binName!)}
            >
              Inspect Bin "{part.binName}" →
            </button>
          )}
        </div>

        <div style={styles.locDisplayContent}>
          {part.locationId ? (
            <div style={styles.assignedLocBox}>
              <div style={styles.locNameLarge}>
                {currentAssignedLocation?.name || `Location ID: ${part.locationId}`}
              </div>
              <div style={styles.binNameBadge}>
                Bin: <strong>{part.binName || 'General / Unnamed Bin'}</strong>
              </div>
            </div>
          ) : (
            <div style={styles.unassignedBox}>
              <span style={styles.unassignedIcon}>⚠️</span>
              <div>
                <strong>Not Assigned to Any Bin or Location</strong>
                <p style={styles.unassignedSub}>
                  Use the putaway panel below to assign this part to a warehouse shelf or bin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Putaway Execution Card */}
      <div style={styles.putawayCard}>
        <h3 style={styles.putawayTitle}>📥 Warehouse Putaway & Re-slotting</h3>
        <p style={styles.putawayDesc}>
          Assign, relocate, or put away additional inventory stock into a designated warehouse bin.
        </p>

        {/* Mode Selector */}
        <div style={styles.modeTabs}>
          <button
            type="button"
            onClick={() => setPutawayMode('relocate')}
            style={{
              ...styles.modeTabBtn,
              ...(putawayMode === 'relocate' ? styles.modeTabBtnActive : {}),
            }}
          >
            🔄 Relocate / Change Bin
          </button>
          <button
            type="button"
            onClick={() => setPutawayMode('add_stock')}
            style={{
              ...styles.modeTabBtn,
              ...(putawayMode === 'add_stock' ? styles.modeTabBtnActive : {}),
            }}
          >
            ➕ Putaway & Add Stock (+ Qty)
          </button>
        </div>

        <div style={styles.putawayFormGrid}>
          {/* Target Location */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Target Storage Location</label>
            <select
              value={selectedLocationId}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setSelectedBinName('');
              }}
              style={styles.selectInput}
            >
              {locations.length === 0 && <option value="">No locations available</option>}
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name || loc.id}
                </option>
              ))}
            </select>
          </div>

          {/* Target Bin */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={styles.formLabel}>Target Bin / Shelf</label>
              <button
                type="button"
                style={styles.toggleNewBinBtn}
                onClick={() => setIsCreatingNewBin(!isCreatingNewBin)}
              >
                {isCreatingNewBin ? 'Pick Existing Bin' : '＋ New Bin Name'}
              </button>
            </div>

            {isCreatingNewBin ? (
              <input
                type="text"
                value={customBinName}
                onChange={(e) => setCustomBinName(e.target.value)}
                placeholder="e.g. Bin C-104, Shelf 2..."
                style={styles.textInput}
              />
            ) : (
              <select
                value={selectedBinName}
                onChange={(e) => setSelectedBinName(e.target.value)}
                style={styles.selectInput}
              >
                <option value="">-- Select a Bin --</option>
                {availableBins.map((bin, idx) => (
                  <option key={idx} value={bin}>
                    {bin}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Additional Stock Quantity if add_stock mode */}
          {putawayMode === 'add_stock' && (
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Quantity to Put Away (Add)</label>
              <div style={styles.stepperWrap}>
                <button
                  type="button"
                  style={styles.stepperBtn}
                  onClick={() => setPutawayQty(Math.max(1, putawayQty - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={putawayQty}
                  onChange={(e) => setPutawayQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={styles.stepperInput}
                />
                <button
                  type="button"
                  style={styles.stepperBtn}
                  onClick={() => setPutawayQty(putawayQty + 1)}
                >
                  +
                </button>
                <div style={styles.quickStepBtns}>
                  <button
                    type="button"
                    style={styles.quickStepBtn}
                    onClick={() => setPutawayQty(putawayQty + 5)}
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    style={styles.quickStepBtn}
                    onClick={() => setPutawayQty(putawayQty + 10)}
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    style={styles.quickStepBtn}
                    onClick={() => setPutawayQty(putawayQty + 50)}
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}

        {/* Save Putaway Action */}
        <div style={styles.putawayActionRow}>
          <button
            type="button"
            disabled={saving}
            onClick={handleExecutePutaway}
            style={styles.confirmPutawayBtn}
          >
            {saving
              ? 'Saving Putaway...'
              : putawayMode === 'add_stock'
              ? `Confirm Putaway (+${putawayQty} Units)`
              : 'Confirm Location / Bin Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  partCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  partHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
  },
  skuRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  skuTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  healthBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '20px',
  },
  healthHealthy: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  healthLow: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  healthBackordered: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  healthCritical: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  description: {
    margin: '8px 0 0 0',
    color: '#475569',
    fontSize: '0.9375rem',
  },
  printBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  subInfoRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    fontSize: '0.8125rem',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  subInfoItem: {
    display: 'inline-flex',
    gap: '4px',
  },
  idCode: {
    backgroundColor: '#f1f5f9',
    padding: '1px 4px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
  },
  metricValueLarge: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
    marginBottom: '4px',
  },
  metricSub: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  poBreakdownBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '14px',
  },
  poBreakdownTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: '8px',
  },
  poList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  poItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8125rem',
    backgroundColor: '#ffffff',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #dbeafe',
  },
  poStatusBadge: {
    marginLeft: '8px',
    padding: '2px 6px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '4px',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  poQtyText: {
    fontWeight: 700,
    color: '#1d4ed8',
  },
  poDate: {
    fontWeight: 400,
    color: '#64748b',
  },
  currentLocCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid #e2e8f0',
  },
  locCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  locCardTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  viewBinLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  locDisplayContent: {
    marginTop: '6px',
  },
  assignedLocBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  locNameLarge: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  binNameBadge: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  unassignedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px',
    color: '#92400e',
  },
  unassignedIcon: {
    fontSize: '1.5rem',
  },
  unassignedSub: {
    margin: '2px 0 0 0',
    fontSize: '0.8125rem',
    color: '#b45309',
  },
  putawayCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
  },
  putawayTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  putawayDesc: {
    margin: '4px 0 16px 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  modeTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  modeTabBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modeTabBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },
  putawayFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
  },
  selectInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
    color: '#0f172a',
  },
  textInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
    color: '#0f172a',
  },
  toggleNewBinBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  stepperWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  stepperBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '1.125rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: '70px',
    height: '36px',
    textAlign: 'center',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9375rem',
    fontWeight: 600,
  },
  quickStepBtns: {
    display: 'flex',
    gap: '4px',
  },
  quickStepBtn: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f1f5f9',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBox: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '0.8125rem',
    marginBottom: '12px',
  },
  successBox: {
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#15803d',
    fontSize: '0.8125rem',
    marginBottom: '12px',
  },
  putawayActionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  confirmPutawayBtn: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
};
