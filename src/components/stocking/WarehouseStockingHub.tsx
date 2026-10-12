'use client';

import React, { useState, useMemo } from 'react';
import { Part, update as updatePart } from '@/lib/dal/parts';
import { Location, create as createLocation, update as updateLocation } from '@/lib/dal/locations';
import { PurchaseOrder } from '@/lib/dal/purchaseOrders';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import {
  resolveScanCode,
  extractBinNamesFromLocation,
  formatBinBarcodeString,
  formatBinQRString,
  formatLocationBarcodeString,
  formatLocationQRString,
  formatPartBarcodeString,
  formatPartQRString,
  BinReference,
} from '@/lib/stocking/barcodeUtils';
import WarehouseScanner from './WarehouseScanner';
import PartPutawayView from './PartPutawayView';
import BinPutawayView from './BinPutawayView';
import BarcodePrintModal from './BarcodePrintModal';
import { LabelData } from './LabelPreview';
import QuickAddPartModal from '@/components/QuickAddPartModal';

interface WarehouseStockingHubProps {
  tenantId: string;
}

type SubTab = 'scan_putaway' | 'browse_bins' | 'print_station';

export default function WarehouseStockingHub({ tenantId }: WarehouseStockingHubProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('scan_putaway');

  // Real-time Firestore Subscriptions
  const {
    data: parts,
    loading: partsLoading,
  } = useFirestoreCollection<Part>({
    collectionName: 'parts',
    tenantId,
  });

  const {
    data: locations,
    loading: locationsLoading,
  } = useFirestoreCollection<Location>({
    collectionName: 'locations',
    tenantId,
  });

  const {
    data: purchaseOrders,
    loading: poLoading,
  } = useFirestoreCollection<PurchaseOrder>({
    collectionName: 'purchaseOrders',
    tenantId,
  });

  // Active Scanned Selection State
  const [activeScanQuery, setActiveScanQuery] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedBin, setSelectedBin] = useState<{ location: Location; binName: string } | null>(
    null
  );
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Label Printing State
  const [printModalData, setPrintModalData] = useState<LabelData | null>(null);

  // Quick Add Part Modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [unrecognizedCode, setUnrecognizedCode] = useState<string>('');

  // Location / Bin Creation Dialog State
  const [showNewLocModal, setShowNewLocModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocBins, setNewLocBins] = useState('A-101, A-102, A-103, A-104');
  const [isInitializingDefaults, setIsInitializingDefaults] = useState(false);

  // Handle Barcode or QR Code Scan
  const handleScanResolved = (rawCode: string) => {
    setActiveScanQuery(rawCode);
    setScanMessage(null);

    const resolution = resolveScanCode(rawCode, parts, locations);

    if (resolution.type === 'part' && resolution.matchedPart) {
      setSelectedPart(resolution.matchedPart);
      setSelectedBin(null);
      setSelectedLocation(null);
      setActiveTab('scan_putaway');
    } else if (resolution.type === 'bin' && resolution.matchedBin) {
      setSelectedBin(resolution.matchedBin);
      setSelectedPart(null);
      setSelectedLocation(resolution.matchedLocation || null);
      setActiveTab('scan_putaway');
    } else if (resolution.type === 'location' && resolution.matchedLocation) {
      setSelectedLocation(resolution.matchedLocation);
      setSelectedBin(null);
      setSelectedPart(null);
      setActiveTab('browse_bins');
    } else if (resolution.multipleMatches) {
      setScanMessage(
        `Multiple items matched "${rawCode}". Please choose from the options below.`
      );
      // If parts exist, set first, else if bins exist, set first
      if (resolution.multipleMatches.parts?.length) {
        setSelectedPart(resolution.multipleMatches.parts[0]);
      } else if (resolution.multipleMatches.bins?.length) {
        setSelectedBin(resolution.multipleMatches.bins[0]);
      }
    } else {
      setSelectedPart(null);
      setSelectedBin(null);
      setSelectedLocation(null);
      setUnrecognizedCode(rawCode);
      setScanMessage(
        `No part, bin, or location found matching "${rawCode}". You can create it as a new part or bin.`
      );
    }
  };

  // Seed default locations if tenant has none
  const handleInitializeDefaultLocations = async () => {
    try {
      setIsInitializingDefaults(true);
      await createLocation(tenantId, {
        name: 'Main Warehouse - Aisle A',
        bins: ['Bin A-101', 'Bin A-102', 'Bin A-103', 'Bin A-104'],
      });
      await createLocation(tenantId, {
        name: 'Main Warehouse - Aisle B',
        bins: ['Bin B-201', 'Bin B-202', 'Bin B-203', 'Bin B-204'],
      });
      await createLocation(tenantId, {
        name: 'Receiving Dock & Staging',
        bins: ['Stage-01', 'Stage-02', 'Holding-Bay'],
      });
    } catch (err) {
      console.error('Failed to initialize default locations:', err);
    } finally {
      setIsInitializingDefaults(false);
    }
  };

  // Create new custom location
  const handleCreateNewLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    try {
      const binsArray = newLocBins
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      await createLocation(tenantId, {
        name: newLocName.trim(),
        bins: binsArray,
      });

      setNewLocName('');
      setNewLocBins('A-101, A-102');
      setShowNewLocModal(false);
    } catch (err) {
      console.error('Failed to create location:', err);
    }
  };

  // Parts waiting for putaway (unassigned location)
  const unassignedParts = useMemo(() => {
    return parts.filter((p) => !p.locationId || !p.binName);
  }, [parts]);

  const isLoading = partsLoading || locationsLoading || poLoading;

  return (
    <div style={styles.container}>
      {/* Module Title & Quick Navigation */}
      <div style={styles.hubHeader}>
        <div>
          <h2 style={styles.hubTitle}>📥 Warehouse Stocking & Putaway</h2>
          <p style={styles.hubSubtitle}>
            Scan barcodes, manage shelf bins, execute putaway workflows, and print shelf & part labels.
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div style={styles.subTabs}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'scan_putaway' ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab('scan_putaway')}
          >
            🎯 Scan & Putaway
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'browse_bins' ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab('browse_bins')}
          >
            🗄️ Browse Bins & Shelves
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'print_station' ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab('print_station')}
          >
            🏷️ Print Station
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'scan_putaway' && (
        <div style={styles.tabContent}>
          {/* Universal Barcode & QR Scanner Bar */}
          <WarehouseScanner
            onScan={handleScanResolved}
            initialQuery={activeScanQuery}
            placeholder="Scan barcode, QR, or enter Part # / Bin..."
          />

          {/* Ambiguous or Unrecognized Messages */}
          {scanMessage && (
            <div style={styles.infoAlert}>
              <div style={{ flex: 1 }}>{scanMessage}</div>
              {unrecognizedCode && (
                <div style={styles.alertActions}>
                  <button
                    type="button"
                    style={styles.quickAddBtn}
                    onClick={() => setShowAddPartModal(true)}
                  >
                    ＋ Add as New Part
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Entity Render Area */}
          {selectedPart ? (
            <div>
              <div style={styles.viewBanner}>
                <span>Showing Scanned Part: <strong>{selectedPart.sku}</strong></span>
                <button
                  type="button"
                  style={styles.clearSelectionBtn}
                  onClick={() => {
                    setSelectedPart(null);
                    setActiveScanQuery('');
                  }}
                >
                  ✕ Clear
                </button>
              </div>
              <PartPutawayView
                part={selectedPart}
                locations={locations}
                purchaseOrders={purchaseOrders}
                tenantId={tenantId}
                onPartUpdated={(updated) => setSelectedPart(updated)}
                onPrintLabel={(labelData) => setPrintModalData(labelData)}
                onSelectBin={(loc, binName) => {
                  setSelectedBin({ location: loc, binName });
                  setSelectedPart(null);
                }}
              />
            </div>
          ) : selectedBin ? (
            <div>
              <div style={styles.viewBanner}>
                <span>
                  Showing Scanned Bin: <strong>{selectedBin.binName}</strong> (Location:{' '}
                  {selectedBin.location.name})
                </span>
                <button
                  type="button"
                  style={styles.clearSelectionBtn}
                  onClick={() => {
                    setSelectedBin(null);
                    setActiveScanQuery('');
                  }}
                >
                  ✕ Clear
                </button>
              </div>
              <BinPutawayView
                location={selectedBin.location}
                binName={selectedBin.binName}
                parts={parts}
                purchaseOrders={purchaseOrders}
                tenantId={tenantId}
                onPrintLabel={(labelData) => setPrintModalData(labelData)}
                onSelectPart={(part) => {
                  setSelectedPart(part);
                  setSelectedBin(null);
                }}
              />
            </div>
          ) : (
            /* Idle Screen: Unassigned Parts waiting for putaway */
            <div style={styles.idleSection}>
              <div style={styles.idleCard}>
                <span style={styles.idleIcon}>📱</span>
                <h3 style={styles.idleTitle}>Ready to Scan or Putaway</h3>
                <p style={styles.idleText}>
                  Use your phone camera or barcode gun above to scan any Part, Shelf Bin, or Location code.
                  Or tap an unassigned part below to begin putaway.
                </p>
              </div>

              {/* Unassigned Parts Waiting for Putaway */}
              <div style={styles.unassignedListSection}>
                <div style={styles.unassignedHeader}>
                  <h4 style={styles.unassignedTitle}>
                    📥 Parts Awaiting Bin Putaway ({unassignedParts.length})
                  </h4>
                  <span style={styles.unassignedSub}>
                    Materials received in stock with no shelf or bin assigned
                  </span>
                </div>

                {unassignedParts.length === 0 ? (
                  <div style={styles.allAssignedNotice}>
                    ✓ All inventory parts are currently assigned to warehouse bins!
                  </div>
                ) : (
                  <div style={styles.unassignedGrid}>
                    {unassignedParts.slice(0, 8).map((part) => (
                      <div
                        key={part.id}
                        style={styles.unassignedItemCard}
                        onClick={() => setSelectedPart(part)}
                      >
                        <div style={styles.unassignedSku}>{part.sku || 'No SKU'}</div>
                        <div style={styles.unassignedDesc}>{part.description || 'No description'}</div>
                        <div style={styles.unassignedFooter}>
                          <span style={styles.unassignedQty}>Qty: {part.quantity ?? 0}</span>
                          <button type="button" style={styles.putawayDirectBtn}>
                            Putaway →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browse Bins & Locations Tab */}
      {activeTab === 'browse_bins' && (
        <div style={styles.tabContent}>
          <div style={styles.browseHeader}>
            <div>
              <h3 style={styles.browseTitle}>Warehouse Locations & Bins</h3>
              <p style={styles.browseSubtitle}>
                Select any bin to see its assigned inventory or print shelf labels.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {locations.length === 0 && (
                <button
                  type="button"
                  style={styles.secondaryActionBtn}
                  disabled={isInitializingDefaults}
                  onClick={handleInitializeDefaultLocations}
                >
                  {isInitializingDefaults ? 'Initializing...' : '⚡ Seed Default Bins'}
                </button>
              )}
              <button
                type="button"
                style={styles.primaryActionBtn}
                onClick={() => setShowNewLocModal(true)}
              >
                ＋ New Location
              </button>
            </div>
          </div>

          {locations.length === 0 ? (
            <div style={styles.noLocationsCard}>
              <h4>No storage locations set up yet</h4>
              <p>Initialize default warehouse aisles or create your own custom locations and bins.</p>
              <button
                type="button"
                style={styles.primaryActionBtn}
                onClick={handleInitializeDefaultLocations}
              >
                ⚡ Initialize Default Warehouse Locations
              </button>
            </div>
          ) : (
            <div style={styles.locationsList}>
              {locations.map((loc) => {
                const binList = extractBinNamesFromLocation(loc);
                return (
                  <div key={loc.id} style={styles.locationCard}>
                    <div style={styles.locCardTop}>
                      <div>
                        <h4 style={styles.locationName}>{loc.name || loc.id}</h4>
                        <span style={styles.binsCountText}>
                          {binList.length} Bins / Shelves
                        </span>
                      </div>
                      <button
                        type="button"
                        style={styles.printLocBtn}
                        onClick={() =>
                          setPrintModalData({
                            type: 'location',
                            title: `LOC: ${loc.name || loc.id}`,
                            subtitle: `${binList.length} Storage Bins`,
                            barcodeValue: formatLocationBarcodeString(loc.id),
                            qrValue: formatLocationQRString(loc.id),
                            tenantId,
                          })
                        }
                      >
                        🏷️ Print Loc Label
                      </button>
                    </div>

                    {/* Bins Grid */}
                    <div style={styles.binsGrid}>
                      {binList.map((binName, bIdx) => {
                        const partsInBin = parts.filter(
                          (p) =>
                            p.locationId === loc.id &&
                            p.binName?.toLowerCase() === binName.toLowerCase()
                        );
                        const totalUnits = partsInBin.reduce(
                          (acc, p) => acc + (p.quantity || 0),
                          0
                        );

                        return (
                          <div
                            key={bIdx}
                            style={styles.binTile}
                            onClick={() => {
                              setSelectedBin({ location: loc, binName });
                              setSelectedPart(null);
                              setActiveTab('scan_putaway');
                            }}
                          >
                            <div style={styles.binTileTop}>
                              <span style={styles.binTileName}>{binName}</span>
                              <button
                                type="button"
                                style={styles.binTilePrint}
                                title="Print this bin label"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintModalData({
                                    type: 'bin',
                                    title: `BIN: ${binName}`,
                                    subtitle: `Location: ${loc.name || loc.id}`,
                                    barcodeValue: formatBinBarcodeString(binName),
                                    qrValue: formatBinQRString(loc.id, binName),
                                    locationName: loc.name || loc.id,
                                    binName,
                                    tenantId,
                                  });
                                }}
                              >
                                🖨️
                              </button>
                            </div>

                            <div style={styles.binTileStats}>
                              <span>
                                {partsInBin.length} {partsInBin.length === 1 ? 'part' : 'parts'}
                              </span>
                              <span>{totalUnits} units</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Print Station Tab */}
      {activeTab === 'print_station' && (
        <div style={styles.tabContent}>
          <div style={styles.printStationCard}>
            <h3 style={styles.printStationTitle}>🖨️ Label Printing Station</h3>
            <p style={styles.printStationSubtitle}>
              Select any inventory part, warehouse bin, or storage location to preview and print Code128 barcodes and 2D QR labels.
            </p>

            <div style={styles.stationGrid}>
              {/* Print Part Label Section */}
              <div style={styles.stationCol}>
                <h4 style={styles.stationColTitle}>📦 Print Part / Material Labels</h4>
                <div style={styles.quickItemList}>
                  {parts.slice(0, 15).map((part) => (
                    <div key={part.id} style={styles.quickItemRow}>
                      <div>
                        <strong>{part.sku}</strong>
                        <div style={styles.quickItemSub}>{part.description}</div>
                      </div>
                      <button
                        type="button"
                        style={styles.quickPrintBtn}
                        onClick={() =>
                          setPrintModalData({
                            type: 'part',
                            title: part.sku || part.id,
                            subtitle: part.description,
                            barcodeValue: formatPartBarcodeString(part.sku || part.id),
                            qrValue: formatPartQRString(part.sku || part.id, part.id),
                            locationName: part.locationId,
                            binName: part.binName,
                            quantity: part.quantity,
                            parLevel: part.parLevel,
                            tenantId,
                          })
                        }
                      >
                        Print Label
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Bin Label Section */}
              <div style={styles.stationCol}>
                <h4 style={styles.stationColTitle}>🏷️ Print Shelf / Bin Labels</h4>
                <div style={styles.quickItemList}>
                  {locations.flatMap((loc) =>
                    extractBinNamesFromLocation(loc).map((binName, idx) => (
                      <div key={`${loc.id}-${idx}`} style={styles.quickItemRow}>
                        <div>
                          <strong>{binName}</strong>
                          <div style={styles.quickItemSub}>Location: {loc.name || loc.id}</div>
                        </div>
                        <button
                          type="button"
                          style={styles.quickPrintBtn}
                          onClick={() =>
                            setPrintModalData({
                              type: 'bin',
                              title: `BIN: ${binName}`,
                              subtitle: `Location: ${loc.name || loc.id}`,
                              barcodeValue: formatBinBarcodeString(binName),
                              qrValue: formatBinQRString(loc.id, binName),
                              locationName: loc.name || loc.id,
                              binName,
                              tenantId,
                            })
                          }
                        >
                          Print Label
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Barcode Print Modal */}
      {printModalData && (
        <BarcodePrintModal
          isOpen={Boolean(printModalData)}
          data={printModalData}
          onClose={() => setPrintModalData(null)}
        />
      )}

      {/* Quick Add Part Modal */}
      {showAddPartModal && (
        <QuickAddPartModal
          tenantId={tenantId}
          initialSku={unrecognizedCode}
          onPartCreated={(newPart: Part) => {
            setSelectedPart(newPart);
            setSelectedBin(null);
            setShowAddPartModal(false);
            setScanMessage(null);
          }}
          onClose={() => setShowAddPartModal(false)}
        />
      )}

      {/* New Location Modal */}
      {showNewLocModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowNewLocModal(false)}>
          <div style={styles.newLocModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0' }}>＋ Create Storage Location</h3>
            <form onSubmit={handleCreateNewLocation}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.modalLabel}>Location Name</label>
                <input
                  type="text"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Zone C - Mezzanine"
                  style={styles.modalInput}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.modalLabel}>Bins (Comma-separated)</label>
                <input
                  type="text"
                  value={newLocBins}
                  onChange={(e) => setNewLocBins(e.target.value)}
                  placeholder="e.g. C-101, C-102, C-103"
                  style={styles.modalInput}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setShowNewLocModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.primaryActionBtn}>
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  hubHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  hubTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  hubSubtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
  },
  subTabs: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    color: '#1d4ed8',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#92400e',
    fontSize: '0.875rem',
    flexWrap: 'wrap',
    gap: '8px',
  },
  alertActions: {
    display: 'flex',
    gap: '8px',
  },
  quickAddBtn: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  viewBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '10px 16px',
    color: '#1e40af',
    fontSize: '0.875rem',
    marginBottom: '12px',
  },
  clearSelectionBtn: {
    background: 'none',
    border: 'none',
    color: '#1e40af',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8125rem',
  },
  idleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  idleCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px 20px',
    textAlign: 'center',
    border: '1px dashed #cbd5e1',
  },
  idleIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '10px',
  },
  idleTitle: {
    margin: '0 0 6px 0',
    fontSize: '1.25rem',
    color: '#0f172a',
  },
  idleText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
    maxWidth: '480px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  unassignedListSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
  },
  unassignedHeader: {
    marginBottom: '14px',
  },
  unassignedTitle: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#0f172a',
  },
  unassignedSub: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  allAssignedNotice: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#15803d',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  unassignedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  unassignedItemCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  unassignedSku: {
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '0.9375rem',
  },
  unassignedDesc: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  unassignedFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
  },
  unassignedQty: {
    fontSize: '0.75rem',
    color: '#475569',
    fontWeight: 600,
  },
  putawayDirectBtn: {
    padding: '4px 8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  browseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: '#ffffff',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  browseTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  browseSubtitle: {
    margin: '2px 0 0 0',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  primaryActionBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryActionBtn: {
    padding: '8px 14px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  noLocationsCard: {
    backgroundColor: '#ffffff',
    padding: '40px 20px',
    textAlign: 'center',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  locationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid #e2e8f0',
  },
  locCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid #f1f5f9',
  },
  locationName: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#0f172a',
    fontWeight: 700,
  },
  binsCountText: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  printLocBtn: {
    padding: '4px 10px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    color: '#334155',
  },
  binsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
  },
  binTile: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  binTileTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  binTileName: {
    fontWeight: 700,
    fontSize: '0.9375rem',
    color: '#0f172a',
  },
  binTilePrint: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    fontSize: '0.8125rem',
  },
  binTileStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.6875rem',
    color: '#64748b',
  },
  printStationCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  printStationTitle: {
    margin: 0,
    fontSize: '1.375rem',
    fontWeight: 800,
    color: '#0f172a',
  },
  printStationSubtitle: {
    margin: '4px 0 20px 0',
    fontSize: '0.875rem',
    color: '#64748b',
  },
  stationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  stationCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stationColTitle: {
    margin: '0 0 6px 0',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
  },
  quickItemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '440px',
    overflowY: 'auto',
  },
  quickItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  quickItemSub: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  quickPrintBtn: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#0f172a',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  newLocModal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  },
  secondaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};
