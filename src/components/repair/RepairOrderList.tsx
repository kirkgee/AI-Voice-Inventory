'use client';

import React, { useState } from 'react';
import { RepairOrder } from '@/types/repairExecution';
import { JobModelConfig } from '@/types/jobModels';
import { Partner } from '@/lib/dal/partners';

export interface RepairOrderListProps {
  orders: RepairOrder[];
  configurations: JobModelConfig[];
  partnersList: Partner[];
  onSelectOrder: (order: RepairOrder) => void;
  onNewOrder: (configId?: string) => void;
  onDeleteOrder: (orderId: string) => void;
}

export default function RepairOrderList({
  orders,
  configurations,
  partnersList,
  onSelectOrder,
  onNewOrder,
  onDeleteOrder,
}: RepairOrderListProps) {
  const [search, setSearch] = useState('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filtering
  const filteredOrders = orders.filter(order => {
    if (selectedConfigId !== 'all' && order.jobConfigId !== selectedConfigId) {
      return false;
    }
    if (selectedStatus !== 'all' && order.status !== selectedStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = order.orderNumber?.toLowerCase().includes(q);
      const matchTitle = order.title?.toLowerCase().includes(q);
      const matchClient = order.crmPartnerName?.toLowerCase().includes(q);
      const matchAsset = order.asset?.identifier?.toLowerCase().includes(q);
      const matchTech = order.assignedTechnicianName?.toLowerCase().includes(q);
      return matchNum || matchTitle || matchClient || matchAsset || matchTech;
    }
    return true;
  });

  // KPI Metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'released' || o.status === 'restocked').length;
  const inProgressOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'released' && o.status !== 'restocked').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.costs?.grandTotal || 0), 0);

  return (
    <div>
      {/* Top Action & Metrics Bar */}
      <div style={styles.metricsBar}>
        <div style={styles.metricCard}>
          <div style={styles.metricVal}>{inProgressOrders}</div>
          <div style={styles.metricLabel}>Active Executions</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#16a34a' }}>{completedOrders}</div>
          <div style={styles.metricLabel}>Completed / Closed</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricVal}>{totalOrders}</div>
          <div style={styles.metricLabel}>Total Work Orders</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#2563eb' }}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style={styles.metricLabel}>Total Value Tracked</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.controlsLeft}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search by WO#, title, client, serial #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />

          {/* Model Filter */}
          <select
            value={selectedConfigId}
            onChange={e => setSelectedConfigId(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Job Models ({configurations.length})</option>
            {configurations.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="intake">Intake / Received</option>
            <option value="in_progress">In Progress</option>
            <option value="diagnostic">Diagnostic</option>
            <option value="awaiting_parts">Awaiting Parts</option>
            <option value="qa_testing">QA Testing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Create Button with quick configuration dropdown */}
        <div style={styles.controlsRight}>
          <button
            type="button"
            onClick={() => onNewOrder(selectedConfigId !== 'all' ? selectedConfigId : undefined)}
            style={styles.newOrderBtn}
          >
            ＋ New Repair Execution
          </button>
        </div>
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div style={styles.emptyContainer}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛠️</div>
          <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Work Orders Found</h4>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.875rem' }}>
            {orders.length === 0
              ? 'Get started by creating your first repair or job execution order.'
              : 'No orders match your current search or filter criteria.'}
          </p>
          <button
            type="button"
            onClick={() => onNewOrder(selectedConfigId !== 'all' ? selectedConfigId : undefined)}
            style={styles.newOrderBtn}
          >
            ＋ Create New Work Order
          </button>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '14%' }}>Order #</th>
                <th style={{ ...styles.th, width: '22%' }}>Job Title / Scope</th>
                <th style={{ ...styles.th, width: '18%' }}>Job Model</th>
                <th style={{ ...styles.th, width: '16%' }}>CRM Client</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>Status</th>
                <th style={{ ...styles.th, width: '10%', textAlign: 'right' }}>Total ($)</th>
                <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const config = configurations.find(c => c.id === order.jobConfigId);
                const statusMeta = config?.statusWorkflow?.find(s => s.id === order.status);

                return (
                  <tr
                    key={order.id}
                    style={styles.tr}
                    onClick={() => onSelectOrder(order)}
                  >
                    <td style={styles.td}>
                      <span style={styles.orderNumber}>{order.orderNumber}</span>
                      <div style={styles.subText}>
                        {order.startDate || new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.orderTitle}>{order.title}</div>
                      {order.asset?.identifier && (
                        <div style={styles.assetBadge}>
                          🏷️ {order.asset.identifier}
                          {order.asset.model ? ` (${order.asset.model})` : ''}
                        </div>
                      )}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.configName}>{order.jobConfigName || config?.name || 'Custom Model'}</div>
                      <div style={styles.environmentPill}>
                        {config?.environmentType?.replace('_', ' ') || 'standard'}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.clientName}>
                        {order.crmPartnerName || 'Internal / Unassigned'}
                      </div>
                      {order.assignedTechnicianName && (
                        <div style={styles.techText}>
                          👤 {order.assignedTechnicianName}
                        </div>
                      )}
                    </td>

                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusMeta?.color ? `${statusMeta.color}15` : '#f1f5f9',
                          color: statusMeta?.color || '#334155',
                          borderColor: statusMeta?.color ? `${statusMeta.color}40` : '#cbd5e1',
                        }}
                      >
                        {statusMeta?.label || order.status}
                      </span>
                      {order.stockDeducted && (
                        <div style={styles.deductedDot}>✓ Stock Deducted</div>
                      )}
                    </td>

                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      ${(order.costs?.grandTotal || 0).toFixed(2)}
                    </td>

                    <td
                      style={{ ...styles.td, textAlign: 'center' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        style={styles.deleteBtn}
                        title="Delete order"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  metricsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  metricVal: {
    fontSize: '1.625rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginTop: '4px',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  controlsLeft: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    flex: 1,
  },
  controlsRight: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    padding: '8px 14px',
    fontSize: '0.875rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    minWidth: '260px',
    boxSizing: 'border-box',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '0.875rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
  },
  newOrderBtn: {
    padding: '9px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflowX: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  theadRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '12px 14px',
    fontWeight: 600,
    color: '#475569',
    fontSize: '0.8125rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  orderNumber: {
    fontWeight: 700,
    color: '#1d4ed8',
    fontSize: '0.9rem',
  },
  subText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  orderTitle: {
    fontWeight: 600,
    color: '#0f172a',
    fontSize: '0.9rem',
  },
  assetBadge: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '3px',
  },
  configName: {
    fontWeight: 500,
    color: '#1e293b',
    fontSize: '0.875rem',
  },
  environmentPill: {
    display: 'inline-block',
    fontSize: '0.7rem',
    color: '#64748b',
    textTransform: 'capitalize',
    backgroundColor: '#f1f5f9',
    padding: '1px 6px',
    borderRadius: '4px',
    marginTop: '2px',
  },
  clientName: {
    fontWeight: 500,
    color: '#1e293b',
  },
  techText: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  deductedDot: {
    fontSize: '0.7rem',
    color: '#15803d',
    fontWeight: 500,
    marginTop: '3px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px 8px',
    borderRadius: '4px',
    opacity: 0.6,
  },
};
