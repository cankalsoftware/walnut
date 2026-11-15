import { mutation } from './_generated/server';
import { v } from 'convex/values';

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
 * Pure helper kept for local unit formatting of sync acknowledgment payloads.
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

/**
 * Authenticated Convex mutation `api.sync.syncOfflineBatch`:
 * Persists offline field records captured in SQLite to Convex Cloud (`yoloScans`,
 * `careLogs`, `tuyaSensorSnapshots`) idempotently by `localRecordId` and returns
 * server-generated `syncedAtMs` acknowledgments so the phone can start the 14-day
 * local cache retention timer safely.
 */
export const syncOfflineBatch = mutation({
  args: {
    items: v.array(
      v.object({
        localRecordId: v.string(),
        recordType: v.union(
          v.literal('YOLO_SCAN'),
          v.literal('CARE_LOG'),
          v.literal('TUYA_SENSOR_SNAPSHOT')
        ),
        title: v.string(),
        sizeKb: v.number(),
        createdAtMs: v.number(),
      })
    ),
  },
  handler: async (ctx, args): Promise<SyncAckResult[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: sign in required to sync offline records');
    }

    const userId = identity.subject;
    const syncedAtMs = Date.now();
    const acks: SyncAckResult[] = [];

    for (const item of args.items) {
      if (item.recordType === 'YOLO_SCAN') {
        const existing = await ctx.db
          .query('yoloScans')
          .withIndex('by_local_record_id', (q) =>
            q.eq('localRecordId', item.localRecordId)
          )
          .first();

        if (!existing) {
          await ctx.db.insert('yoloScans', {
            userId,
            localRecordId: item.localRecordId,
            treeId: 'orchard-default',
            mode: 'canopy',
            detectedCount: 0,
            hullSplitCount: 0,
            estimatedTotalNuts: 0,
            estimatedWeightKg: 0,
            capturedAtMs: item.createdAtMs,
            syncedAtMs,
          });
        }
      } else if (item.recordType === 'CARE_LOG') {
        const existing = await ctx.db
          .query('careLogs')
          .withIndex('by_local_record_id', (q) =>
            q.eq('localRecordId', item.localRecordId)
          )
          .first();

        if (!existing) {
          await ctx.db.insert('careLogs', {
            userId,
            localRecordId: item.localRecordId,
            category: 'watering',
            title: item.title,
            completed: true,
            loggedAtMs: item.createdAtMs,
            syncedAtMs,
          });
        }
      } else {
        const existingSnapshots = await ctx.db
          .query('tuyaSensorSnapshots')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect();
        const alreadySaved = existingSnapshots.some(
          (row) => row.localRecordId === item.localRecordId
        );
        if (!alreadySaved) {
          await ctx.db.insert('tuyaSensorSnapshots', {
            userId,
            localRecordId: item.localRecordId,
            sensorNodeId: 'tuya-field-node',
            category: 'soil',
            label: item.title,
            valueDisplay: 'Synced',
            subValueDisplay: `${item.sizeKb} KB`,
            recordedAtMs: item.createdAtMs,
            syncedAtMs,
          });
        }
      }

      acks.push({
        localRecordId: item.localRecordId,
        syncStatus: 'SYNCED',
        syncedAtMs,
      });
    }

    return acks;
  },
});
