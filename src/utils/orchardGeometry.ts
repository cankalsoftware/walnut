export interface BoundaryPin {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface PolygonMetrics {
  areaM2: number;
  areaHectares: number;
  widthMeters: number;
  heightMeters: number;
  centerLat: number;
  centerLng: number;
}

export interface TreeSpacingGuidance {
  possibleTrees: number;
  areaM2: number;
  spacingMeters: number;
  status: 'optimal' | 'dense_warning' | 'sparse_guidance';
  message: string;
}

export const DEFAULT_TREE_SPACING_METERS = 5;
export const MAX_TREES_PER_SECTION = 200;
export const SUBSECTION_GRID_SIDE = 14;
export const SUBSECTION_TREE_CAPACITY =
  SUBSECTION_GRID_SIDE * SUBSECTION_GRID_SIDE; // 196 trees

/**
 * Parses a pasted coordinate string such as "38.5449, -121.7405" or "38.5449 -121.7405".
 */
export function parseLatLngText(
  input: string
): { latitude: number; longitude: number } | null {
  const matches = input.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const latitude = Number(matches[0]);
  const longitude = Number(matches[1]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

/**
 * Computes planar geodesic area (m² & ha), bounding dimensions, and centroid from 3+ lat/lng pins.
 */
export function computePolygonMetrics(pins: BoundaryPin[]): PolygonMetrics | null {
  if (pins.length < 3) return null;

  const avgLat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
  const avgLng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;

  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);

  const pts = pins.map((p) => ({
    x: (p.longitude - avgLng) * metersPerDegLng,
    y: (p.latitude - avgLat) * metersPerDegLat,
  }));

  let twiceArea = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    twiceArea += a.x * b.y - b.x * a.y;
    if (a.x < minX) minX = a.x;
    if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.y > maxY) maxY = a.y;
  }

  const areaM2 = Math.max(100, Math.round(Math.abs(twiceArea) / 2));
  const areaHectares = Number((areaM2 / 10000).toFixed(2));

  return {
    areaM2,
    areaHectares,
    widthMeters: Math.max(10, Math.round(maxX - minX)),
    heightMeters: Math.max(10, Math.round(maxY - minY)),
    centerLat: Number(avgLat.toFixed(6)),
    centerLng: Number(avgLng.toFixed(6)),
  };
}

/**
 * Generates 4 corner pins (NW, NE, SE, SW) around a center lat/lng for a given area in hectares.
 */
export function generateRectPinsFromCenter(
  centerLat: number,
  centerLng: number,
  areaHectares: number
): BoundaryPin[] {
  const safeHa = Math.max(0.1, areaHectares || 1);
  const sideMeters = Math.sqrt(safeHa * 10000);
  const halfSide = sideMeters / 2;

  const dLat = halfSide / 111320;
  const dLng = halfSide / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return [
    {
      label: 'NW Corner',
      latitude: Number((centerLat + dLat).toFixed(6)),
      longitude: Number((centerLng - dLng).toFixed(6)),
    },
    {
      label: 'NE Corner',
      latitude: Number((centerLat + dLat).toFixed(6)),
      longitude: Number((centerLng + dLng).toFixed(6)),
    },
    {
      label: 'SE Corner',
      latitude: Number((centerLat - dLat).toFixed(6)),
      longitude: Number((centerLng + dLng).toFixed(6)),
    },
    {
      label: 'SW Corner',
      latitude: Number((centerLat - dLat).toFixed(6)),
      longitude: Number((centerLng - dLng).toFixed(6)),
    },
  ];
}

/**
 * Calculates possible walnut trees at 5m x 5m spacing (25 m²/tree) and guides the grower
 * if their entered tree count is higher or lower than expected for the field size.
 */
