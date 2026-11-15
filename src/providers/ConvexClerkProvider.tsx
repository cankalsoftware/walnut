import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
import {
  ClerkProvider,
  useAuth,
  useOAuth,
  useSignIn,
  useUser,
} from '@clerk/expo';
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import {
  LOCAL_RETENTION_DAYS,
  LocalCachedRecord,
  purgeExpiredSyncedCache,
} from '../services/offlineSyncService';
import {
  clearAllSqliteCache,
  insertOfflineRecordToSqlite,
  loadOfflineCacheFromSqlite,
  markRecordsSyncedInSqlite,
  purgeExpiredSyncedInSqlite,
} from '../services/sqliteCache';
import { INITIAL_TREES, WalnutTree } from '../data/walnutLifecycle';
import type { SyncAckResult } from '../../convex/sync';

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
  syncMode: 'auto' | 'manual';
  setSyncMode: (mode: 'auto' | 'manual') => void;
  pendingUploadCount: number;
  eligibleForPurgeCount: number;
  lastSyncMessage: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (
    email: string,
    password?: string,
    displayName?: string
  ) => Promise<void>;
  signOutToOfflineMode: () => Promise<void>;
  deleteAccountAndData: () => Promise<boolean>;
  syncPendingToConvex: () => Promise<{ syncedCount: number }>;
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

/**
 * Live Clerk + Convex + SQLite State Provider (mounted inside ClerkProvider & ConvexProviderWithClerk)
 */
function LiveClerkConvexStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn: clerkSignedIn, signOut } = useAuth();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signIn } = useSignIn();

  const syncUserMutation = useMutation(anyApi.users.syncCurrentUser);
  const deleteAccountMutation = useMutation(anyApi.users.deleteMyAccountData);
  const syncOfflineBatchMutation = useMutation(anyApi.sync.syncOfflineBatch);

  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [localCache, setLocalCache] = useState<LocalCachedRecord[]>(() =>
    loadOfflineCacheFromSqlite()
  );
  const [syncMode, setSyncMode] = useState<'auto' | 'manual'>('auto');
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [careSetup, setCareSetup] =
    useState<OrchardCareSetup>(DEFAULT_CARE_SETUP);

  const isSignedIn = Boolean(clerkSignedIn);

  const userProfile: GrowerUserProfile = useMemo(() => {
    if (!user) return DEFAULT_PROFILE;
    const email =
      user.primaryEmailAddress?.emailAddress || 'grower@walnutiq.app';
    const name = user.fullName || user.firstName || email.split('@')[0];
    const hasGoogle = user.externalAccounts?.some(
      (acc) => acc.provider === 'google'
    );
    return {
      clerkId: user.id,
      displayName: name,
      email,
      authProvider: hasGoogle ? 'google' : 'email',
      region: careSetup.locationZone,
      orchardName: `${name}'s Walnut Orchard`,
    };
  }, [user, careSetup.locationZone]);

  useEffect(() => {
    const result = purgeExpiredSyncedInSqlite(Date.now());
    if (result.purgedCount > 0) {
      setLocalCache(loadOfflineCacheFromSqlite());
    }
  }, []);

  useEffect(() => {
    if (convexAuthenticated && isSignedIn && user) {
      syncUserMutation({
        displayName: user.fullName || user.firstName || 'Walnut Grower',
        authProvider: userProfile.authProvider,
      }).catch((err) => {
        console.warn('Convex user sync failed:', err);
      });
    }
  }, [convexAuthenticated, isSignedIn, user, userProfile.authProvider, syncUserMutation]);

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

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = Linking.createURL('/auth', { scheme: 'walnutiq' });
      const { createdSessionId, setActive: setOAuthActive } =
        await startOAuthFlow({ redirectUrl });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        setLastSyncMessage(
          'Signed in with Clerk Google OAuth • Convex sync active.'
        );
      } else {
        setLastSyncMessage(
          'Google sign-in was cancelled or needs additional verification.'
        );
      }
    } catch (err) {
      setLastSyncMessage(
        `Clerk Google sign-in error: ${err instanceof Error ? err.message : 'Check Clerk redirect URLs'}`
      );
    }
  };

  const signInWithEmail = async (
    email: string,
    password?: string
  ) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLastSyncMessage('Please enter your email address.');
      return;
    }
    if (!signIn) {
      setLastSyncMessage('Clerk authentication is still loading...');
      return;
    }
    try {
      const { error } = await signIn.password({
        emailAddress: cleanEmail,
        password: password || '',
      });
      if (error) {
        setLastSyncMessage(
          `Clerk Email sign-in failed: ${error.longMessage || error.message}`
        );
        return;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize();
        setLastSyncMessage(
          `Signed in as ${cleanEmail} via Clerk • Convex sync active.`
        );
      } else {
        setLastSyncMessage(
          'Check your email or enter your account password to finish Clerk sign-in.'
        );
      }
    } catch (err) {
      setLastSyncMessage(
        `Clerk Email sign-in failed: ${err instanceof Error ? err.message : 'Invalid credentials or missing password'}`
      );
    }
  };

  const signOutToOfflineMode = async () => {
    try {
      await signOut();
      setLastSyncMessage(
        'Signed out to Offline Orchard Mode. Local SQLite records remain safe on your phone.'
      );
    } catch (err) {
      setLastSyncMessage(
        `Sign-out error: ${err instanceof Error ? err.message : 'Try again'}`
      );
    }
  };

  const deleteAccountAndData = async (): Promise<boolean> => {
    try {
      if (user) {
        await deleteAccountMutation({});
        clearAllSqliteCache();
        setLocalCache([]);
        try {
          await user.delete();
        } catch (clerkErr) {
          setLastSyncMessage(
            `Orchard data deleted, but Clerk requires recent sign-in to delete your login (${clerkErr instanceof Error ? clerkErr.message : 're-authenticate and retry'}).`
          );
          return false;
        }
      }
      await signOut();
      setLastSyncMessage(
        'Your WalnutIQ account, Convex orchard data, and local SQLite cache have been permanently deleted.'
      );
      return true;
    } catch (err) {
      setLastSyncMessage(
        `Account deletion failed: ${err instanceof Error ? err.message : 'Please try again'}`
      );
      return false;
    }
  };

  const syncPendingToConvex = async (): Promise<{ syncedCount: number }> => {
    const pendingItems = localCache.filter(
      (r) => r.syncStatus === 'PENDING_UPLOAD'
    );
    if (pendingItems.length === 0) {
      setLastSyncMessage(
        'All local SQLite orchard records are already synced to Convex.'
      );
      return { syncedCount: 0 };
    }

    try {
      const acks = (await syncOfflineBatchMutation({
        items: pendingItems.map((item) => ({
          localRecordId: item.id,
          recordType: item.recordType,
          title: item.title,
          sizeKb: item.sizeKb,
          createdAtMs: item.createdAtMs,
        })),
      })) as SyncAckResult[];

      const ackMap = new Map(acks.map((a) => [a.localRecordId, a.syncedAtMs]));
      markRecordsSyncedInSqlite(ackMap);
      setLocalCache(loadOfflineCacheFromSqlite());

      setLastSyncMessage(
        `Synced ${acks.length} SQLite record(s) to Convex (${userProfile.email}). 14-day local retention timer started.`
      );
      return { syncedCount: acks.length };
    } catch (err) {
      setLastSyncMessage(
        `Convex sync deferred (records kept safe in SQLite): ${err instanceof Error ? err.message : 'Check connection'}`
      );
      return { syncedCount: 0 };
    }
  };

  const runFourteenDayAutoPurge = () => {
    const result = purgeExpiredSyncedInSqlite(Date.now());
    setLocalCache(loadOfflineCacheFromSqlite());
    setLastSyncMessage(
      `14-Day SQLite Auto-Purge complete: Removed ${result.purgedCount} synced record(s) older than ${LOCAL_RETENTION_DAYS} days (${result.freedMb} MB freed). Unsynced field data kept safe.`
    );
    return result;
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
      syncStatus: 'PENDING_UPLOAD',
      syncedAtMs: undefined,
    };
    insertOfflineRecordToSqlite(newRecord);
    setLocalCache((prev) => [newRecord, ...prev]);
    setLastSyncMessage(
      isSignedIn && syncMode === 'auto'
        ? `Saved "${title}" to local SQLite • Queued for Convex sync.`
        : `Saved "${title}" to local SQLite queue (Offline Safe • Pending Convex upload).`
    );
  };

  const pendingUploadCount = useMemo(
    () => localCache.filter((r) => r.syncStatus === 'PENDING_UPLOAD').length,
    [localCache]
  );

  useEffect(() => {
    if (
      convexAuthenticated &&
      isSignedIn &&
      syncMode === 'auto' &&
      pendingUploadCount > 0
    ) {
      void syncPendingToConvex();
    }
  }, [convexAuthenticated, isSignedIn, syncMode, pendingUploadCount]);

  const eligibleForPurgeCount = useMemo(() => {
    const check = purgeExpiredSyncedCache(localCache);
    return check.purgedCount;
  }, [localCache]);

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: true,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    trees,
    addOrchardTree,
    careSetup,
    updateCareSetup,
    resetCareSetupToDefaults,
    localCache,
    syncMode,
    setSyncMode,
    pendingUploadCount,
    eligibleForPurgeCount,
    lastSyncMessage,
    signInWithGoogle,
    signInWithEmail,
    signOutToOfflineMode,
    deleteAccountAndData,
    syncPendingToConvex,
    runFourteenDayAutoPurge,
    addOfflineFieldRecord,
  };

  return (
    <WalnutCloudContext.Provider value={contextValue}>
      {children}
    </WalnutCloudContext.Provider>
  );
}

