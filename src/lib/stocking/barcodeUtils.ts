import { Part } from '@/lib/dal/parts';
import { Location } from '@/lib/dal/locations';

export type ScanResultType = 'part' | 'bin' | 'location' | 'unknown';

export interface BinReference {
  location: Location;
  binName: string;
}

export interface ScanResolution {
  type: ScanResultType;
  rawInput: string;
  matchedPart?: Part;
  matchedLocation?: Location;
  matchedBin?: BinReference;
  partsInBin?: Part[];
  multipleMatches?: {
    parts?: Part[];
    bins?: BinReference[];
    locations?: Location[];
  };
}

/**
 * Standardized barcode and QR string formatters
 */
export function formatPartBarcodeString(sku: string): string {
  return sku.trim();
}

export function formatPartQRString(sku: string, id?: string): string {
  return `PART:${sku.trim()}`;
}

export function formatBinBarcodeString(binName: string): string {
  // Replace slashes or colons with dashes for clean 1D barcode compatibility
  const clean = binName.trim().replace(/[:\/]/g, '-');
  return `BIN-${clean}`;
}

export function formatBinQRString(locationId: string, binName: string): string {
  return `BIN:${locationId.trim()}:${binName.trim()}`;
}

export function formatLocationBarcodeString(locationId: string): string {
  const clean = locationId.trim().replace(/[:\/]/g, '-');
  return `LOC-${clean}`;
}

export function formatLocationQRString(locationId: string): string {
  return `LOC:${locationId.trim()}`;
}

/**
 * Extract bin name list safely from a Location object
 */
export function extractBinNamesFromLocation(location: Location): string[] {
  if (!location.bins || !Array.isArray(location.bins)) {
    return [];
  }
  return location.bins.map(bin => {
    if (typeof bin === 'string') return bin.trim();
    if (typeof bin === 'object' && bin !== null && bin.name) return String(bin.name).trim();
    return String(bin).trim();
  }).filter(Boolean);
}

/**
 * Resolves any raw scanned code or typed query against tenant parts & locations
 */
