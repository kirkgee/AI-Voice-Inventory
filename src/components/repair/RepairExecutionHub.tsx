'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JobModelConfig } from '@/types/jobModels';
import { RepairOrder } from '@/types/repairExecution';
import { Part, subscribeAll as subscribeParts } from '@/lib/dal/parts';
import { Partner, subscribeAll as subscribePartners } from '@/lib/dal/partners';
import {
  subscribeAll as subscribeJobConfigs,
  getAll as getAllJobConfigs,
} from '@/lib/dal/jobConfigurations';
import {
  subscribeAll as subscribeOrders,
  deleteOrder,
} from '@/lib/dal/repairOrders';

import RepairOrderList from './RepairOrderList';
import JobModelList from './JobModelList';
import JobExecutionForm from './JobExecutionForm';
import JobModelConfigurator from './JobModelConfigurator';

export interface RepairExecutionHubProps {
  tenantId: string;
}

type TabType = 'executions' | 'admin_models';
type ViewMode = 'list' | 'execution_form' | 'config_form';

export default function RepairExecutionHub({ tenantId }: RepairExecutionHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('executions');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Selected items for editing
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<JobModelConfig | null>(null);
  const [preselectedConfigId, setPreselectedConfigId] = useState<string | undefined>(undefined);

  // Live state
  const [configurations, setConfigurations] = useState<JobModelConfig[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Success alert
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  function triggerFlash(msg: string) {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(null), 6000);
  }

  // Subscribe to real-time collections
  useEffect(() => {
    setLoading(true);

    const unsubConfigs = subscribeJobConfigs(tenantId, configs => {
      setConfigurations(configs);
    });

    const unsubOrders = subscribeOrders(tenantId, ords => {
      setOrders(ords);
      setLoading(false);
    });

    const unsubParts = subscribeParts(tenantId, pList => {
      setParts(pList);
    });

    const unsubPartners = subscribePartners(tenantId, partList => {
      setPartners(partList);
    });

    return () => {
      unsubConfigs();
      unsubOrders();
      unsubParts();
      unsubPartners();
    };
  }, [tenantId]);

  const reloadConfigs = useCallback(async () => {
    const list = await getAllJobConfigs(tenantId);
    setConfigurations(list);
  }, [tenantId]);

  // Handlers for work orders
  function handleOpenNewOrder(configId?: string) {
    setSelectedOrder(null);
    setPreselectedConfigId(configId);
    setViewMode('execution_form');
  }

  function handleSelectOrder(order: RepairOrder) {
    setSelectedOrder(order);
    setViewMode('execution_form');
  }

  async function handleDeleteOrder(orderId: string) {
    try {
      await deleteOrder(tenantId, orderId);
      triggerFlash('Work order deleted successfully.');
    } catch (e: any) {
      alert(`Error deleting order: ${e.message}`);
    }
  }

  function handleOrderSaved(orderId: string) {
    setViewMode('list');
    setSelectedOrder(null);
    triggerFlash(`✓ Work Order saved successfully (Ref ID: ${orderId})`);
  }

  // Handlers for configs
  function handleOpenNewConfig() {
    setSelectedConfig(null);
    setViewMode('config_form');
  }

  function handleSelectConfig(config: JobModelConfig) {
    setSelectedConfig(config);
    setViewMode('config_form');
  }

  function handleLaunchExecutionWithConfig(configId: string) {
    setActiveTab('executions');
    setSelectedOrder(null);
    setPreselectedConfigId(configId);
    setViewMode('execution_form');
  }

  function handleConfigSaved(configId: string) {
    setViewMode('list');
    setSelectedConfig(null);
    triggerFlash(`✓ Job Model Configuration updated successfully (ID: ${configId})`);
  }

  return (
    <div style={styles.hubContainer}>
      {/* Top Banner & Tab Navigation */}
      <div style={styles.hubHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>🛠️</div>
          <div>
            <h2 style={styles.hubTitle}>Service & Repair Execution System</h2>
            <p style={styles.hubSubtitle}>
              Modular service administration, multi-model job workflows, and real-time inventory allocation
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        {viewMode === 'list' && (
          <div style={styles.tabBar}>
            <button
              type="button"
              onClick={() => setActiveTab('executions')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'executions' ? styles.tabBtnActive : {}),
              }}
            >
              📋 Active Work Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin_models')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'admin_models' ? styles.tabBtnActive : {}),
              }}
            >
              ⚙️ Service Administration: Job Models ({configurations.length})
            </button>
          </div>
        )}
      </div>

      {/* Flash Notice */}
      {flashMessage && (
        <div style={styles.flashAlert}>
          {flashMessage}
        </div>
      )}

      {/* Main Content Router */}
      {viewMode === 'execution_form' ? (
        <JobExecutionForm
          tenantId={tenantId}
          configurations={configurations}
          selectedConfigId={preselectedConfigId}
          existingOrder={selectedOrder}
          partsList={parts}
          partnersList={partners}
          onPartCreated={newPart => setParts(prev => [...prev, newPart])}
          onSaved={handleOrderSaved}
          onCancel={() => {
            setViewMode('list');
            setSelectedOrder(null);
          }}
        />
      ) : viewMode === 'config_form' ? (
        <JobModelConfigurator
          tenantId={tenantId}
          existingConfig={selectedConfig}
          onSaved={handleConfigSaved}
          onCancel={() => {
            setViewMode('list');
            setSelectedConfig(null);
          }}
        />
      ) : activeTab === 'executions' ? (
        <RepairOrderList
          orders={orders}
          configurations={configurations}
          partnersList={partners}
          onSelectOrder={handleSelectOrder}
          onNewOrder={handleOpenNewOrder}
          onDeleteOrder={handleDeleteOrder}
        />
      ) : (
        <JobModelList
          tenantId={tenantId}
          configurations={configurations}
          onSelectConfig={handleSelectConfig}
          onNewConfig={handleOpenNewConfig}
          onLaunchExecutionWithConfig={handleLaunchExecutionWithConfig}
          onReload={reloadConfigs}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hubContainer: {
    marginTop: '20px',
  },
  hubHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoBadge: {
    fontSize: '2rem',
    backgroundColor: '#eff6ff',
    padding: '10px 14px',
    borderRadius: '10px',
  },
  hubTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  hubSubtitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#64748b',
  },
  tabBar: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    gap: '4px',
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  flashAlert: {
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#15803d',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '20px',
  },
};
