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
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from 'convex/react';
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
import {
  BoundaryPin,
  buildFieldSections,
  DEFAULT_TREE_SPACING_METERS,
} from '../utils/orchardGeometry';
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

export type GrowerExperienceLevel = 'beginner' | 'experienced' | 'expert';

export const DEFAULT_NOTIFICATION_TOPICS = [
  'weather',
  'fertilizing',
  'blight_pest',
  'seminars_expo',
  'maintenance',
  'news',
] as const;

export interface GrowerUserProfile {
  clerkId: string;
  displayName: string;
  email: string;
  authProvider: 'google' | 'email';
  region: string;
  orchardName: string;
  experienceLevel: GrowerExperienceLevel;
  notificationTopics: string[];
  pushNotificationsEnabled: boolean;
}

export interface OrchardCareSetup {
  soilType: 'loam' | 'clay' | 'sandy';
  locationZone: string;
  irrigationIntervalDays: number;
  targetSoilMoisturePct: number;
  chillHoursTarget: number;
  isCustomizedByUser: boolean;
}

export type QuadrantId = string;

export interface QuadrantSample {
  quadrantId: QuadrantId;
  allocatedTrees?: number;
  sampledTreeLabel: string;
  scannedNutsPerTree: number;
  estimatedWeightKgPerTree: number;
  note: string;
  evidenceCount: number;
  evidenceLocalUris: string[];
  updatedAtMs: number;
}

export interface OrchardFieldBlock {
  id: string;
  name: string;
  variety: WalnutTree['variety'];
  plantedYear: number;
  treeCount: number;
  areaHectares: number;
  canopyDensity: 'open' | 'standard' | 'dense';
  seasonYear: number;
  latitude?: number;
  longitude?: number;
  treeSpacingMeters?: number;
  boundaryPins?: BoundaryPin[];
  fieldNote: string;
  quadrants: QuadrantSample[];
}

export interface CareFeedItem {
  _id: string;
  title: string;
  body: string;
  category: string;
  createdAtMs: number;
}

