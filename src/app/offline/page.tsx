'use client';

import React from 'react';

export default function OfflinePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: '20px', color: '#9ca3af' }}
      >
        <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3M1 1l22 22"></path>
      </svg>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#111827' }}>You're offline</h1>
      <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '24px', maxWidth: '400px' }}>
        Don't worry — your data is saved locally. The app will reconnect automatically.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ backgroundColor: '#1e40af', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
      >
        Try Again
      </button>
    </div>
  );
}
