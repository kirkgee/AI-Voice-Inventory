'use client';

import React, { useState } from 'react';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import PurchaseOrderForm from '@/components/PurchaseOrderForm';

// TODO: Replace with real tenant ID from auth context
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';

export default function Home() {
  const [showPOForm, setShowPOForm] = useState(false);
  const [lastSavedPOId, setLastSavedPOId] = useState<string | null>(null);

  function handlePOSaved(poId: string) {
    setLastSavedPOId(poId);
    setShowPOForm(false);
  }

  return (
    <main style={{ padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1>AI Voice Inventory</h1>
      <p>Offline-first inventory management</p>
      <SyncStatusIndicator />

      <div style={{ marginTop: '24px' }}>
        {!showPOForm ? (
          <>
            <button
              onClick={() => setShowPOForm(true)}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ＋ New Purchase Order
            </button>

            {lastSavedPOId && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  color: '#15803d',
                  fontSize: '0.875rem',
                }}
              >
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
    </main>
  );
}
