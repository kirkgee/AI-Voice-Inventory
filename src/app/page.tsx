'use client';

import React, { useState } from 'react';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import RepairExecutionHub from '@/components/repair/RepairExecutionHub';
import WarehouseStockingHub from '@/components/stocking/WarehouseStockingHub';
import { APP_VERSION } from '@/version';

// TODO: Replace with real tenant ID from auth context
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';

type AppSection = 'repairs' | 'purchase_orders' | 'stocking_putaway';

export default function Home() {
  const [activeSection, setActiveSection] = useState<AppSection>('stocking_putaway');
  const [showPOForm, setShowPOForm] = useState(false);
  const [lastSavedPOId, setLastSavedPOId] = useState<string | null>(null);

  function handlePOSaved(poId: string) {
    setLastSavedPOId(poId);
    setShowPOForm(false);
  }

  return (
    <main style={styles.main}>
      {/* App Header & Navigation */}
      <header style={styles.header}>
        <div>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>AI Voice Inventory & Service Suite</h1>
            <span style={styles.versionBadge} title={`App Version ${APP_VERSION}`}>
              v{APP_VERSION}
            </span>
          </div>
          <p style={styles.subtitle}>
            Offline-first inventory management, multi-model repair execution & warehouse stocking
          </p>
        </div>
        <SyncStatusIndicator />
      </header>

      {/* Top Primary Navigation */}
      <nav style={styles.navBar}>
        <button
          type="button"
          onClick={() => setActiveSection('stocking_putaway')}
          style={{
            ...styles.navBtn,
            ...(activeSection === 'stocking_putaway' ? styles.navBtnActive : {}),
          }}
        >
          📥 Warehouse Stocking & Putaway
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('repairs')}
          style={{
            ...styles.navBtn,
            ...(activeSection === 'repairs' ? styles.navBtnActive : {}),
          }}
        >
          🛠️ Service & Repair Execution
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('purchase_orders')}
          style={{
            ...styles.navBtn,
            ...(activeSection === 'purchase_orders' ? styles.navBtnActive : {}),
          }}
        >
          📦 Purchase Orders & Inbound
        </button>
      </nav>

      {/* Main Content Area */}
      {activeSection === 'stocking_putaway' ? (
        <WarehouseStockingHub tenantId={TENANT_ID} />
      ) : activeSection === 'repairs' ? (
        <RepairExecutionHub tenantId={TENANT_ID} />
      ) : (
        <div style={{ marginTop: '24px' }}>
          {!showPOForm ? (
            <>
              <button
                onClick={() => setShowPOForm(true)}
                style={styles.primaryBtn}
              >
                ＋ New Purchase Order
              </button>

              {lastSavedPOId && (
                <div style={styles.successBanner}>
                  ✓ Purchase Order saved successfully (ID: {lastSavedPOId})
                </div>
              )}
            </>
          ) : (
            <PurchaseOrderForm
              tenantId={TENANT_ID}
              onSaved={handlePOSaved}
              onCancel={() => setShowPOForm(false)}
            />
          )}
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    padding: '16px',
    maxWidth: '1360px',
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  title: {
    margin: 0,
    fontSize: '1.625rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  versionBadge: {
    padding: '3px 9px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    letterSpacing: '0.02em',
    display: 'inline-flex',
    alignItems: 'center',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
  },
  navBar: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#e2e8f0',
    padding: '4px',
    borderRadius: '10px',
    width: 'fit-content',
    maxWidth: '100%',
    overflowX: 'auto',
    marginBottom: '16px',
    WebkitOverflowScrolling: 'touch',
  },
  navBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  navBtnActive: {
    backgroundColor: '#ffffff',
    color: '#1d4ed8',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  primaryBtn: {
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  successBanner: {
    marginTop: '16px',
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#15803d',
    fontSize: '0.875rem',
  },
};
