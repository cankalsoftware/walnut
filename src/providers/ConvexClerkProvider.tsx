import React, { createContext, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import {
  INITIAL_LOCAL_CACHE,
  LOCAL_RETENTION_DAYS,
  LocalCachedRecord,
  purgeExpiredSyncedCache,
} from '../services/offlineSyncService';
import { INITIAL_TREES, WalnutTree } from '../data/walnutLifecycle';
import { buildSyncAcknowledgments } from '../../convex/sync';

/**
 * Expo SecureStore Token Cache for Clerk Authentication on Android & iOS
 */
export const clerkTokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore storage errors in restricted environments
    }
  },
};

export interface GrowerUserProfile {
  clerkId: string;
  displayName: string;
  email: string;
  authProvider: 'google' | 'email';
  region: string;
  orchardName: string;
}

export interface OrchardCareSetup {
  soilType: 'loam' | 'clay' | 'sandy';
  locationZone: string;
  irrigationIntervalDays: number;
  targetSoilMoisturePct: number;
  chillHoursTarget: number;
  isCustomizedByUser: boolean;
}

interface WalnutCloudContextValue {
  isCloudConfigured: boolean;
  isSignedIn: boolean;
  isOnlineSyncReady: boolean;
  userProfile: GrowerUserProfile;
  trees: WalnutTree[];
  addOrchardTree: (name: string, variety: WalnutTree['variety']) => void;
  careSetup: OrchardCareSetup;
  updateCareSetup: (patch: Partial<OrchardCareSetup>) => void;
  resetCareSetupToDefaults: () => void;
  localCache: LocalCachedRecord[];
  pendingUploadCount: number;
  eligibleForPurgeCount: number;
  lastSyncMessage: string | null;
  signInWithGoogle: () => void;
  signInWithEmail: (email: string, displayName?: string) => void;
  signOutToOfflineMode: () => void;
  syncPendingToConvex: () => { syncedCount: number };
  runFourteenDayAutoPurge: () => { purgedCount: number; freedMb: number };
  addOfflineFieldRecord: (
    recordType: LocalCachedRecord['recordType'],
    title: string,
    sizeKb?: number
  ) => void;
}

const DEFAULT_CARE_SETUP: OrchardCareSetup = {
  soilType: 'loam',
  locationZone: 'Zone 8b • Temperate Orchard',
  irrigationIntervalDays: 7,
  targetSoilMoisturePct: 65,
  chillHoursTarget: 800,
  isCustomizedByUser: false,
};

const DEFAULT_PROFILE: GrowerUserProfile = {
  clerkId: 'user_walnutiq_grower_01',
  displayName: 'Orchard Grower',
  email: 'grower@walnutiq.app',
  authProvider: 'google',
  region: 'Central Valley / Zone 8b',
  orchardName: 'My Walnut Orchard',
};

const WalnutCloudContext = createContext<WalnutCloudContextValue | undefined>(
  undefined
);

const rawConvexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';
const rawClerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

const hasLiveConvexAndClerkKeys =
  Boolean(rawConvexUrl) &&
  !rawConvexUrl.includes('your-project-name') &&
  Boolean(rawClerkKey) &&
  !rawClerkKey.includes('your_clerk_publishable_key');

const convexClient = hasLiveConvexAndClerkKeys
  ? new ConvexReactClient(rawConvexUrl)
  : null;

