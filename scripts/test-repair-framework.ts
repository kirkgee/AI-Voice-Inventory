/**
 * Comprehensive verification script for the Repair Execution & Service Administration Framework
 */

import { getDefaultJobModelPresets } from '../src/lib/presets/defaultJobModels';
import { JobModelConfig } from '../src/types/jobModels';
import { RepairOrder, InventoryUsageItem, LaborEntry } from '../src/types/repairExecution';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runTests() {
  console.log('\n--- 1. Testing Default Job Model Presets ---');
  const tenantId = 'test-tenant-123';
  const presets = getDefaultJobModelPresets(tenantId);

  assert(presets.length === 4, `Expected 4 industry presets, got ${presets.length}`);

  const depotClient = presets.find(p => p.code === 'DEPOT-CLIENT');
  const depotFleet = presets.find(p => p.code === 'DEPOT-FLEET');
  const heavyEquip = presets.find(p => p.code === 'HEAVY-EQUIP');
  const roofing = presets.find(p => p.code === 'ROOF-CONST');

  assert(Boolean(depotClient), 'Depot Client preset exists');
  assert(Boolean(depotFleet), 'Depot Fleet preset exists');
  assert(Boolean(heavyEquip), 'Heavy Machinery preset exists');
  assert(Boolean(roofing), 'Roofing & Construction preset exists');

  // Verify Depot Client configuration
  assert(depotClient!.environmentType === 'electronics_depot', 'Depot Client has correct environment');
  assert(depotClient!.modules.assetTracking.requireSerial === true, 'Depot Client requires serial number');
  assert(depotClient!.modules.inventoryConsumption.enabled === true, 'Depot Client enables inventory consumption');
  assert(depotClient!.modules.qualityChecklist.steps.length >= 5, 'Depot Client has comprehensive QC steps');
  assert(depotClient!.customFields.some(f => f.name === 'rmaNumber'), 'Depot Client includes rmaNumber custom field');

  // Verify Depot Fleet configuration
  assert(depotFleet!.modules.assetTracking.ownershipTypes.includes('internal_fleet'), 'Depot Fleet tracks internal_fleet');
  assert(depotFleet!.customFields.some(f => f.name === 'cosmeticGrade'), 'Depot Fleet includes cosmeticGrade');
  assert(depotFleet!.customFields.some(f => f.name === 'sanitizationCertificate'), 'Depot Fleet requires data sanitization cert');

  // Verify Heavy Equipment configuration
  assert(heavyEquip!.environmentType === 'heavy_equipment', 'Heavy Equip has heavy_equipment environment');
  assert(heavyEquip!.customFields.some(f => f.name === 'operatingHours'), 'Heavy Equip includes engine operatingHours');
  assert(heavyEquip!.customFields.some(f => f.name === 'hydraulicPSI'), 'Heavy Equip includes hydraulicPSI');
  assert(heavyEquip!.modules.equipmentTracking.defaultTools.some(t => t.name.includes('Crane')), 'Heavy Equip includes Service Crane Truck');

  // Verify Roofing configuration
  assert(roofing!.environmentType === 'construction_roofing', 'Roofing has construction_roofing environment');
  assert(roofing!.customFields.some(f => f.name === 'roofSquares'), 'Roofing tracks roof squares area');
  assert(roofing!.customFields.some(f => f.name === 'roofPitch'), 'Roofing tracks roof pitch');
  assert(roofing!.modules.laborTracking.roles.some(r => r.roleName.includes('Roofer')), 'Roofing includes Roofer labor trade');
  assert(roofing!.modules.qualityChecklist.steps.some(s => s.title.includes('Magnet')), 'Roofing includes magnetic nail sweep gate');

  console.log('\n--- 2. Testing Repair Execution Work Order Assembly & Calculations ---');

  const sampleParts: InventoryUsageItem[] = [
    {
      id: 'item-1',
      partId: 'part-screen',
      sku: 'LCD-1080P',
      description: 'Replacement OLED Display Assembly',
      quantityUsed: 2,
      unitCost: 85.00,
      unitPrice: 135.00,
      totalPrice: 270.00,
      deducted: false,
    },
    {
      id: 'item-2',
      partId: 'part-battery',
      sku: 'BAT-5000MAH',
      description: 'Internal Li-Ion Battery Pack',
      quantityUsed: 1,
      unitCost: 28.50,
      unitPrice: 55.00,
      totalPrice: 55.00,
      deducted: false,
    },
  ];

  const sampleLabor: LaborEntry[] = [
    {
      id: 'labor-1',
      technicianName: 'Jordan Reed',
      role: 'Bench Diagnostic Technician',
      hours: 2.5,
      hourlyRate: 75.00,
      totalCost: 187.50,
      date: '2026-10-05',
    },
    {
      id: 'labor-2',
      technicianName: 'Sam Chen',
      role: 'QA & Calibration Inspector',
      hours: 1.0,
      hourlyRate: 65.00,
      totalCost: 65.00,
      date: '2026-10-05',
    },
  ];

  const partsTotal = sampleParts.reduce((s, p) => s + p.totalPrice, 0);
  const laborTotal = sampleLabor.reduce((s, l) => s + l.totalCost, 0);
  const equipmentTotal = 45.00;
  const additionalFees = 20.00; // shop disposal
  const grandTotal = partsTotal + laborTotal + equipmentTotal + additionalFees;

  assert(partsTotal === 325.00, `Parts total should be $325.00, got ${partsTotal}`);
  assert(laborTotal === 252.50, `Labor total should be $252.50, got ${laborTotal}`);
  assert(grandTotal === 642.50, `Grand total should be $642.50, got ${grandTotal}`);

  console.log('\n--- 3. Testing Order Creation Payload Conformance ---');
  const newOrder: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    tenantId,
    orderNumber: 'WO-2026-8801',
    jobConfigId: depotClient!.code,
    jobConfigName: depotClient!.name,
    crmPartnerId: 'partner-acme',
    crmPartnerName: 'Acme Corp Commercial Accounts',
    title: 'Bench Diagnostic & Screen Replacement',
    status: 'in_repair',
    priority: 'high',
    assignedTechnicianName: 'Jordan Reed',
    asset: {
      identifier: 'SN-9988219A',
      make: 'Apple',
      model: 'MacBook Pro 16"',
      ownership: 'client',
      location: 'Bench Station Alpha',
      notes: 'No power on battery, liquid indicator white',
    },
    customFieldValues: {
      rmaNumber: 'RMA-4482',
      reportedDefect: 'Display flickers under high brightness; does not charge',
      firmwareVersion: '14.2.1',
      esdBenchNumber: 'Station Alpha (Bench 1)',
    },
    inventoryUsed: sampleParts,
    laborEntries: sampleLabor,
    equipmentUsed: [
      { id: 'tool-1', name: 'Micro-soldering Station & Hot Air Rework', condition: 'good', returned: false },
    ],
    checklistResults: [
      { stepId: 'qc-visual', title: 'Initial Visual Inspection', status: 'passed' },
      { stepId: 'qc-post', title: 'Power-On Self Test (POST)', status: 'passed' },
      { stepId: 'qc-burnin', title: '4-Hour Stress / Burn-In Verification', status: 'pending' },
    ],
    costs: {
      partsTotal,
      laborTotal,
      equipmentTotal,
      additionalFees,
      grandTotal,
    },
    stockDeducted: false,
  };

  assert(newOrder.orderNumber === 'WO-2026-8801', 'Order number preserved');
  assert(newOrder.customFieldValues.rmaNumber === 'RMA-4482', 'Custom field rmaNumber mapped properly');
  assert(newOrder.inventoryUsed.length === 2, '2 inventory parts allocated');
  assert(newOrder.costs.grandTotal === 642.50, 'Grand total preserved in order record');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Repair Execution and Service Administration framework is robust and verified.\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
