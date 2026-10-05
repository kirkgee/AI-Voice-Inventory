export type JobEnvironmentType =
  | 'electronics_depot'
  | 'heavy_equipment'
  | 'construction_roofing'
  | 'general_repair'
  | 'fleet_maintenance'
  | 'custom';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'date'
  | 'boolean'
  | 'textarea';

export interface CustomFieldDefinition {
  id: string;
  name: string; // key in data object
  label: string;
  type: CustomFieldType;
  required?: boolean;
  options?: string[]; // for select type
  defaultValue?: string | number | boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ChecklistStepDefinition {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  category?: string;
}

export interface LaborRoleDefinition {
  id: string;
  roleName: string;
  defaultHourlyRate: number;
}

export interface ToolRequirementDefinition {
  id: string;
  name: string;
  category?: string;
  required?: boolean;
}

export interface WorkflowStatusOption {
  id: string;
  label: string;
  color: string; // hex or badge color
  isFinal?: boolean;
}

export interface JobModelModulesConfig {
  assetTracking: {
    enabled: boolean;
    requireSerial?: boolean;
    requireModel?: boolean;
    ownershipTypes: ('client' | 'internal_fleet' | 'rental' | 'site')[];
  };
  inventoryConsumption: {
    enabled: boolean;
    autoDeductStock: boolean;
    allowCustomParts?: boolean;
    trackBatchLot?: boolean;
  };
  laborTracking: {
    enabled: boolean;
    roles: LaborRoleDefinition[];
    defaultHourlyRate?: number;
  };
  equipmentTracking: {
    enabled: boolean;
    defaultTools: ToolRequirementDefinition[];
  };
  qualityChecklist: {
    enabled: boolean;
    steps: ChecklistStepDefinition[];
  };
}

export interface JobModelConfig {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string;
  environmentType: JobEnvironmentType;
  targetAudience: string; // e.g. "Customer Electronics", "Leased Fleet Asset", "Site Job"
  isDefault?: boolean;
  isActive: boolean;
  modules: JobModelModulesConfig;
  customFields: CustomFieldDefinition[];
  statusWorkflow: WorkflowStatusOption[];
  createdAt?: any;
  updatedAt?: any;
}
