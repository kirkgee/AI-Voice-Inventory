'use client';

import React, { useState } from 'react';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import RepairExecutionHub from '@/components/repair/RepairExecutionHub';

// TODO: Replace with real tenant ID from auth context
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';

type AppSection = 'repairs' | 'purchase_orders';

export default function Home() {
  const [activeSection, setActiveSection] = useState<AppSection>('repairs');
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
          <h1 style={styles.title}>AI Voice Inventory & Service Suite</h1>
          <p style={styles.subtitle}>
            Offline-first inventory management, multi-model repair execution & service administration
          </p>
        </div>
        <SyncStatusIndicator />
      </header>

      {/* Top Primary Navigation */}
      <nav style={styles.navBar}>
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
      {activeSection === 'repairs' ? (
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
    padding: '24px',
    maxWidth: '1360px',
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
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
  title: {
    margin: '0 0 4px 0',
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.9375rem',
    color: '#64748b',
  },
  navBar: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#e2e8f0',
    padding: '4px',
    borderRadius: '10px',
    width: 'fit-content',
    marginBottom: '8px',
  },
  navBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
