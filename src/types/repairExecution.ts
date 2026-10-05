export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface InventoryUsageItem {
  id: string;
  partId: string;
  sku: string;
  description: string;
  quantityUsed: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  deducted: boolean;
}

export interface LaborEntry {
  id: string;
  technicianName: string;
  role: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  date: string;
}

export interface ToolEntry {
  id: string;
  name: string;
  condition: 'good' | 'fair' | 'damaged' | 'missing';
  returned: boolean;
  notes?: string;
}

export type ChecklistStepStatus = 'pending' | 'passed' | 'failed' | 'na';

export interface ChecklistItemState {
  stepId: string;
  title: string;
  status: ChecklistStepStatus;
  notes?: string;
  completedBy?: string;
}

export interface RepairOrderCosts {
  partsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalFees: number;
  grandTotal: number;
}

export interface AssetDetails {
  identifier?: string; // Serial #, VIN, Asset Tag
  make?: string;
  model?: string;
  ownership?: 'client' | 'internal_fleet' | 'rental' | 'site';
  location?: string;
  notes?: string;
}

export interface RepairOrder {
  id: string;
  tenantId: string;
  orderNumber: string; // e.g. "WO-2026-001"
  jobConfigId: string; // Assigned JobModelConfig ID
  jobConfigName: string; // Snapshot of the configuration name
  crmPartnerId?: string; // Associated CRM Client / Customer ID
  crmPartnerName?: string; // Snapshot of the client / account name
  title: string;
  status: string; // Dynamic based on statusWorkflow
  priority: PriorityLevel;
  assignedTechnicianName?: string;

  // Modular sections
  asset?: AssetDetails;
  customFieldValues: Record<string, any>;
  inventoryUsed: InventoryUsageItem[];
  laborEntries: LaborEntry[];
  equipmentUsed: ToolEntry[];
  checklistResults: ChecklistItemState[];

  // Cost and stock tracking
  costs: RepairOrderCosts;
  stockDeducted: boolean;
  stockDeductedAt?: any;

  internalNotes?: string;
  clientSummary?: string;
  startDate?: string;
  completedDate?: string;
  createdAt?: any;
  updatedAt?: any;
}
