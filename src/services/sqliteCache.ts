import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  FOURTEEN_DAYS_MS,
  INITIAL_LOCAL_CACHE,
  LocalCachedRecord,
} from './offlineSyncService';

const WEB_STORAGE_KEY = 'walnutiq_sqlite_cache_fallback';
const WEB_INITIALIZED_KEY = 'walnutiq_sqlite_initialized';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let tableInitialized = false;

function getNativeDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('walnutiq_cache.db');
  }
  if (!tableInitialized) {
    dbInstance.execSync(`
      CREATE TABLE IF NOT EXISTS offline_cache (
        id TEXT PRIMARY KEY NOT NULL,
        recordType TEXT NOT NULL,
        title TEXT NOT NULL,
        sizeKb INTEGER NOT NULL,
        createdAtMs INTEGER NOT NULL,
        syncStatus TEXT NOT NULL,
        syncedAtMs INTEGER
      );
      CREATE TABLE IF NOT EXISTS sqlite_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    tableInitialized = true;
  }
  return dbInstance;
}

function readWebFallback(): LocalCachedRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const initialized = localStorage.getItem(WEB_INITIALIZED_KEY) === '1';
    const raw = localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) {
      if (initialized) return [];
      localStorage.setItem(WEB_INITIALIZED_KEY, '1');
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_CACHE));
      return INITIAL_LOCAL_CACHE;
    }
    return JSON.parse(raw) as LocalCachedRecord[];
  } catch {
    return [];
  }
}

function writeWebFallback(records: LocalCachedRecord[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_INITIALIZED_KEY, '1');
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (err) {
    console.warn('Web SQLite fallback write failed:', err);
  }
}

export function loadOfflineCacheFromSqlite(): LocalCachedRecord[] {
  if (Platform.OS === 'web') {
    return readWebFallback();
  }

  try {
    const db = getNativeDb();
    const rows = db.getAllSync<LocalCachedRecord>(
      `SELECT id, recordType, title, sizeKb, createdAtMs, syncStatus, syncedAtMs
       FROM offline_cache
       ORDER BY createdAtMs DESC`
    );

    if (rows.length === 0) {
      const meta = db.getFirstSync<{ value: string }>(
        `SELECT value FROM sqlite_meta WHERE key = 'initialized'`
      );
      if (meta?.value === '1') {
        return [];
      }

      db.runSync(
        `INSERT OR REPLACE INTO sqlite_meta (key, value) VALUES ('initialized', '1')`
      );
      for (const seed of INITIAL_LOCAL_CACHE) {
        db.runSync(
          `INSERT OR IGNORE INTO offline_cache
           (id, recordType, title, sizeKb, createdAtMs, syncStatus, syncedAtMs)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            seed.id,
            seed.recordType,
            seed.title,
            seed.sizeKb,
            seed.createdAtMs,
            seed.syncStatus,
            seed.syncedAtMs ?? null,
          ]
        );
      }
      return INITIAL_LOCAL_CACHE;
    }

    return rows.map((r) => ({
      ...r,
      syncedAtMs: r.syncedAtMs ?? undefined,
    }));
  } catch (err) {
    console.warn('SQLite load failed:', err);
    return [];
  }
}

export function insertOfflineRecordToSqlite(record: LocalCachedRecord): void {
  if (Platform.OS === 'web') {
    const current = readWebFallback();
    writeWebFallback([record, ...current]);
    return;
  }

  try {
    const db = getNativeDb();
    db.runSync(
      `INSERT OR REPLACE INTO sqlite_meta (key, value) VALUES ('initialized', '1')`
    );
    db.runSync(
      `INSERT OR REPLACE INTO offline_cache
       (id, recordType, title, sizeKb, createdAtMs, syncStatus, syncedAtMs)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.recordType,
        record.title,
        record.sizeKb,
        record.createdAtMs,
        record.syncStatus,
        record.syncedAtMs ?? null,
      ]
    );
  } catch (err) {
    console.warn('SQLite insert failed:', err);
  }
}

export function markRecordsSyncedInSqlite(
  ackMap: Map<string, number>
): void {
  if (Platform.OS === 'web') {
    const current = readWebFallback().map((rec) =>
      ackMap.has(rec.id)
        ? { ...rec, syncStatus: 'SYNCED' as const, syncedAtMs: ackMap.get(rec.id) }
        : rec
    );
    writeWebFallback(current);
    return;
  }

  try {
    const db = getNativeDb();
    for (const [id, syncedAtMs] of ackMap.entries()) {
      db.runSync(
        `UPDATE offline_cache
         SET syncStatus = 'SYNCED', syncedAtMs = ?
         WHERE id = ?`,
        [syncedAtMs, id]
      );
    }
  } catch (err) {
    console.warn('SQLite sync status update failed:', err);
  }
}

export function purgeExpiredSyncedInSqlite(
  nowMs: number = Date.now()
): { purgedCount: number; freedMb: number } {
  const cutoffMs = nowMs - FOURTEEN_DAYS_MS;

  if (Platform.OS === 'web') {
    const all = readWebFallback();
    const expired = all.filter(
      (rec) =>
        rec.syncStatus === 'SYNCED' &&
        rec.syncedAtMs !== undefined &&
        rec.syncedAtMs < cutoffMs
    );
    const retained = all.filter((rec) => !expired.includes(rec));
    writeWebFallback(retained);
    const freedKb = expired.reduce((sum, rec) => sum + rec.sizeKb, 0);
    return {
      purgedCount: expired.length,
      freedMb: Number((freedKb / 1024).toFixed(2)),
    };
  }

  try {
    const db = getNativeDb();
    const expiredRows = db.getAllSync<{ sizeKb: number }>(
      `SELECT sizeKb FROM offline_cache
       WHERE syncStatus = 'SYNCED'
         AND syncedAtMs IS NOT NULL
         AND syncedAtMs < ?`,
      [cutoffMs]
    );
    db.runSync(
      `DELETE FROM offline_cache
       WHERE syncStatus = 'SYNCED'
         AND syncedAtMs IS NOT NULL
         AND syncedAtMs < ?`,
      [cutoffMs]
    );
    const freedKb = expiredRows.reduce((sum, rec) => sum + rec.sizeKb, 0);
    return {
      purgedCount: expiredRows.length,
      freedMb: Number((freedKb / 1024).toFixed(2)),
    };
  } catch (err) {
    console.warn('SQLite purge failed:', err);
    return { purgedCount: 0, freedMb: 0 };
  }
}

export function clearAllSqliteCache(): void {
  if (Platform.OS === 'web') {
    writeWebFallback([]);
    return;
  }
  try {
    const db = getNativeDb();
    db.runSync(
      `INSERT OR REPLACE INTO sqlite_meta (key, value) VALUES ('initialized', '1')`
    );
    db.execSync(`DELETE FROM offline_cache`);
  } catch (err) {
    console.warn('SQLite clear failed:', err);
  }
}