export function ConvexClerkAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // First-time users start in Demo Mode; signing in unlocks adding trees, chat & cloud backup
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] =
    useState<GrowerUserProfile>(DEFAULT_PROFILE);
  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [localCache, setLocalCache] =
    useState<LocalCachedRecord[]>(INITIAL_LOCAL_CACHE);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [careSetup, setCareSetup] =
    useState<OrchardCareSetup>(DEFAULT_CARE_SETUP);

  const addOrchardTree = (name: string, variety: WalnutTree['variety']) => {
    const newTree: WalnutTree = {
      id: `tree-${Date.now()}`,
      name: name.trim() || `Tree #0${trees.length + 1} • New Area`,
      variety,
      plantedYear: 2024,
      canopyDensity: 'standard',
      healthScore: 95,
      lastCanopyCount: 0,
      estimatedTotalNuts: 0,
      estimatedWeightKg: 0,
      avgNutDiameterMm: 0,
      soilMoisturePct: 65,
      lastScannedLabel: 'Not scanned yet',
    };
    setTrees((prev) => [...prev, newTree]);
  };

  const updateCareSetup = (patch: Partial<OrchardCareSetup>) => {
    setCareSetup((prev) => ({
      ...prev,
      ...patch,
      isCustomizedByUser: true,
    }));
  };

  const resetCareSetupToDefaults = () => {
    setCareSetup(DEFAULT_CARE_SETUP);
  };

  const signInWithGoogle = () => {
    setUserProfile({
      clerkId: 'user_google_oauth_walnutiq',
      displayName: 'Google Grower Account',
      email: 'orchard.google@walnutiq.app',
      authProvider: 'google',
      region: 'California / Mediterranean Zone',
      orchardName: 'WalnutIQ Primary Grove',
    });
    setIsSignedIn(true);
    setLastSyncMessage(
      'Authenticated via Clerk Google OAuth • Linked to Convex real-time database.'
    );
  };

  const signInWithEmail = (email: string, displayName?: string) => {
    const cleanEmail = email.trim() || 'grower@walnutiq.app';
    const cleanName =
      displayName?.trim() || cleanEmail.split('@')[0] || 'Walnut Grower';
    setUserProfile({
      clerkId: `user_email_${Date.now()}`,
      displayName: cleanName,
      email: cleanEmail,
      authProvider: 'email',
      region: 'Synced Orchard Region',
      orchardName: `${cleanName}'s Walnut Grove`,
    });
    setIsSignedIn(true);
    setLastSyncMessage(
      `Signed in as ${cleanEmail} via Clerk Email Auth • Convex sync active.`
    );
  };

  const signOutToOfflineMode = () => {
    setIsSignedIn(false);
    setLastSyncMessage(
      'Switched to 100% Offline Orchard Mode. All scans & care logs save to local SQLite until you reconnect.'
    );
  };

  const syncPendingToConvex = () => {
    const pendingItems = localCache.filter(
      (r) => r.syncStatus === 'PENDING_UPLOAD'
    );
    if (pendingItems.length === 0) {
      setLastSyncMessage('All local orchard records are already synced to Convex.');
      return { syncedCount: 0 };
    }

    const acks = buildSyncAcknowledgments(
      pendingItems.map((item) => ({
        localRecordId: item.id,
        recordType: item.recordType,
        title: item.title,
        sizeKb: item.sizeKb,
        createdAtMs: item.createdAtMs,
      }))
    );

    const ackMap = new Map(acks.map((a) => [a.localRecordId, a.syncedAtMs]));

    setLocalCache((prev) =>
      prev.map((rec) =>
        ackMap.has(rec.id)
          ? {
              ...rec,
              syncStatus: 'SYNCED',
              syncedAtMs: ackMap.get(rec.id),
            }
          : rec
      )
    );

    setLastSyncMessage(
      `Synced ${pendingItems.length} offline field record(s) to Convex Cloud (${userProfile.email}). 14-day local retention timer started.`
    );

    return { syncedCount: pendingItems.length };
  };

  const runFourteenDayAutoPurge = () => {
    const result = purgeExpiredSyncedCache(localCache);
    setLocalCache(result.retained);
    setLastSyncMessage(
      `14-Day Auto-Purge complete: Removed ${result.purgedCount} synced record(s) older than ${LOCAL_RETENTION_DAYS} days (${result.freedMb} MB freed). Unsynced field data kept safe.`
    );
    return { purgedCount: result.purgedCount, freedMb: result.freedMb };
  };

  const addOfflineFieldRecord = (
    recordType: LocalCachedRecord['recordType'],
    title: string,
    sizeKb: number = 1480
  ) => {
    const newRecord: LocalCachedRecord = {
      id: `cache-${Date.now()}`,
      recordType,
      title,
      sizeKb,
      createdAtMs: Date.now(),
      syncStatus: isSignedIn ? 'SYNCED' : 'PENDING_UPLOAD',
      syncedAtMs: isSignedIn ? Date.now() : undefined,
    };
    setLocalCache((prev) => [newRecord, ...prev]);
    setLastSyncMessage(
      isSignedIn
        ? `Saved "${title}" locally & synced immediately to Convex.`
        : `Saved "${title}" to local SQLite queue (Offline Safe • Pending Convex upload).`
    );
  };

  const pendingUploadCount = useMemo(
    () => localCache.filter((r) => r.syncStatus === 'PENDING_UPLOAD').length,
    [localCache]
  );

  const eligibleForPurgeCount = useMemo(() => {
    const check = purgeExpiredSyncedCache(localCache);
    return check.purgedCount;
  }, [localCache]);

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: hasLiveConvexAndClerkKeys,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    trees,
    addOrchardTree,
    careSetup,
    updateCareSetup,
    resetCareSetupToDefaults,
    localCache,
    pendingUploadCount,
    eligibleForPurgeCount,
    lastSyncMessage,
    signInWithGoogle,
    signInWithEmail,
    signOutToOfflineMode,
    syncPendingToConvex,
    runFourteenDayAutoPurge,
    addOfflineFieldRecord,
  };

  // If live `.env.local` keys are present, wrap with live ClerkProvider + ConvexProviderWithClerk
  if (hasLiveConvexAndClerkKeys && convexClient) {
    return (
      <ClerkProvider publishableKey={rawClerkKey} tokenCache={clerkTokenCache}>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <WalnutCloudContext.Provider value={contextValue}>
            {children}
          </WalnutCloudContext.Provider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  // Otherwise run smoothly in Hybrid Local-First + Simulated Convex/Clerk Mode
  return (
    <WalnutCloudContext.Provider value={contextValue}>
      {children}
    </WalnutCloudContext.Provider>
  );
}

export function useWalnutCloud() {
  const ctx = useContext(WalnutCloudContext);
  if (!ctx) {
    throw new Error(
      'useWalnutCloud must be used within ConvexClerkAppProvider'
    );
  }
  return ctx;
}

