/**
 * WalnutIQ: Tree Care & AI Count
 * Hybrid Offline-First SQLite Cache + Convex Cloud Sync + 14-Day Post-Sync Auto-Purge Service
 *
 * Rules:
 * 1. In the orchard without cellular signal, scans & care logs are stored locally with `syncStatus = 'PENDING_UPLOAD'`.
 * 2. When online, records sync to Convex (authenticated via Clerk) and are marked `syncStatus = 'SYNCED'` with `syncedAt`.
 * 3. Local records that are `SYNCED` and older than 14 days (`LOCAL_RETENTION_DAYS = 14`) are automatically purged
 *    to save phone storage space. Unsynced records are NEVER purged until synced.
 */

export const LOCAL_RETENTION_DAYS = 14;
export const FOURTEEN_DAYS_MS = LOCAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type SyncStatus = 'PENDING_UPLOAD' | 'SYNCED';

export interface LocalCachedRecord {
  id: string;
  recordType: 'YOLO_SCAN' | 'CARE_LOG' | 'TUYA_SENSOR_SNAPSHOT';
  title: string;
  sizeKb: number;
  createdAtMs: number;
  syncStatus: SyncStatus;
  syncedAtMs?: number;
}

const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

export const INITIAL_LOCAL_CACHE: LocalCachedRecord[] = [
  {
    id: 'cache-1',
    recordType: 'YOLO_SCAN',
    title: 'Tree #01 • 4-Quadrant Canopy Scan (248 nuts)',
    sizeKb: 1840,
    createdAtMs: NOW_MS - 2 * DAY_MS,
    syncStatus: 'SYNCED',
    syncedAtMs: NOW_MS - 2 * DAY_MS,
  },
  {
    id: 'cache-2',
    recordType: 'TUYA_SENSOR_SNAPSHOT',
    title: 'Tuya Soil Probe & Weather Log (Moisture 68%, 14.2°C)',
    sizeKb: 64,
    createdAtMs: NOW_MS - 5 * DAY_MS,
    syncStatus: 'SYNCED',
    syncedAtMs: NOW_MS - 5 * DAY_MS,
  },
  {
    id: 'cache-3',
    recordType: 'YOLO_SCAN',
    title: 'Tree #02 • Ground Harvest Picker Session (112 nuts)',
    sizeKb: 2420,
    createdAtMs: NOW_MS - 16 * DAY_MS,
    syncStatus: 'SYNCED',
    syncedAtMs: NOW_MS - 15 * DAY_MS, // Synced 15 days ago -> Eligible for 14-day auto-purge!
  },
  {
    id: 'cache-4',
    recordType: 'CARE_LOG',
    title: 'Row B • Autumn Potash & Leaf Sanitation Log',
    sizeKb: 920,
    createdAtMs: NOW_MS - 18 * DAY_MS,
    syncStatus: 'SYNCED',
    syncedAtMs: NOW_MS - 17 * DAY_MS, // Synced 17 days ago -> Eligible for 14-day auto-purge!
  },
  {
    id: 'cache-5',
    recordType: 'YOLO_SCAN',
    title: 'Tree #03 • Offline Field Capture (Awaiting Cell Signal)',
    sizeKb: 1650,
    createdAtMs: NOW_MS - 1 * DAY_MS,
    syncStatus: 'PENDING_UPLOAD',
  },
];

/**
 * Purges local cached records that have been confirmed synced to Convex
 * more than 14 days ago. Unsynced records are strictly preserved.
 */
export function purgeExpiredSyncedCache(records: LocalCachedRecord[], nowMs: number = Date.now()) {
  const retained: LocalCachedRecord[] = [];
  const purged: LocalCachedRecord[] = [];

  for (const record of records) {
    const isSyncedAndExpired =
      record.syncStatus === 'SYNCED' &&
      record.syncedAtMs !== undefined &&
      nowMs - record.syncedAtMs > FOURTEEN_DAYS_MS;

    if (isSyncedAndExpired) {
      purged.push(record);
    } else {
      retained.push(record);
    }
  }

  const freedKb = purged.reduce((sum, r) => sum + r.sizeKb, 0);
  return {
    retained,
    purgedCount: purged.length,
    freedMb: Number((freedKb / 1024).toFixed(2)),
  };
}