/**
 * Fallback Provider when `.env.local` keys are absent (still uses real SQLite persistence)
 */
function FallbackLocalStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] =
    useState<GrowerUserProfile>(DEFAULT_PROFILE);
  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [localCache, setLocalCache] = useState<LocalCachedRecord[]>(() =>
    loadOfflineCacheFromSqlite()
  );
  const [syncMode, setSyncMode] = useState<'auto' | 'manual'>('auto');
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [careSetup, setCareSetup] =
    useState<OrchardCareSetup>(DEFAULT_CARE_SETUP);

  const addOrchardTree = (name: string, variety: WalnutTree['variety']) => {
    setTrees((prev) => [
      ...prev,
      {
        id: `tree-${Date.now()}`,
        name: name.trim() || `Tree #0${prev.length + 1} • New Area`,
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
      },
    ]);
  };

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: false,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    trees,
    addOrchardTree,
    careSetup,
    updateCareSetup: (patch) =>
      setCareSetup((prev) => ({ ...prev, ...patch, isCustomizedByUser: true })),
    resetCareSetupToDefaults: () => setCareSetup(DEFAULT_CARE_SETUP),
    localCache,
    syncMode,
    setSyncMode,
    pendingUploadCount: localCache.filter(
      (r) => r.syncStatus === 'PENDING_UPLOAD'
    ).length,
    eligibleForPurgeCount: purgeExpiredSyncedCache(localCache).purgedCount,
    lastSyncMessage,
    signInWithGoogle: async () => {
      setIsSignedIn(true);
      setLastSyncMessage('Signed in (Local Demo Mode — add Clerk keys for live OAuth).');
    },
    signInWithEmail: async (email) => {
      const cleanEmail = email.trim() || 'grower@walnutiq.app';
      setUserProfile((p) => ({
        ...p,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        authProvider: 'email',
      }));
      setIsSignedIn(true);
      setLastSyncMessage(`Signed in as ${cleanEmail} (Local Demo Mode).`);
    },
    signOutToOfflineMode: async () => {
      setIsSignedIn(false);
      setLastSyncMessage('Switched to Offline Orchard Mode.');
    },
    deleteAccountAndData: async () => {
      clearAllSqliteCache();
      setLocalCache([]);
      setIsSignedIn(false);
      setLastSyncMessage('Cleared local SQLite cache and signed out.');
      return true;
    },
    syncPendingToConvex: async () => ({ syncedCount: 0 }),
    runFourteenDayAutoPurge: () => {
      const result = purgeExpiredSyncedInSqlite(Date.now());
      setLocalCache(loadOfflineCacheFromSqlite());
      return result;
    },
    addOfflineFieldRecord: (recordType, title, sizeKb = 1480) => {
      const rec: LocalCachedRecord = {
        id: `cache-${Date.now()}`,
        recordType,
        title,
        sizeKb,
        createdAtMs: Date.now(),
        syncStatus: 'PENDING_UPLOAD',
      };
      insertOfflineRecordToSqlite(rec);
      setLocalCache((prev) => [rec, ...prev]);
    },
  };

  return (
    <WalnutCloudContext.Provider value={contextValue}>
      {children}
    </WalnutCloudContext.Provider>
  );
}

export function ConvexClerkAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (hasLiveConvexAndClerkKeys && convexClient) {
    return (
      <ClerkProvider publishableKey={rawClerkKey} tokenCache={clerkTokenCache}>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <LiveClerkConvexStateProvider>{children}</LiveClerkConvexStateProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  return <FallbackLocalStateProvider>{children}</FallbackLocalStateProvider>;
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
