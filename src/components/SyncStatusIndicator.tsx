'use client';

import React, { useState, useEffect } from 'react';
import { useConnectivity } from '../hooks/useConnectivity';

export interface SyncStatusIndicatorProps {
  compact?: boolean;
}

function getRelativeTimeString(date: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return date.toLocaleDateString();
}

/**
 * A UI widget displaying current connectivity and sync status.
 */
export default function SyncStatusIndicator({ compact = false }: SyncStatusIndicatorProps) {
  const { isOnline, isOffline, isDegraded, pendingWrites, lastOnlineAt } = useConnectivity();
  const [expanded, setExpanded] = useState(false);
  const [timeStr, setTimeStr] = useState(getRelativeTimeString(lastOnlineAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getRelativeTimeString(lastOnlineAt));
    }, 10000);
    return () => clearInterval(timer);
  }, [lastOnlineAt]);

  let statusColor = '#22c55e'; // green
  let statusText = 'Synced';

  if (isOffline) {
    statusColor = '#ef4444'; // red
    statusText = 'Offline';
  } else if (isDegraded) {
    statusColor = '#eab308'; // yellow
    statusText = 'Slow Connection';
  } else if (pendingWrites > 0) {
    statusColor = '#f59e0b'; // amber
    statusText = `Syncing... (${pendingWrites})`;
  }

  const containerStyle: React.CSSProperties = compact
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 12px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(0,0,0,0.1)',
        cursor: 'pointer',
        fontSize: '0.875rem'
      }
    : {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        zIndex: 50,
        transition: 'all 0.3s ease'
      };

  const dotStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: statusColor,
    display: 'inline-block',
    transition: 'background-color 0.3s ease'
  };

  const textStyle: React.CSSProperties = {
    color: '#374151',
    fontWeight: 500,
    margin: 0
  };

  const detailsStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '4px',
    display: expanded && !compact ? 'block' : 'none',
    textAlign: 'right',
    width: '100%'
  };

  return (
    <div 
      style={containerStyle} 
      onClick={() => setExpanded(!expanded)}
      title="Click for details"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={dotStyle}></span>
        <span style={textStyle}>{statusText}</span>
      </div>
      
      {!compact && (
        <div style={detailsStyle}>
          Last synced: {timeStr}
          {pendingWrites > 0 && <div>Pending operations: {pendingWrites}</div>}
        </div>
      )}
    </div>
  );
}
