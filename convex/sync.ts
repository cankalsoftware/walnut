/**
 * Convex Offline-First Batch Sync & Community Endpoints
 * Note: Once `npx convex dev` is run, standard `query` and `mutation` from `./_generated/server`
 * are active. These typed handler definitions describe the exact Convex RPC contracts used by
 * the mobile SQLite 14-day auto-purge sync service and real-time Grower Chat.
 */

export interface OfflineSyncBatchItem {
  localRecordId: string;
  recordType: 'YOLO_SCAN' | 'CARE_LOG' | 'TUYA_SENSOR_SNAPSHOT';
  title: string;
  sizeKb: number;
  createdAtMs: number;
}

export interface SyncAckResult {
  localRecordId: string;
  syncStatus: 'SYNCED';
  syncedAtMs: number;
}

/**
 * Contract for Convex mutation `api.sync.syncOfflineBatch`:
 * Accepts offline records captured in the walnut orchard, persists them to Convex,
 * and returns `syncedAtMs` acknowledgments so the phone can safely purge local cache
 * once `now - syncedAtMs > 14 days`.
 */
export function buildSyncAcknowledgments(
  items: OfflineSyncBatchItem[],
  syncedAtMs: number = Date.now()
): SyncAckResult[] {
  return items.map((item) => ({
    localRecordId: item.localRecordId,
    syncStatus: 'SYNCED',
    syncedAtMs,
  }));
}