export function resolveScanCode(
  rawInput: string,
  parts: Part[],
  locations: Location[]
): ScanResolution {
  const cleaned = rawInput.trim();
  if (!cleaned) {
    return { type: 'unknown', rawInput: cleaned };
  }

  // Check if payload is a JSON string (e.g. from custom QR code)
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.type === 'part' && (parsed.sku || parsed.id)) {
        const found = parts.find(p => 
          (parsed.id && p.id === parsed.id) ||
          (parsed.sku && p.sku?.toLowerCase() === String(parsed.sku).toLowerCase())
        );
        if (found) {
          return { type: 'part', rawInput: cleaned, matchedPart: found };
        }
      }
      if (parsed.type === 'bin' && parsed.binName) {
        const loc = locations.find(l => l.id === parsed.locationId) || locations[0];
        if (loc) {
          const partsInBin = parts.filter(p => 
            p.locationId === loc.id && 
            p.binName?.toLowerCase() === String(parsed.binName).toLowerCase()
          );
          return {
            type: 'bin',
            rawInput: cleaned,
            matchedLocation: loc,
            matchedBin: { location: loc, binName: String(parsed.binName) },
            partsInBin,
          };
        }
      }
      if (parsed.type === 'location' && (parsed.id || parsed.name)) {
        const loc = locations.find(l => 
          (parsed.id && l.id === parsed.id) ||
          (parsed.name && l.name?.toLowerCase() === String(parsed.name).toLowerCase())
        );
        if (loc) {
          return { type: 'location', rawInput: cleaned, matchedLocation: loc };
        }
      }
    } catch {
      // not valid JSON, proceed to standard parsing
    }
  }

  const upper = cleaned.toUpperCase();

  // 1. Check for explicit prefix "BIN:" or "BIN-"
  if (upper.startsWith('BIN:') || upper.startsWith('BIN-')) {
    const payload = cleaned.slice(4).trim();
    // Payload might be "locationId:binName" or just "binName"
    const partsOfBin = payload.split(':');
    let targetLocId: string | null = null;
    let targetBinName = payload;

    if (partsOfBin.length >= 2) {
      targetLocId = partsOfBin[0].trim();
      targetBinName = partsOfBin.slice(1).join(':').trim();
    }

    // Find location
    let matchedLoc: Location | undefined;
    if (targetLocId) {
      matchedLoc = locations.find(l => 
        l.id === targetLocId || 
        l.name?.toLowerCase() === targetLocId?.toLowerCase()
      );
    }

    // If not found by locationId or not specified, search all locations for this binName
    const candidateBins: BinReference[] = [];
    for (const loc of locations) {
      const binNames = extractBinNamesFromLocation(loc);
      const matched = binNames.find(b => 
        b.toLowerCase() === targetBinName.toLowerCase() ||
        b.toLowerCase().replace(/[\s-_]/g, '') === targetBinName.toLowerCase().replace(/[\s-_]/g, '')
      );
      if (matched) {
        candidateBins.push({ location: loc, binName: matched });
      }
    }

    if (matchedLoc) {
      const partsInBin = parts.filter(p => 
        p.locationId === matchedLoc!.id && 
        p.binName?.toLowerCase() === targetBinName.toLowerCase()
      );
      return {
        type: 'bin',
        rawInput: cleaned,
        matchedLocation: matchedLoc,
        matchedBin: { location: matchedLoc, binName: targetBinName },
        partsInBin,
      };
    }

    if (candidateBins.length === 1) {
      const ref = candidateBins[0];
      const partsInBin = parts.filter(p => 
        p.locationId === ref.location.id && 
        p.binName?.toLowerCase() === ref.binName.toLowerCase()
      );
      return {
        type: 'bin',
        rawInput: cleaned,
        matchedLocation: ref.location,
        matchedBin: ref,
        partsInBin,
      };
    }

    if (candidateBins.length > 1) {
      return {
        type: 'bin',
        rawInput: cleaned,
        multipleMatches: { bins: candidateBins },
      };
    }

    // Even if bin name wasn't pre-configured in location.bins, if we have a matched location, treat it as that bin
    if (locations.length > 0) {
      const fallbackLoc = locations[0];
      const partsInBin = parts.filter(p => 
        p.locationId === fallbackLoc.id && 
        p.binName?.toLowerCase() === targetBinName.toLowerCase()
      );
      return {
        type: 'bin',
        rawInput: cleaned,
        matchedLocation: fallbackLoc,
        matchedBin: { location: fallbackLoc, binName: targetBinName },
        partsInBin,
      };
    }
  }

  // 2. Check for explicit prefix "LOC:" or "LOC-"
  if (upper.startsWith('LOC:') || upper.startsWith('LOC-')) {
    const locIdent = cleaned.slice(4).trim();
    const loc = locations.find(l => 
      l.id === locIdent || 
      l.name?.toLowerCase() === locIdent.toLowerCase()
    );
    if (loc) {
      return {
        type: 'location',
        rawInput: cleaned,
        matchedLocation: loc,
      };
    }
  }

  // 3. Check for explicit prefix "PART:" or "PART-"
  if (upper.startsWith('PART:') || upper.startsWith('PART-')) {
    const partIdent = cleaned.slice(5).trim();
    const part = parts.find(p => 
      p.id === partIdent || 
      p.sku?.toLowerCase() === partIdent.toLowerCase() ||
      p.barcode?.toLowerCase() === partIdent.toLowerCase()
    );
    if (part) {
      return {
        type: 'part',
        rawInput: cleaned,
        matchedPart: part,
      };
    }
  }

  // 4. No prefix: Check exact match against Parts first (SKU, barcode, ID)
  const exactPart = parts.find(p => 
    p.sku?.toLowerCase() === cleaned.toLowerCase() ||
    p.id === cleaned ||
    p.barcode?.toLowerCase() === cleaned.toLowerCase() ||
    p.qrCode?.toLowerCase() === cleaned.toLowerCase()
  );

  // Check exact match against Bins in all locations
  const binMatches: BinReference[] = [];
  for (const loc of locations) {
    const bins = extractBinNamesFromLocation(loc);
    const matched = bins.find(b => 
      b.toLowerCase() === cleaned.toLowerCase() ||
      b.toLowerCase().replace(/[\s-_]/g, '') === cleaned.toLowerCase().replace(/[\s-_]/g, '')
    );
    if (matched) {
      binMatches.push({ location: loc, binName: matched });
    }
  }

  // Check exact match against Location names/IDs
  const locMatch = locations.find(l => 
    l.id === cleaned || 
    l.name?.toLowerCase() === cleaned.toLowerCase()
  );

  // If exact part found and NO bin match:
  if (exactPart && binMatches.length === 0 && !locMatch) {
    return {
      type: 'part',
      rawInput: cleaned,
      matchedPart: exactPart,
    };
  }

  // If exact bin found and NO part match:
  if (!exactPart && binMatches.length === 1 && !locMatch) {
    const ref = binMatches[0];
    const partsInBin = parts.filter(p => 
      p.locationId === ref.location.id && 
      p.binName?.toLowerCase() === ref.binName.toLowerCase()
    );
    return {
      type: 'bin',
      rawInput: cleaned,
      matchedLocation: ref.location,
      matchedBin: ref,
      partsInBin,
    };
  }

  // If exact location found and no part or bin match:
  if (!exactPart && binMatches.length === 0 && locMatch) {
    return {
      type: 'location',
      rawInput: cleaned,
      matchedLocation: locMatch,
    };
  }

  // If both part and bin/location match or multiple bins match:
  if (exactPart && (binMatches.length > 0 || locMatch)) {
    return {
      type: 'part', // default to part, but provide options
      rawInput: cleaned,
      matchedPart: exactPart,
      multipleMatches: {
        parts: [exactPart],
        bins: binMatches,
        locations: locMatch ? [locMatch] : [],
      },
    };
  }

  if (binMatches.length > 1) {
    return {
      type: 'bin',
      rawInput: cleaned,
      multipleMatches: {
        bins: binMatches,
      },
    };
  }

  // 5. Partial / fuzzy search: Check if input matches part of a SKU or Description
  const partialParts = parts.filter(p => 
    p.sku?.toLowerCase().includes(cleaned.toLowerCase()) ||
    p.description?.toLowerCase().includes(cleaned.toLowerCase())
  );

  if (partialParts.length === 1) {
    return {
      type: 'part',
      rawInput: cleaned,
      matchedPart: partialParts[0],
    };
  } else if (partialParts.length > 1) {
    return {
      type: 'part',
      rawInput: cleaned,
      multipleMatches: {
        parts: partialParts,
      },
    };
  }

  return {
    type: 'unknown',
    rawInput: cleaned,
  };
}
