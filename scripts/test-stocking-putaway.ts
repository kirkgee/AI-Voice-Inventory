/**
 * Comprehensive verification script for the Warehouse Stocking & Putaway System
 */

import {
  formatPartBarcodeString,
  formatPartQRString,
  formatBinBarcodeString,
  formatBinQRString,
  formatLocationBarcodeString,
  formatLocationQRString,
  extractBinNamesFromLocation,
  resolveScanCode,
} from '../src/lib/stocking/barcodeUtils';
import { calculatePartMetrics } from '../src/lib/stocking/inventoryMetrics';
import { Part } from '../src/lib/dal/parts';
import { Location } from '../src/lib/dal/locations';
import { PurchaseOrder } from '../src/lib/dal/purchaseOrders';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runTests() {
  console.log('\n--- 1. Testing Barcode & QR Code String Formatters ---');

  const partSku = 'RES-10K-0805';
  assert(formatPartBarcodeString(partSku) === 'RES-10K-0805', 'Part barcode string formats cleanly');
  assert(formatPartQRString(partSku) === 'PART:RES-10K-0805', 'Part QR string prepends PART prefix');

  const binName = 'A-102';
  assert(formatBinBarcodeString(binName) === 'BIN-A-102', 'Bin barcode replaces special characters with dashes');
  assert(formatBinQRString('loc-main', binName) === 'BIN:loc-main:A-102', 'Bin QR string encodes location and bin');

  const locId = 'loc-main';
  assert(formatLocationBarcodeString(locId) === 'LOC-loc-main', 'Location barcode format clean');
  assert(formatLocationQRString(locId) === 'LOC:loc-main', 'Location QR string format clean');

  console.log('\n--- 2. Testing Location Bin Name Extraction ---');

  const sampleLoc: Location = {
    id: 'loc-1',
    tenantId: 'test-tenant',
    name: 'Main Warehouse',
    bins: ['Bin A-1', 'Bin A-2', { name: 'Bin B-1' }],
  };

  const binNames = extractBinNamesFromLocation(sampleLoc);
  assert(binNames.length === 3, `Expected 3 bin names, got ${binNames.length}`);
  assert(binNames.includes('Bin A-1'), 'Includes string bin A-1');
  assert(binNames.includes('Bin A-2'), 'Includes string bin A-2');
  assert(binNames.includes('Bin B-1'), 'Includes object bin B-1');

  console.log('\n--- 3. Testing Barcode & QR Resolution Engine ---');

  const mockParts: Part[] = [
    {
      id: 'part-001',
      tenantId: 'test-tenant',
      sku: 'CAP-100UF-50V',
      description: '100uF 50V Electrolytic Capacitor',
      quantity: 45,
      parLevel: 20,
      locationId: 'loc-1',
      binName: 'Bin A-1',
    },
    {
      id: 'part-002',
      tenantId: 'test-tenant',
      sku: 'MCU-STM32F4',
      description: 'STM32F4 Cortex-M4 Microcontroller',
      quantity: 5,
      parLevel: 25,
      locationId: 'loc-1',
      binName: 'Bin A-2',
    },
    {
      id: 'part-003',
      tenantId: 'test-tenant',
      sku: 'WIR-AWG22-RED',
      description: '22 AWG Solid Hookup Wire Red',
      quantity: 0,
      parLevel: 10,
    },
  ];

  const mockLocations: Location[] = [
    sampleLoc,
    {
      id: 'loc-staging',
      tenantId: 'test-tenant',
      name: 'Receiving Dock',
      bins: ['Dock-Bay-1', 'Dock-Bay-2'],
    },
  ];

  // Test scan: Exact Part SKU
  const res1 = resolveScanCode('CAP-100UF-50V', mockParts, mockLocations);
  assert(res1.type === 'part', 'Resolved plain SKU as part');
  assert(res1.matchedPart?.id === 'part-001', 'Matched correct part by SKU');

  // Test scan: Part QR with PART: prefix
  const res2 = resolveScanCode('PART:MCU-STM32F4', mockParts, mockLocations);
  assert(res2.type === 'part', 'Resolved PART: prefixed scan as part');
  assert(res2.matchedPart?.id === 'part-002', 'Matched correct part MCU-STM32F4');

  // Test scan: Exact Bin name
  const res3 = resolveScanCode('Bin A-1', mockParts, mockLocations);
  assert(res3.type === 'bin', 'Resolved Bin A-1 as bin');
  assert(res3.matchedBin?.binName === 'Bin A-1', 'Matched bin name Bin A-1');
  assert(res3.partsInBin?.length === 1, 'Found 1 part inside Bin A-1');
  assert(res3.partsInBin?.[0].sku === 'CAP-100UF-50V', 'Matched part inside bin correctly');

  // Test scan: Formatted Bin QR code
  const res4 = resolveScanCode('BIN:loc-staging:Dock-Bay-1', mockParts, mockLocations);
  assert(res4.type === 'bin', 'Resolved BIN:loc:bin code as bin');
  assert(res4.matchedLocation?.id === 'loc-staging', 'Matched location loc-staging');
  assert(res4.matchedBin?.binName === 'Dock-Bay-1', 'Matched bin Dock-Bay-1');

  // Test scan: Formatted Location code
  const res5 = resolveScanCode('LOC:loc-1', mockParts, mockLocations);
  assert(res5.type === 'location', 'Resolved LOC: prefix as location');
  assert(res5.matchedLocation?.id === 'loc-1', 'Matched location loc-1');

  // Test scan: Unknown code
  const res6 = resolveScanCode('UNKNOWN-CODE-999', mockParts, mockLocations);
  assert(res6.type === 'unknown', 'Unknown code identified as unknown');
  assert(res6.rawInput === 'UNKNOWN-CODE-999', 'Preserved raw input');

  console.log('\n--- 4. Testing Inventory Metrics & Quantity On-Order Calculations ---');

  const mockPOs: PurchaseOrder[] = [
    {
      id: 'PO-1001',
      tenantId: 'test-tenant',
      status: 'ordered',
      supplier: 'DigiKey',
      expectedDeliveryDate: '2026-10-25',
      items: [
        {
          partId: 'part-002',
          sku: 'MCU-STM32F4',
          description: 'STM32F4',
          quantity: 50,
          unitPrice: 8.5,
        },
        {
          partId: 'part-003',
          sku: 'WIR-AWG22-RED',
          description: 'Wire',
          quantity: 200,
          unitPrice: 0.15,
        },
      ],
    },
    {
      id: 'PO-1002',
      tenantId: 'test-tenant',
      status: 'shipped',
      supplier: 'Mouser',
      expectedDeliveryDate: '2026-10-18',
      items: [
        {
          partId: 'part-002',
          sku: 'MCU-STM32F4',
          description: 'STM32F4',
          quantity: 25,
          unitPrice: 8.4,
        },
      ],
    },
    {
      id: 'PO-1003',
      tenantId: 'test-tenant',
      status: 'completed', // Should be ignored since already received/completed
      supplier: 'Arrow',
      items: [
        {
          partId: 'part-002',
          sku: 'MCU-STM32F4',
          description: 'STM32F4',
          quantity: 100,
          unitPrice: 8.2,
        },
      ],
    },
  ];

  // Part 1: Healthy stock, 0 on order
  const metricsPart1 = calculatePartMetrics(mockParts[0], mockPOs);
  assert(metricsPart1.quantityInStock === 45, 'Part 1 quantity in stock is 45');
  assert(metricsPart1.parLevel === 20, 'Part 1 par level is 20');
  assert(metricsPart1.quantityOnOrder === 0, 'Part 1 has 0 on order');
  assert(metricsPart1.stockHealth === 'healthy', 'Part 1 health is healthy');
  assert(metricsPart1.parDeficit === 0, 'Part 1 par deficit is 0');

  // Part 2: Low stock (5 on hand <= 25 par), has 75 on order across 2 active POs (50 + 25)
  const metricsPart2 = calculatePartMetrics(mockParts[1], mockPOs);
  assert(metricsPart2.quantityInStock === 5, 'Part 2 quantity in stock is 5');
  assert(metricsPart2.parLevel === 25, 'Part 2 par level is 25');
  assert(metricsPart2.quantityOnOrder === 75, `Expected 75 on order, got ${metricsPart2.quantityOnOrder}`);
  assert(metricsPart2.activePOs.length === 2, 'Found 2 active purchase orders');
  assert(metricsPart2.parDeficit === 20, 'Part 2 par deficit is 20');
  assert(metricsPart2.netAvailable === 80, 'Part 2 net available is 80 (5 + 75)');
  assert(metricsPart2.stockHealth === 'low_stock', 'Part 2 health is low_stock');

  // Part 3: 0 in stock, has 200 on order -> backordered
  const metricsPart3 = calculatePartMetrics(mockParts[2], mockPOs);
  assert(metricsPart3.quantityInStock === 0, 'Part 3 quantity in stock is 0');
  assert(metricsPart3.quantityOnOrder === 200, 'Part 3 quantity on order is 200');
  assert(metricsPart3.stockHealth === 'backordered', 'Part 3 health is backordered');

  console.log('\n--- 5. Testing Putaway Logic & Association Updates ---');

  // Simulate putaway update: move part-003 into sampleLoc Bin A-1
  const putawayTargetLoc = sampleLoc.id;
  const putawayTargetBin = 'Bin A-1';
  const updatedPart3: Part = {
    ...mockParts[2],
    locationId: putawayTargetLoc,
    binName: putawayTargetBin,
    quantity: 25, // added stock
  };

  const updatedPartsList = [mockParts[0], mockParts[1], updatedPart3];
  const postPutawayResolution = resolveScanCode('Bin A-1', updatedPartsList, mockLocations);
  assert(postPutawayResolution.partsInBin?.length === 2, 'Bin A-1 now contains 2 parts after putaway');
  assert(
    Boolean(postPutawayResolution.partsInBin?.some(p => p.id === 'part-003')),
    'Bin A-1 now contains part-003'
  );

  console.log('\n🎉 ALL STOCKING & PUTAWAY TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
