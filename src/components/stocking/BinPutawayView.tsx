'use client';

import React, { useState } from 'react';
import { Part, update as updatePart, adjustQuantity } from '@/lib/dal/parts';
import { Location } from '@/lib/dal/locations';
import { PurchaseOrder } from '@/lib/dal/purchaseOrders';
import { calculatePartMetrics } from '@/lib/stocking/inventoryMetrics';
import {
  formatBinBarcodeString,
  formatBinQRString,
  formatPartBarcodeString,
  formatPartQRString,
} from '@/lib/stocking/barcodeUtils';
import { LabelData } from './LabelPreview';
import PartSearchSelect from '@/components/PartSearchSelect';
import QuickAddPartModal from '@/components/QuickAddPartModal';

interface BinPutawayViewProps {
  location: Location;
  binName: string;
  parts: Part[];
  purchaseOrders: PurchaseOrder[];
  tenantId: string;
  onPrintLabel: (data: LabelData) => void;
  onSelectPart?: (part: Part) => void;
  onPutawayCompleted?: () => void;
}

export default function BinPutawayView({
  location,
  binName,
  parts,
  purchaseOrders,
  tenantId,
  onPrintLabel,
  onSelectPart,
  onPutawayCompleted,
}: BinPutawayViewProps) {
  // Find all parts assigned to this location + bin
  const partsInThisBin = parts.filter(
    (p) =>
      p.locationId === location.id &&
      p.binName?.toLowerCase() === binName.toLowerCase()
  );

  // Putaway Form State
  const [showPutawayDrawer, setShowPutawayDrawer] = useState(false);
  const [selectedPartToPutaway, setSelectedPartToPutaway] = useState<Part | null>(null);
  const [putawayQty, setPutawayQty] = useState<number>(1);
  const [putawayMode, setPutawayMode] = useState<'move' | 'add'>('move');
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Quick Add Part Modal
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Print Label for this Bin
  const handlePrintBinLabel = () => {
    const labelData: LabelData = {
      type: 'bin',
      title: `BIN: ${binName}`,
      subtitle: `Location: ${location.name || location.id}`,
      barcodeValue: formatBinBarcodeString(binName),
      qrValue: formatBinQRString(location.id, binName),
      locationName: location.name || location.id,
      binName,
      tenantId,
    };
    onPrintLabel(labelData);
  };

  // Print Label for a Part in this bin
  const handlePrintPartLabel = (part: Part) => {
    const labelData: LabelData = {
      type: 'part',
      title: part.sku || part.id,
      subtitle: part.description || 'Inventory Material',
      barcodeValue: formatPartBarcodeString(part.sku || part.id),
      qrValue: formatPartQRString(part.sku || part.id, part.id),
      locationName: location.name || location.id,
      binName,
      quantity: part.quantity,
      parLevel: part.parLevel,
      tenantId,
    };
    onPrintLabel(labelData);
  };

  // Quick cycle count adjustment directly from the bin list
  const handleAdjustPartStock = async (part: Part, delta: number) => {
    try {
      await adjustQuantity(tenantId, part.id, delta);
    } catch (err: any) {
      console.error('Failed to adjust stock:', err);
    }
  };

  // Execute putaway into this bin
  const handleConfirmPutaway = async () => {
    if (!selectedPartToPutaway) {
      setFeedbackMsg({ type: 'error', text: 'Please select a part to put away.' });
      return;
    }

    try {
      setSaving(true);
      setFeedbackMsg(null);

      const newQty =
        putawayMode === 'add'
          ? (selectedPartToPutaway.quantity ?? 0) + Math.max(1, putawayQty)
          : selectedPartToPutaway.quantity ?? 0;

      await updatePart(tenantId, selectedPartToPutaway.id, {
        locationId: location.id,
        binName: binName,
        quantity: newQty,
      });

      setFeedbackMsg({
        type: 'success',
        text: `✓ Successfully put away ${selectedPartToPutaway.sku || 'Part'} into ${binName}!`,
      });

      setSelectedPartToPutaway(null);
      setShowPutawayDrawer(false);
      setPutawayQty(1);

      if (onPutawayCompleted) {
        onPutawayCompleted();
      }
    } catch (err: any) {
      console.error('Failed to putaway part into bin:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to put away part.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Bin Header Card */}
      <div style={styles.binHeaderCard}>
        <div style={styles.binTitleRow}>
          <div>
            <div style={styles.locBreadcrumb}>
              <span>Storage Location:</span> <strong>{location.name || location.id}</strong>
            </div>
            <h2 style={styles.binTitle}>Shelf / Bin: {binName}</h2>
            <div style={styles.binMetaRow}>
              <span style={styles.itemsCountBadge}>
                {partsInThisBin.length} {partsInThisBin.length === 1 ? 'Part Stored' : 'Parts Stored'}
              </span>
              <span style={styles.totalUnitsBadge}>
                {partsInThisBin.reduce((acc, p) => acc + (p.quantity || 0), 0)} Total Units in Bin
              </span>
            </div>
          </div>

          <div style={styles.headerBtnGroup}>
            <button
              type="button"
              onClick={handlePrintBinLabel}
              style={styles.printBinBtn}
              aria-label="Print label for this bin"
            >
              🏷️ Print Bin Label
            </button>
            <button
              type="button"
              onClick={() => setShowPutawayDrawer(!showPutawayDrawer)}
              style={styles.putawayToggleBtn}
            >
              {showPutawayDrawer ? '✕ Cancel Putaway' : '➕ Putaway Item Here'}
            </button>
          </div>
        </div>
      </div>

      {/* Putaway Drawer / Inline Action Panel */}
      {showPutawayDrawer && (
        <div style={styles.putawayDrawer}>
          <h3 style={styles.putawayDrawerTitle}>📥 Put Away Materials into Bin "{binName}"</h3>
          <p style={styles.putawayDrawerSub}>
            Select any inventory part from the catalog to assign or stock directly into this bin.
          </p>

          <div style={styles.putawayDrawerContent}>
            {/* Part Search Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.inputLabel}>Select Part or Material to Stock</label>
              <PartSearchSelect
                parts={parts}
                selectedPartId={selectedPartToPutaway?.id ?? null}
                onSelect={(part) => setSelectedPartToPutaway(part.id ? part : null)}
                onAddNew={() => setShowQuickAddModal(true)}
                placeholder="Search catalog by SKU or description..."
              />
            </div>

            {selectedPartToPutaway && (
              <div style={styles.selectedPartPreview}>
                <div>
                  <strong>{selectedPartToPutaway.sku}</strong> - {selectedPartToPutaway.description}
                  <div style={styles.currentLocSmall}>
                    Currently in:{' '}
                    {selectedPartToPutaway.locationId
                      ? `${selectedPartToPutaway.locationId} / ${selectedPartToPutaway.binName || 'General'}`
                      : 'Unassigned'}
                  </div>
                </div>
                <div style={styles.currentQtySmall}>
                  Qty on Hand: <strong>{selectedPartToPutaway.quantity ?? 0}</strong>
                </div>
              </div>
            )}

            {/* Mode: Move vs Add New Stock */}
            <div style={styles.modeTabs}>
              <button
                type="button"
                style={{
                  ...styles.modeTabBtn,
                  ...(putawayMode === 'move' ? styles.modeTabBtnActive : {}),
                }}
                onClick={() => setPutawayMode('move')}
              >
                🔄 Re-slot / Move to this Bin
              </button>
              <button
                type="button"
                style={{
                  ...styles.modeTabBtn,
                  ...(putawayMode === 'add' ? styles.modeTabBtnActive : {}),
                }}
                onClick={() => setPutawayMode('add')}
              >
                ➕ Put Away Additional Stock (+ Qty)
              </button>
            </div>

            {/* Quantity Stepper if adding stock */}
            {putawayMode === 'add' && (
              <div style={styles.qtyRow}>
                <label style={styles.inputLabel}>Quantity to Add into Bin</label>
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
                </div>
              </div>
            )}

            <div style={styles.drawerActions}>
              <button
                type="button"
                style={styles.cancelDrawerBtn}
                onClick={() => setShowPutawayDrawer(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !selectedPartToPutaway}
                style={{
                  ...styles.confirmDrawerBtn,
                  ...(!selectedPartToPutaway ? styles.confirmDrawerBtnDisabled : {}),
                }}
                onClick={handleConfirmPutaway}
              >
                {saving
                  ? 'Saving...'
                  : putawayMode === 'add'
                  ? `Confirm Putaway (+${putawayQty} Units)`
                  : 'Assign & Move to this Bin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {feedbackMsg && (
        <div
          style={
            feedbackMsg.type === 'success' ? styles.successBanner : styles.errorBanner
          }
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Parts Supposed to be in this Bin */}
      <div style={styles.binContentsSection}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>📦 Inventory Assigned to this Bin</h3>
          <span style={styles.sectionSubtitle}>
            Parts and materials designated for shelf <strong>{binName}</strong>
          </span>
        </div>

        {partsInThisBin.length === 0 ? (
          <div style={styles.emptyBinCard}>
            <span style={styles.emptyBinIcon}>📭</span>
            <div style={styles.emptyBinText}>
              <strong>This Bin is Currently Empty</strong>
              <p style={styles.emptyBinSub}>
                No parts are assigned to this bin yet. Tap "➕ Putaway Item Here" above to stock parts in this bin.
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.partsGrid}>
            {partsInThisBin.map((part) => {
              const partMetrics = calculatePartMetrics(part, purchaseOrders);
              return (
                <div key={part.id} style={styles.partCard}>
                  <div style={styles.partCardTop}>
                    <div>
                      <div style={styles.partSku}>{part.sku || 'No SKU'}</div>
                      <div style={styles.partDesc}>{part.description || 'No description'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrintPartLabel(part)}
                      style={styles.printPartLabelBtn}
                      title="Print label for this part"
                    >
                      🖨️ Label
                    </button>
                  </div>

                  <div style={styles.partStatsRow}>
                    <div style={styles.statBox}>
                      <span style={styles.statLabel}>In Stock</span>
                      <strong style={styles.statValueLarge}>{part.quantity ?? 0}</strong>
                    </div>

                    <div style={styles.statBox}>
                      <span style={styles.statLabel}>Par Level</span>
                      <span style={styles.statValue}>{part.parLevel ?? 0}</span>
                    </div>

                    <div style={styles.statBox}>
                      <span style={styles.statLabel}>On Order</span>
                      <span style={{ ...styles.statValue, color: '#2563eb' }}>
                        {partMetrics.quantityOnOrder}
                      </span>
                    </div>

                    {/* Quick +/- Stock Adjustment */}
                    <div style={styles.quickAdjustBox}>
                      <span style={styles.statLabel}>Adjust Stock</span>
                      <div style={styles.quickAdjustBtns}>
                        <button
                          type="button"
                          style={styles.adjustBtn}
                          onClick={() => handleAdjustPartStock(part, -1)}
                          title="Decrease stock by 1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          style={styles.adjustBtn}
                          onClick={() => handleAdjustPartStock(part, 1)}
                          title="Increase stock by 1"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                  {onSelectPart && (
                    <button
                      type="button"
                      style={styles.viewPartDetailsBtn}
                      onClick={() => onSelectPart(part)}
                    >
                      View Part Details & Full Putaway View →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Add Part Modal if triggered */}
      {showQuickAddModal && (
        <QuickAddPartModal
          tenantId={tenantId}
          onPartCreated={(newPart: Part) => {
            setSelectedPartToPutaway(newPart);
            setShowQuickAddModal(false);
          }}
          onClose={() => setShowQuickAddModal(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  binHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  binTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
  },
  locBreadcrumb: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '4px',
  },
  binTitle: {
    margin: '0 0 6px 0',
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  binMetaRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  itemsCountBadge: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  totalUnitsBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  headerBtnGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  printBinBtn: {
    padding: '8px 14px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  putawayToggleBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
  },
  putawayDrawer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #2563eb',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
  },
  putawayDrawerTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  putawayDrawerSub: {
    margin: '4px 0 16px 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  putawayDrawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  selectedPartPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.875rem',
  },
  currentLocSmall: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
  },
  currentQtySmall: {
    fontSize: '0.8125rem',
    color: '#334155',
  },
  modeTabs: {
    display: 'flex',
    gap: '8px',
  },
  modeTabBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modeTabBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },
  qtyRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepperWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  stepperBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontWeight: 700,
    cursor: 'pointer',
  },
  stepperInput: {
    width: '60px',
    height: '32px',
    textAlign: 'center',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontWeight: 600,
  },
  drawerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  cancelDrawerBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  confirmDrawerBtn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmDrawerBtnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  successBanner: {
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#15803d',
    fontSize: '0.875rem',
  },
  errorBanner: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '0.875rem',
  },
  binContentsSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
  },
  sectionHeader: {
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  emptyBinCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#f8fafc',
    border: '1.5px dashed #cbd5e1',
    borderRadius: '10px',
    padding: '24px',
  },
  emptyBinIcon: {
    fontSize: '2rem',
  },
  emptyBinText: {
    color: '#334155',
  },
  emptyBinSub: {
    margin: '4px 0 0 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  partsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  partCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
  },
  partCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  partSku: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  partDesc: {
    fontSize: '0.8125rem',
    color: '#475569',
  },
  printPartLabelBtn: {
    padding: '4px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    color: '#0f172a',
  },
  partStatsRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: '8px 10px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '60px',
  },
  statLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValueLarge: {
    fontSize: '1.125rem',
    color: '#0f172a',
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#334155',
  },
  quickAdjustBox: {
    marginLeft: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  quickAdjustBtns: {
    display: 'flex',
    gap: '4px',
  },
  adjustBtn: {
    padding: '3px 8px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  viewPartDetailsBtn: {
    marginTop: '10px',
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
};