export function computeTreeSpacingGuidance(
  areaHectares: number,
  userTreeCount: number,
  spacingMeters: number = DEFAULT_TREE_SPACING_METERS
): TreeSpacingGuidance {
  const safeHa = Math.max(0.05, areaHectares || 0.5);
  const areaM2 = Math.round(safeHa * 10000);
  const cellM2 = spacingMeters * spacingMeters;
  const possibleTrees = Math.max(1, Math.floor(areaM2 / cellM2));

  const diff = userTreeCount - possibleTrees;
  const ratio = possibleTrees > 0 ? userTreeCount / possibleTrees : 1;

  if (ratio > 1.15) {
    return {
      possibleTrees,
      areaM2,
      spacingMeters,
      status: 'dense_warning',
      message: `You entered ${userTreeCount} trees (+${diff} above ~${possibleTrees} expected at ${spacingMeters}m×${spacingMeters}m for ${safeHa} ha). Verify field boundaries or high-density spacing.`,
    };
  }

  if (ratio < 0.85) {
    return {
      possibleTrees,
      areaM2,
      spacingMeters,
      status: 'sparse_guidance',
      message: `You entered ${userTreeCount} trees (${Math.abs(diff)} below ~${possibleTrees} possible at ${spacingMeters}m×${spacingMeters}m for ${safeHa} ha). Check for open gaps or wider spacing.`,
    };
  }

  return {
    possibleTrees,
    areaM2,
    spacingMeters,
    status: 'optimal',
    message: `Tree count (${userTreeCount}) matches ~${possibleTrees} trees expected for ${safeHa} ha at ${spacingMeters}m×${spacingMeters}m spacing.`,
  };
}

export interface SectionInput {
  quadrantId: string;
  sampledTreeLabel: string;
  scannedNutsPerTree: number;
  estimatedWeightKgPerTree: number;
  note: string;
  evidenceStorageIds?: string[];
  updatedAtMs: number;
  allocatedTrees?: number;
}

/**
 * Crosses the field into 4 primary sections (NW, NE, SW, SE).
 * If any section exceeds 200 trees, splits that section further into 14x14 (196-tree) sub-areas.
 */
export function buildFieldSections<T extends SectionInput>(
  totalTrees: number,
  existingSections: T[]
): Array<T & { allocatedTrees: number }> {
  const safeTotal = Math.max(4, Math.round(totalTrees || 0));
  const baseQuarters = ['NW', 'NE', 'SW', 'SE'] as const;
  const basePerQuarter = Math.floor(safeTotal / 4);
  const remainder = safeTotal % 4;

  const existingById = new Map(existingSections.map((s) => [s.quadrantId, s]));
  const now = Date.now();
  const result: Array<T & { allocatedTrees: number }> = [];

  baseQuarters.forEach((qId, idx) => {
    const quarterTrees = basePerQuarter + (idx < remainder ? 1 : 0);

    if (quarterTrees <= MAX_TREES_PER_SECTION) {
      const prev = existingById.get(qId);
      result.push({
        ...(prev ?? {
          quadrantId: qId,
          sampledTreeLabel: `Random Tree (${qId})`,
          scannedNutsPerTree: 0,
          estimatedWeightKgPerTree: 0,
          note: '',
          evidenceStorageIds: [],
          updatedAtMs: now,
        }),
        quadrantId: qId,
        allocatedTrees: quarterTrees,
      } as T & { allocatedTrees: number });
      return;
    }

    // Split oversized section (> 200 trees) into 14x14 (196-tree) sub-areas
    const subCount = Math.ceil(quarterTrees / SUBSECTION_TREE_CAPACITY);
    let remaining = quarterTrees;
    for (let s = 1; s <= subCount; s++) {
      const subId = `${qId}-${s}`;
      const subTrees = Math.min(SUBSECTION_TREE_CAPACITY, remaining);
      remaining -= subTrees;
      const prev =
        existingById.get(subId) ??
        (s === 1 ? existingById.get(qId) : undefined);

      result.push({
        ...(prev ?? {
          quadrantId: subId,
          sampledTreeLabel: `Random Tree (${subId} • 14×14)`,
          scannedNutsPerTree: 0,
          estimatedWeightKgPerTree: 0,
          note: '',
          evidenceStorageIds: [],
          updatedAtMs: now,
        }),
        quadrantId: subId,
        allocatedTrees: subTrees,
      } as T & { allocatedTrees: number });
    }
  });

  return result;
}