const makeDefaultQuadrants = (seedNuts = 0): QuadrantSample[] => [
  {
    quadrantId: 'NW',
    sampledTreeLabel: 'NW Sample Tree #1',
    scannedNutsPerTree: seedNuts,
    estimatedWeightKgPerTree: Number((seedNuts * 0.013).toFixed(1)),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
  {
    quadrantId: 'NE',
    sampledTreeLabel: 'NE Sample Tree #1',
    scannedNutsPerTree: seedNuts > 0 ? seedNuts + 18 : 0,
    estimatedWeightKgPerTree: Number(((seedNuts > 0 ? seedNuts + 18 : 0) * 0.013).toFixed(1)),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
  {
    quadrantId: 'SW',
    sampledTreeLabel: 'SW Sample Tree #1',
    scannedNutsPerTree: seedNuts > 0 ? Math.max(0, seedNuts - 12) : 0,
    estimatedWeightKgPerTree: Number((Math.max(0, seedNuts > 0 ? seedNuts - 12 : 0) * 0.013).toFixed(1)),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
  {
    quadrantId: 'SE',
    sampledTreeLabel: 'SE Sample Tree #1',
    scannedNutsPerTree: seedNuts > 0 ? seedNuts + 6 : 0,
    estimatedWeightKgPerTree: Number(((seedNuts > 0 ? seedNuts + 6 : 0) * 0.013).toFixed(1)),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
];

const INITIAL_FIELDS: OrchardFieldBlock[] = [
  {
    id: 'field-north-01',
    name: 'North Block • Main Chandler',
    variety: 'Chandler',
    plantedYear: 2019,
    treeCount: 120,
    areaHectares: 2.5,
    canopyDensity: 'standard',
    seasonYear: new Date().getFullYear(),
    latitude: 38.5449,
    longitude: -121.7405,
    fieldNote: 'Drip irrigated • 4-quadrant annual yield baseline',
    quadrants: makeDefaultQuadrants(410),
  },
  {
    id: 'field-south-02',
    name: 'South Slope • Howard Mix',
    variety: 'Howard',
    plantedYear: 2021,
    treeCount: 85,
    areaHectares: 1.8,
    canopyDensity: 'open',
    seasonYear: new Date().getFullYear(),
    latitude: 38.5412,
    longitude: -121.7378,
    fieldNote: 'Young canopy • watch spring blight moisture',
    quadrants: makeDefaultQuadrants(265),
  },
];

export interface WalnutCloudContextValue {
  isCloudConfigured: boolean;
  isSignedIn: boolean;
  isOnlineSyncReady: boolean;
  userProfile: GrowerUserProfile;
  trees: WalnutTree[];
  addOrchardTree: (name: string, variety: WalnutTree['variety']) => void;
  fields: OrchardFieldBlock[];
  addOrchardField: (
    field: Omit<OrchardFieldBlock, 'id' | 'quadrants'>
  ) => Promise<string>;
  updateOrchardField: (
    fieldId: string,
    patch: Partial<Omit<OrchardFieldBlock, 'id'>>
  ) => Promise<void>;
  updateQuadrantSample: (
    fieldId: string,
    quadrantId: QuadrantId,
    patch: Partial<QuadrantSample>
  ) => Promise<void>;
  attachQuadrantEvidenceBlob: (
    fieldId: string,
    quadrantId: QuadrantId,
    photoUri: string
  ) => Promise<void>;
  careSetup: OrchardCareSetup;
  updateCareSetup: (patch: Partial<OrchardCareSetup>) => void;
  resetCareSetupToDefaults: () => void;
  updateGrowerPreferences: (patch: {
    experienceLevel?: GrowerExperienceLevel;
    notificationTopics?: string[];
    pushNotificationsEnabled?: boolean;
  }) => Promise<void>;
  publishedCareBanner: string | null;
  careFeed: CareFeedItem[];
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
  experienceLevel: 'experienced',
  notificationTopics: [...DEFAULT_NOTIFICATION_TOPICS],
  pushNotificationsEnabled: true,
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
  const updateCarePreferencesMutation = useMutation(
    anyApi.users.updateGrowerCarePreferences
  );
  const deleteAccountMutation = useMutation(anyApi.users.deleteMyAccountData);
  const syncOfflineBatchMutation = useMutation(anyApi.sync.syncOfflineBatch);
  const upsertFieldMutation = useMutation(
    anyApi.orchardFields.upsertOrchardField
  );
  const generateEvidenceUrlMutation = useMutation(
    anyApi.orchardFields.generateEvidenceUploadUrl
  );
  const attachEvidenceMutation = useMutation(
    anyApi.orchardFields.attachQuadrantEvidence
  );
  const liveCareDefaults = useQuery(anyApi.careBroadcasts.getCareDefaults) as
    | { dailyGuidanceNote?: string }
    | null
    | undefined;
  const liveCareFeed = useQuery(anyApi.careBroadcasts.listMyCareFeed) as
    | CareFeedItem[]
    | undefined;

  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [fields, setFields] = useState<OrchardFieldBlock[]>(INITIAL_FIELDS);
  const [localCache, setLocalCache] = useState<LocalCachedRecord[]>(() =>
    loadOfflineCacheFromSqlite()
  );
  const [syncMode, setSyncMode] = useState<'auto' | 'manual'>('auto');
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [careSetup, setCareSetup] =
    useState<OrchardCareSetup>(DEFAULT_CARE_SETUP);
  const [experienceLevel, setExperienceLevel] =
    useState<GrowerExperienceLevel>('experienced');
  const [notificationTopics, setNotificationTopics] = useState<string[]>([
    ...DEFAULT_NOTIFICATION_TOPICS,
  ]);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState<boolean>(true);

  const isSignedIn = Boolean(clerkSignedIn);

  const userProfile: GrowerUserProfile = useMemo(() => {
    if (!user) {
      return {
        ...DEFAULT_PROFILE,
        experienceLevel,
        notificationTopics,
        pushNotificationsEnabled,
      };
    }
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
      experienceLevel,
      notificationTopics,
      pushNotificationsEnabled,
    };
  }, [
    user,
    careSetup.locationZone,
    experienceLevel,
    notificationTopics,
    pushNotificationsEnabled,
  ]);

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

  const updateGrowerPreferences = async (patch: {
    experienceLevel?: GrowerExperienceLevel;
    notificationTopics?: string[];
    pushNotificationsEnabled?: boolean;
  }) => {
    const nextLevel = patch.experienceLevel ?? experienceLevel;
    const nextTopics = patch.notificationTopics ?? notificationTopics;
    const nextPush =
      patch.pushNotificationsEnabled ?? pushNotificationsEnabled;

    setExperienceLevel(nextLevel);
    setNotificationTopics(nextTopics);
    setPushNotificationsEnabled(nextPush);

    if (convexAuthenticated && isSignedIn) {
      try {
        await updateCarePreferencesMutation({
          experienceLevel: nextLevel,
          notificationTopics: nextTopics,
          pushNotificationsEnabled: nextPush,
          region: careSetup.locationZone,
          orchardName: userProfile.orchardName,
        });
        setLastSyncMessage(
          `Saved ${nextLevel.toUpperCase()} care & notification preferences to cloud.`
        );
      } catch (err) {
        console.warn('Failed to sync grower preferences:', err);
      }
    } else {
      setLastSyncMessage(
        `Saved ${nextLevel.toUpperCase()} care preferences locally (will sync when signed in).`
      );
    }
  };

  const syncFieldToConvex = async (field: OrchardFieldBlock) => {
    if (!convexAuthenticated || !isSignedIn) return;
    try {
      await upsertFieldMutation({
        localFieldId: field.id,
        name: field.name,
        variety: field.variety,
        plantedYear: field.plantedYear,
        treeCount: field.treeCount,
        areaHectares: field.areaHectares,
        canopyDensity: field.canopyDensity,
        seasonYear: field.seasonYear,
        latitude: field.latitude,
        longitude: field.longitude,
        treeSpacingMeters: field.treeSpacingMeters ?? DEFAULT_TREE_SPACING_METERS,
        boundaryPins: field.boundaryPins,
        fieldNote: field.fieldNote,
        quadrants: field.quadrants.map((q) => ({
          quadrantId: q.quadrantId,
          allocatedTrees: q.allocatedTrees,
          sampledTreeLabel: q.sampledTreeLabel,
          scannedNutsPerTree: q.scannedNutsPerTree,
          estimatedWeightKgPerTree: q.estimatedWeightKgPerTree,
          note: q.note,
          updatedAtMs: q.updatedAtMs,
        })),
      });
    } catch (err) {
      console.warn('Convex field sync failed:', err);
    }
  };

  const addOrchardField = async (
    field: Omit<OrchardFieldBlock, 'id' | 'quadrants'>
  ) => {
    const newField: OrchardFieldBlock = {
      ...field,
      id: `field-${Date.now()}`,
      treeSpacingMeters: field.treeSpacingMeters ?? DEFAULT_TREE_SPACING_METERS,
      quadrants: buildFieldSections(field.treeCount, makeDefaultQuadrants(0)),
    };
    setFields((prev) => [newField, ...prev]);
    await syncFieldToConvex(newField);
    return newField.id;
  };

  const updateOrchardField = async (
    fieldId: string,
    patch: Partial<Omit<OrchardFieldBlock, 'id'>>
  ) => {
    let updatedField: OrchardFieldBlock | null = null;
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const nextTreeCount = patch.treeCount ?? f.treeCount;
        const nextQuadrants =
          patch.quadrants ??
          (patch.treeCount !== undefined
            ? buildFieldSections(nextTreeCount, f.quadrants)
            : f.quadrants);
        updatedField = { ...f, ...patch, quadrants: nextQuadrants };
        return updatedField;
      })
    );
    if (updatedField) {
      await syncFieldToConvex(updatedField);
    }
  };

  const updateQuadrantSample = async (
    fieldId: string,
    quadrantId: QuadrantId,
    patch: Partial<QuadrantSample>
  ) => {
    let updatedField: OrchardFieldBlock | null = null;
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        updatedField = {
          ...f,
          quadrants: f.quadrants.map((q) =>
            q.quadrantId === quadrantId
              ? { ...q, ...patch, updatedAtMs: Date.now() }
              : q
          ),
        };
        return updatedField;
      })
    );
    if (updatedField) {
      await syncFieldToConvex(updatedField);
    }
  };

  const attachQuadrantEvidenceBlob = async (
    fieldId: string,
    quadrantId: QuadrantId,
    photoUri: string
  ) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id !== fieldId
          ? f
          : {
              ...f,
              quadrants: f.quadrants.map((q) =>
                q.quadrantId === quadrantId
                  ? {
                      ...q,
                      evidenceCount: q.evidenceCount + 1,
                      evidenceLocalUris: [...q.evidenceLocalUris, photoUri],
                      updatedAtMs: Date.now(),
                    }
                  : q
              ),
            }
      )
    );
    addOfflineFieldRecord(
      'YOLO_SCAN',
      `Insurance Evidence Blob • ${fieldId} (${quadrantId})`,
      1850
    );

    if (convexAuthenticated && isSignedIn) {
      try {
        const uploadUrl = await generateEvidenceUrlMutation({});
        const fileResp = await fetch(photoUri);
        const blob = await fileResp.blob();
        const postResp = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
          body: blob,
        });
        const json = await postResp.json();
        if (json?.storageId) {
          await attachEvidenceMutation({
            localFieldId: fieldId,
            quadrantId,
            storageId: json.storageId,
          });
          setLastSyncMessage(
            `Uploaded insurance evidence photo blob for ${quadrantId}.`
          );
        }
      } catch (err) {
        console.warn('Evidence blob upload queued locally:', err);
      }
    }
  };

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: true,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    trees,
    addOrchardTree,
    fields,
    addOrchardField,
    updateOrchardField,
    updateQuadrantSample,
    attachQuadrantEvidenceBlob,
    careSetup,
    updateCareSetup,
    resetCareSetupToDefaults,
    updateGrowerPreferences,
    publishedCareBanner: liveCareDefaults?.dailyGuidanceNote?.trim() || null,
    careFeed: liveCareFeed ?? [],
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
  const [fields, setFields] = useState<OrchardFieldBlock[]>(INITIAL_FIELDS);
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

  const updateGrowerPreferences = async (patch: {
    experienceLevel?: GrowerExperienceLevel;
    notificationTopics?: string[];
    pushNotificationsEnabled?: boolean;
  }) => {
    setUserProfile((prev) => ({
      ...prev,
      experienceLevel: patch.experienceLevel ?? prev.experienceLevel,
      notificationTopics: patch.notificationTopics ?? prev.notificationTopics,
      pushNotificationsEnabled:
        patch.pushNotificationsEnabled ?? prev.pushNotificationsEnabled,
    }));
    setLastSyncMessage('Updated local grower experience & notification settings.');
  };

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: false,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    trees,
    addOrchardTree,
    fields,
    addOrchardField: async (field) => {
      const id = `field-${Date.now()}`;
      setFields((prev) => [
        {
          ...field,
          id,
          treeSpacingMeters:
            field.treeCount > 0
              ? field.treeSpacingMeters ?? DEFAULT_TREE_SPACING_METERS
              : DEFAULT_TREE_SPACING_METERS,
          quadrants: buildFieldSections(
            field.treeCount,
            makeDefaultQuadrants(0)
          ),
        },
        ...prev,
      ]);
      return id;
    },
    updateOrchardField: async (fieldId, patch) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id !== fieldId) return f;
          const nextTreeCount = patch.treeCount ?? f.treeCount;
          const nextQuadrants =
            patch.quadrants ??
            (patch.treeCount !== undefined
              ? buildFieldSections(nextTreeCount, f.quadrants)
              : f.quadrants);
          return { ...f, ...patch, quadrants: nextQuadrants };
        })
      );
    },
    updateQuadrantSample: async (fieldId, quadrantId, patch) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id !== fieldId
            ? f
            : {
                ...f,
                quadrants: f.quadrants.map((q) =>
                  q.quadrantId === quadrantId
                    ? { ...q, ...patch, updatedAtMs: Date.now() }
                    : q
                ),
              }
        )
      );
    },
    attachQuadrantEvidenceBlob: async (fieldId, quadrantId, photoUri) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id !== fieldId
            ? f
            : {
                ...f,
                quadrants: f.quadrants.map((q) =>
                  q.quadrantId === quadrantId
                    ? {
                        ...q,
                        evidenceCount: q.evidenceCount + 1,
                        evidenceLocalUris: [...q.evidenceLocalUris, photoUri],
                        updatedAtMs: Date.now(),
                      }
                    : q
                ),
              }
        )
      );
    },
    careSetup,
    updateCareSetup: (patch) =>
      setCareSetup((prev) => ({ ...prev, ...patch, isCustomizedByUser: true })),
    resetCareSetupToDefaults: () => setCareSetup(DEFAULT_CARE_SETUP),
    updateGrowerPreferences,
    publishedCareBanner: null,
    careFeed: [],
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
