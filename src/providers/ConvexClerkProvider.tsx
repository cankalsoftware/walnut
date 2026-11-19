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
  useSignUp,
  useUser,
} from '@clerk/expo';
import {
  ConvexReactClient,
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { anyApi } from 'convex/server';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import {
  LOCAL_RETENTION_DAYS,
  LocalCachedRecord,
  purgeExpiredSyncedCache,
} from '../services/offlineSyncService';
import {
  clearAllSqliteCache,
  deleteMarketplaceDraftInSqlite,
  insertOfflineRecordToSqlite,
  loadMarketplaceDraftsFromSqlite,
  loadOfflineCacheFromSqlite,
  markMarketplaceDraftSyncedInSqlite,
  markRecordsSyncedInSqlite,
  MarketplaceDraftRecord,
  purgeExpiredSyncedInSqlite,
  upsertMarketplaceDraftInSqlite,
} from '../services/sqliteCache';
import {
  BoundaryPin,
  buildFieldSections,
  DEFAULT_TREE_SPACING_METERS,
} from '../utils/orchardGeometry';
import { INITIAL_TREES, WalnutTree } from '../data/walnutLifecycle';
import {
  AccountType,
  CurrencyCode,
  CropForm,
  DEMO_BUY_REQUESTS,
  DEMO_MARKETPLACE_LISTINGS,
  DEMO_MARKET_PULSE,
  DEMO_WHOLESALERS,
  DryingMethod,
  KernelGrade,
  LoadingLogistics,
  LotStage,
  MarketplaceListingItem,
  MarketplaceMessageItem,
  MarketplaceThreadItem,
  MarketPulseItem,
  PackagingType,
  PhotoSlotKey,
  RoleGroupMessageItem,
  TrustFeedbackPublicItem,
  WholesalerBuyRequestItem,
  WholesalerDirectoryItem,
} from '../data/marketplaceDemo';
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
  phone: string;
  whatsapp?: string;
  authProvider: 'google' | 'email' | 'phone';
  accountType: AccountType;
  enableOrchardTools: boolean;
  isMarketplaceOnboardingComplete: boolean;
  isWholesalerProfileComplete: boolean;
  trustedSellerCount: number;
  trustedBuyerCount: number;
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

export interface PublishCropListingInput {
  listingId?: string;
  localDraftId?: string;
  orchardFieldLocalId?: string;
  title: string;
  description: string;
  variety: string;
  lotStage: LotStage;
  form: CropForm;
  availableKg: number;
  minOrderKg?: number;
  avgDiameterMm?: number;
  kernelGrade: KernelGrade;
  moisturePct?: number;
  packagingType: PackagingType;
  dryingMethod: DryingMethod;
  loadingLogistics: LoadingLogistics;
  pricingMode: 'fixed_per_kg' | 'contact_for_quote';
  pricePerKg?: number;
  currency: CurrencyCode;
  region: string;
  rawLat?: number;
  rawLng?: number;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  allowInAppChat: boolean;
  photoUris: Array<{ slotKey: PhotoSlotKey; localUri: string; storageId?: string }>;
}

export interface WholesalerProfileInput {
  companyName: string;
  contactName: string;
  region: string;
  rawLat?: number;
  rawLng?: number;
  bio: string;
  howWeWork: string;
  preferredVarieties: string[];
  minPurchaseKg?: number;
  maxPurchaseKg?: number;
  phone?: string;
  whatsapp?: string;
  email?: string;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  allowInAppChat: boolean;
}

export interface BuyRequestInput {
  requestId?: string;
  title: string;
  variety: string;
  form: CropForm;
  kernelGrade?: KernelGrade;
  minDiameterMm?: number;
  targetKg: number;
  targetPricePerKg?: number;
  currency: CurrencyCode;
  region: string;
  note: string;
  status: 'active' | 'closed';
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
    estimatedWeightKgPerTree: Number(
      ((seedNuts > 0 ? seedNuts + 18 : 0) * 0.013).toFixed(1)
    ),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
  {
    quadrantId: 'SW',
    sampledTreeLabel: 'SW Sample Tree #1',
    scannedNutsPerTree: seedNuts > 0 ? Math.max(0, seedNuts - 12) : 0,
    estimatedWeightKgPerTree: Number(
      (Math.max(0, seedNuts > 0 ? seedNuts - 12 : 0) * 0.013).toFixed(1)
    ),
    note: '',
    evidenceCount: 0,
    evidenceLocalUris: [],
    updatedAtMs: Date.now(),
  },
  {
    quadrantId: 'SE',
    sampledTreeLabel: 'SE Sample Tree #1',
    scannedNutsPerTree: seedNuts > 0 ? seedNuts + 6 : 0,
    estimatedWeightKgPerTree: Number(
      ((seedNuts > 0 ? seedNuts + 6 : 0) * 0.013).toFixed(1)
    ),
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
    treeCount: 80,
    areaHectares: 1.6,
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
  lastRecoveryCode: string | null;
  clearLastRecoveryCode: () => void;
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
  marketplaceDrafts: MarketplaceDraftRecord[];
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
  registerWithPhone: (params: {
    displayName: string;
    phone: string;
    password: string;
    email?: string;
    accountType: AccountType;
    enableOrchardTools?: boolean;
  }) => Promise<{ ok: boolean; recoveryCode?: string }>;
  signInWithPhone: (phone: string, password: string) => Promise<boolean>;
  completeMarketplaceOnboarding: (params: {
    displayName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    accountType: AccountType;
    enableOrchardTools?: boolean;
  }) => Promise<boolean>;
  setEnableOrchardTools: (enabled: boolean) => Promise<void>;
  saveAccountSettings: (params: {
    displayName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    accountType: AccountType;
    enableOrchardTools: boolean;
    experienceLevel?: GrowerExperienceLevel;
    notificationTopics?: string[];
    pushNotificationsEnabled?: boolean;
  }) => Promise<{ ok: boolean; error?: string; recoveryCode?: string }>;
  signOutToOfflineMode: () => Promise<void>;
  deleteAccountAndData: () => Promise<boolean>;
  syncPendingToConvex: () => Promise<{ syncedCount: number }>;
  runFourteenDayAutoPurge: () => { purgedCount: number; freedMb: number };
  addOfflineFieldRecord: (
    recordType: LocalCachedRecord['recordType'],
    title: string,
    sizeKb?: number
  ) => void;
  // Marketplace state & actions
  marketplaceListings: MarketplaceListingItem[];
  myListings: MarketplaceListingItem[];
  wholesalers: WholesalerDirectoryItem[];
  myWholesalerProfile: WholesalerProfileInput | null;
  buyRequests: WholesalerBuyRequestItem[];
  marketplaceThreads: MarketplaceThreadItem[];
  activeThreadId: string | null;
  setActiveThreadId: (threadId: string | null) => void;
  activeThreadMessages: MarketplaceMessageItem[];
  roleGroupMessages: RoleGroupMessageItem[];
  marketPulse: MarketPulseItem[];
  inspectingUserId: string | null;
  setInspectingUserId: (userId: string | null) => void;
  inspectingTrustFeedback: TrustFeedbackPublicItem[];
  publishOrUpdateCropListing: (input: PublishCropListingInput) => Promise<string | null>;
  saveOfflineCropDraft: (
    input: PublishCropListingInput,
    draftState: 'EDITING' | 'QUEUED_PUBLISH'
  ) => string;
  deleteOfflineCropDraft: (localDraftId: string) => void;
  syncPendingMarketplaceDrafts: () => Promise<{ syncedCount: number }>;
  updateListingStatus: (
    listingId: string,
    status: 'active' | 'negotiating' | 'sold' | 'archived'
  ) => Promise<void>;
  saveWholesalerBuyerProfile: (input: WholesalerProfileInput) => Promise<boolean>;
  saveWholesalerBuyRequest: (input: BuyRequestInput) => Promise<void>;
  openOrCreateB2BThread: (params: {
    listingId?: string;
    buyRequestId?: string;
    counterpartyUserId: string;
  }) => Promise<string | null>;
  revealContactAndStartThread: (params: {
    listingId?: string;
    counterpartyUserId: string;
  }) => Promise<{
    threadId: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  } | null>;
  sendB2BMessage: (threadId: string, body: string) => Promise<void>;
  sendB2BStructuredAction: (
    threadId: string,
    payload:
      | { kind: 'sample_request'; sampleWeightKg: number; addressNote: string }
      | {
          kind: 'price_offer';
          quantityKg: number;
          pricePerKg: number;
          currency: CurrencyCode;
          pickupWindow: string;
        }
      | {
          kind: 'exact_gps_pin';
          latitude: number;
          longitude: number;
          fieldLabel: string;
        }
  ) => Promise<void>;
  postRoleGroupMessage: (text: string) => Promise<void>;
  awardCounterpartyBadge: (params: {
    threadId: string;
    recipientUserId: string;
    badgeType: 'trusted_seller' | 'trusted_buyer';
    comment: string;
  }) => Promise<boolean>;
  submitBadgeDispute: (feedbackId: string, disputeReason: string) => Promise<void>;
  submitContentReport: (params: {
    targetType:
      | 'listing'
      | 'wholesaler_profile'
      | 'buy_request'
      | 'thread_message'
      | 'group_message';
    targetId: string;
    reportedUserId: string;
    reason: string;
  }) => Promise<void>;
  blockUserAccount: (targetUserId: string) => Promise<void>;
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
  email: '',
  phone: '',
  authProvider: 'phone',
  accountType: 'producer',
  enableOrchardTools: false,
  isMarketplaceOnboardingComplete: false,
  isWholesalerProfileComplete: false,
  trustedSellerCount: 0,
  trustedBuyerCount: 0,
  region: 'Central Valley / Zone 8b',
  orchardName: 'My Walnut Orchard',
  experienceLevel: 'experienced',
  notificationTopics: [...DEFAULT_NOTIFICATION_TOPICS],
  pushNotificationsEnabled: true,
};

const WalnutCloudContext = createContext<WalnutCloudContextValue | undefined>(
  undefined
);

function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  return `WQ-${seg()}-${seg()}`;
}

function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('Enter a valid mobile number with country code (8–15 digits).');
  }
  return `+${digits}`;
}

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
 * Live Clerk + Convex + SQLite State Provider
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
  const { signUp } = useSignUp();

  const isSignedIn = Boolean(clerkSignedIn);
  const canQueryCloud = Boolean(isSignedIn && convexAuthenticated);

  const syncUserMutation = useMutation(anyApi.users.syncCurrentUser);
  const completeOnboardingMutation = useMutation(
    anyApi.users.completeMarketplaceOnboarding
  );
  const updateDualRoleMutation = useMutation(
    anyApi.users.updateDualRolePreference
  );
  const updateAccountSettingsMutation = useMutation(
    anyApi.users.updateAccountSettings
  );
  const updateCarePreferencesMutation = useMutation(
    anyApi.users.updateGrowerCarePreferences
  );
  const deleteAccountMutation = useMutation(anyApi.users.deleteMyAccountData);
  const deleteClerkAndConvexAction = useAction(
    anyApi.users.deleteClerkAndConvexAccount
  );
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

  // Marketplace mutations
  const generateListingPhotoUrlMutation = useMutation(
    anyApi.marketplace.generateListingPhotoUrl
  );
  const createOrUpdateListingMutation = useMutation(
    anyApi.marketplace.createOrUpdateListing
  );
  const markListingStatusMutation = useMutation(
    anyApi.marketplace.markListingStatus
  );
  const upsertWholesalerProfileMutation = useMutation(
    anyApi.marketplace.upsertWholesalerProfile
  );
  const upsertBuyRequestMutation = useMutation(
    anyApi.marketplace.upsertBuyRequest
  );
  const getOrCreateThreadMutation = useMutation(
    anyApi.marketplace.getOrCreateThread
  );
  const revealContactMutation = useMutation(
    anyApi.marketplace.revealContactAndEnsureThread
  );
  const sendThreadMessageMutation = useMutation(
    anyApi.marketplace.sendThreadMessage
  );
  const sendStructuredActionMutation = useMutation(
    anyApi.marketplace.sendStructuredAction
  );
  const sendRoleGroupMessageMutation = useMutation(
    anyApi.marketplace.sendRoleGroupMessage
  );
  const awardTrustBadgeMutation = useMutation(
    anyApi.marketplace.awardTrustBadge
  );
  const requestDisputeMutation = useMutation(
    anyApi.marketplace.requestBadgeRemovalDispute
  );
  const reportContentMutation = useMutation(
    anyApi.marketplace.reportMarketplaceContent
  );
  const blockUserMutation = useMutation(anyApi.marketplace.blockMarketplaceUser);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);
  const [lastRecoveryCode, setLastRecoveryCode] = useState<string | null>(null);
  const [optimisticAccountType, setOptimisticAccountType] =
    useState<AccountType | null>(null);
  const [optimisticOrchardTools, setOptimisticOrchardTools] = useState<
    boolean | null
  >(null);

  // Cloud queries — always 'skip' when unauthenticated so guests never hit live DB
  const liveUserRoleInfo = useQuery(
    anyApi.users.getUserRole,
    canQueryCloud ? {} : 'skip'
  ) as
    | {
        role: 'admin' | 'grower';
        isAdmin: boolean;
        accountType: AccountType | null;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        displayName: string | null;
        enableOrchardTools: boolean;
        marketplaceOnboardingComplete: boolean;
        trustedSellerCount: number;
        trustedBuyerCount: number;
        isWholesalerProfileComplete: boolean;
      }
    | undefined;

  const liveCareDefaults = useQuery(anyApi.careBroadcasts.getCareDefaults) as
    | { dailyGuidanceNote?: string }
    | null
    | undefined;
  const liveCareFeed = useQuery(
    anyApi.careBroadcasts.listMyCareFeed,
    canQueryCloud ? {} : 'skip'
  ) as CareFeedItem[] | undefined;

  const liveListings = useQuery(
    anyApi.marketplace.listMarketplaceListings,
    canQueryCloud ? {} : 'skip'
  ) as MarketplaceListingItem[] | undefined;

  const liveMyListings = useQuery(
    anyApi.marketplace.listMyListings,
    canQueryCloud ? {} : 'skip'
  ) as MarketplaceListingItem[] | undefined;

  const liveWholesalers = useQuery(
    anyApi.marketplace.listWholesalers,
    canQueryCloud ? {} : 'skip'
  ) as WholesalerDirectoryItem[] | undefined;

  const liveMyWholesalerProfile = useQuery(
    anyApi.marketplace.getMyWholesalerProfile,
    canQueryCloud ? {} : 'skip'
  ) as
    | {
        companyName: string;
        contactName: string;
        region: string;
        bio: string;
        howWeWork: string;
        preferredVarieties: string[];
        minPurchaseKg?: number;
        maxPurchaseKg?: number;
        contact: {
          phone: string;
          whatsapp?: string;
          email?: string;
          showPhone: boolean;
          showWhatsapp: boolean;
          showEmail: boolean;
          allowInAppChat: boolean;
        };
      }
    | null
    | undefined;

  const liveBuyRequests = useQuery(
    anyApi.marketplace.listActiveBuyRequests,
    canQueryCloud ? {} : 'skip'
  ) as WholesalerBuyRequestItem[] | undefined;

  const liveThreads = useQuery(
    anyApi.marketplace.listMyThreads,
    canQueryCloud ? {} : 'skip'
  ) as MarketplaceThreadItem[] | undefined;

  const liveThreadMessages = useQuery(
    anyApi.marketplace.listThreadMessages,
    canQueryCloud && activeThreadId ? { threadId: activeThreadId } : 'skip'
  ) as MarketplaceMessageItem[] | undefined;

  const currentAccountType: AccountType =
    optimisticAccountType ?? liveUserRoleInfo?.accountType ?? 'producer';
  const currentEnableOrchardTools =
    optimisticOrchardTools ?? liveUserRoleInfo?.enableOrchardTools ?? false;
  const roleChannelId: 'sellers_only' | 'buyers_only' =
    currentAccountType === 'wholesaler' ? 'buyers_only' : 'sellers_only';

  useEffect(() => {
    if (
      optimisticAccountType &&
      liveUserRoleInfo?.accountType === optimisticAccountType
    ) {
      setOptimisticAccountType(null);
    }
    if (
      optimisticOrchardTools !== null &&
      liveUserRoleInfo?.enableOrchardTools === optimisticOrchardTools
    ) {
      setOptimisticOrchardTools(null);
    }
  }, [
    liveUserRoleInfo?.accountType,
    liveUserRoleInfo?.enableOrchardTools,
    optimisticAccountType,
    optimisticOrchardTools,
  ]);

  const liveRoleMessages = useQuery(
    anyApi.marketplace.listRoleGroupMessages,
    canQueryCloud && liveUserRoleInfo?.accountType
      ? { channelId: roleChannelId }
      : 'skip'
  ) as RoleGroupMessageItem[] | undefined;

  const liveMarketPulse = useQuery(
    anyApi.marketplace.getMarketPulseStats,
    canQueryCloud ? {} : 'skip'
  ) as MarketPulseItem[] | undefined;

  const liveTrustFeedback = useQuery(
    anyApi.marketplace.listTrustFeedbackForUser,
    canQueryCloud && inspectingUserId ? { targetUserId: inspectingUserId } : 'skip'
  ) as TrustFeedbackPublicItem[] | undefined;

  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [fields, setFields] = useState<OrchardFieldBlock[]>(INITIAL_FIELDS);
  const [localCache, setLocalCache] = useState<LocalCachedRecord[]>(() =>
    loadOfflineCacheFromSqlite()
  );
  const [marketplaceDrafts, setMarketplaceDrafts] = useState<
    MarketplaceDraftRecord[]
  >(() => loadMarketplaceDraftsFromSqlite());
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

  const userProfile: GrowerUserProfile = useMemo(() => {
    if (!user) {
      return {
        ...DEFAULT_PROFILE,
        experienceLevel,
        notificationTopics,
        pushNotificationsEnabled,
      };
    }
    const clerkEmail = user.primaryEmailAddress?.emailAddress ?? '';
    const safeEmail =
      liveUserRoleInfo?.email ||
      (clerkEmail.endsWith('@phone.walnutiq.app') ? '' : clerkEmail);
    const name =
      liveUserRoleInfo?.displayName ||
      user.fullName ||
      user.firstName ||
      'WalnutIQ User';
    const hasGoogle = user.externalAccounts?.some(
      (acc) => acc.provider === 'google'
    );
    return {
      clerkId: user.id,
      displayName: name,
      email: safeEmail,
      phone: liveUserRoleInfo?.phone ?? '',
      whatsapp: liveUserRoleInfo?.whatsapp ?? undefined,
      authProvider: hasGoogle ? 'google' : user.username?.startsWith('phone_') ? 'phone' : 'email',
      accountType: currentAccountType,
      enableOrchardTools: currentEnableOrchardTools,
      isMarketplaceOnboardingComplete:
        liveUserRoleInfo?.marketplaceOnboardingComplete ?? false,
      isWholesalerProfileComplete:
        liveUserRoleInfo?.isWholesalerProfileComplete ?? false,
      trustedSellerCount: liveUserRoleInfo?.trustedSellerCount ?? 0,
      trustedBuyerCount: liveUserRoleInfo?.trustedBuyerCount ?? 0,
      region:
        liveMyWholesalerProfile?.region ||
        (currentAccountType === 'wholesaler'
          ? 'Regional Trade Hub'
          : careSetup.locationZone),
      orchardName: `${name}'s Walnut Orchard`,
      experienceLevel,
      notificationTopics,
      pushNotificationsEnabled,
    };
  }, [
    user,
    liveUserRoleInfo,
    liveMyWholesalerProfile?.region,
    currentAccountType,
    currentEnableOrchardTools,
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
        displayName:
          user.fullName || user.firstName || userProfile.displayName || 'Walnut Grower',
        authProvider: userProfile.authProvider,
      }).catch((err) => {
        console.warn('Convex user sync failed:', err);
      });
    }
  }, [convexAuthenticated, isSignedIn, user]);

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
          'Signed in with Google • Complete mobile number & role setup if prompted.'
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

  const signInWithEmail = async (email: string, password?: string) => {
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
          `Sign-in failed: ${error.longMessage || error.message}`
        );
        return;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize();
        setLastSyncMessage(`Signed in via Clerk • Convex sync active.`);
      } else {
        setLastSyncMessage('Complete verification steps to finish signing in.');
      }
    } catch (err) {
      setLastSyncMessage(
        `Sign-in failed: ${err instanceof Error ? err.message : 'Invalid credentials'}`
      );
    }
  };

  const registerWithPhone = async (params: {
    displayName: string;
    phone: string;
    password: string;
    email?: string;
    accountType: AccountType;
    enableOrchardTools?: boolean;
  }): Promise<{ ok: boolean; recoveryCode?: string }> => {
    if (!signUp) {
      setLastSyncMessage('Clerk registration is still initializing...');
      return { ok: false };
    }
    try {
      const normalizedPhone = normalizePhoneDigits(params.phone);
      const digitsOnly = normalizedPhone.slice(1);
      const username = `phone_${digitsOnly}`;
      const cleanName = params.displayName.trim();
      if (cleanName.length < 2) {
        throw new Error('Enter your full name or orchard/company name.');
      }
      if (params.password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      const { error } = await signUp.password({
        username,
        password: params.password,
        firstName: cleanName,
      });
      if (error) {
        setLastSyncMessage(
          `Registration failed: ${error.longMessage || error.message}`
        );
        return { ok: false };
      }

      if (signUp.status !== 'complete') {
        setLastSyncMessage(
          `Registration requires additional Clerk check (${signUp.status}). Ensure Username + Password auth is enabled in Clerk.`
        );
        return { ok: false };
      }

      await signUp.finalize();
      const recoveryCode = generateRecoveryCode();
      setLastRecoveryCode(recoveryCode);
      setOptimisticAccountType(params.accountType);
      setOptimisticOrchardTools(params.enableOrchardTools ?? false);

      // Brief tick for Convex auth context, then persist role + phone
      setTimeout(() => {
        void completeOnboardingMutation({
          displayName: cleanName,
          phone: normalizedPhone,
          email: params.email?.trim() || undefined,
          accountType: params.accountType,
          enableOrchardTools: params.enableOrchardTools ?? false,
          recoveryCode,
        }).catch((err) => {
          console.warn('Deferred onboarding sync error:', err);
        });
      }, 600);

      setLastSyncMessage(
        `Account created for ${normalizedPhone} as ${params.accountType.toUpperCase()}. Save your recovery code!`
      );
      return { ok: true, recoveryCode };
    } catch (err) {
      setLastSyncMessage(
        err instanceof Error ? err.message : 'Phone registration failed'
      );
      return { ok: false };
    }
  };

  const signInWithPhone = async (
    phone: string,
    password: string
  ): Promise<boolean> => {
    if (!signIn) {
      setLastSyncMessage('Clerk authentication is still loading...');
      return false;
    }
    try {
      const normalizedPhone = normalizePhoneDigits(phone);
      const username = `phone_${normalizedPhone.slice(1)}`;
      const { error } = await signIn.password({
        identifier: username,
        password,
      });
      if (error) {
        setLastSyncMessage(
          `Phone sign-in failed: ${error.longMessage || error.message}`
        );
        return false;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize();
        setLastSyncMessage(`Signed in with ${normalizedPhone} • Cloud active.`);
        return true;
      }
      setLastSyncMessage(`Sign-in status: ${signIn.status}`);
      return false;
    } catch (err) {
      setLastSyncMessage(
        err instanceof Error ? err.message : 'Phone sign-in failed'
      );
      return false;
    }
  };

  const completeMarketplaceOnboarding = async (params: {
    displayName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    accountType: AccountType;
    enableOrchardTools?: boolean;
  }): Promise<boolean> => {
    try {
      const recoveryCode = generateRecoveryCode();
      await completeOnboardingMutation({
        displayName: params.displayName.trim(),
        phone: normalizePhoneDigits(params.phone),
        whatsapp: params.whatsapp?.trim()
          ? normalizePhoneDigits(params.whatsapp)
          : undefined,
        email: params.email?.trim() || undefined,
        accountType: params.accountType,
        enableOrchardTools: params.enableOrchardTools ?? false,
        recoveryCode,
      });
      setOptimisticAccountType(params.accountType);
      setOptimisticOrchardTools(params.enableOrchardTools ?? false);
      setLastRecoveryCode(recoveryCode);
      setLastSyncMessage(
        `Saved Marketplace profile (${params.accountType.toUpperCase()} • ${normalizePhoneDigits(params.phone)}).`
      );
      return true;
    } catch (err) {
      setLastSyncMessage(
        err instanceof Error ? err.message : 'Could not save onboarding details'
      );
      return false;
    }
  };

  const setEnableOrchardTools = async (enabled: boolean) => {
    try {
      setOptimisticOrchardTools(enabled);
      await updateDualRoleMutation({ enableOrchardTools: enabled });
      setLastSyncMessage(
        enabled
          ? 'Orchard Grower Mode enabled alongside your Wholesaler account.'
          : 'Switched back to clean Wholesaler Portal mode.'
      );
    } catch (err) {
      setOptimisticOrchardTools(null);
      setLastSyncMessage(
        err instanceof Error ? err.message : 'Failed to toggle Orchard Mode'
      );
    }
  };

  const saveAccountSettings: WalnutCloudContextValue['saveAccountSettings'] =
    async (params) => {
      const cleanName = params.displayName.trim();
      const effectiveOrchard =
        params.accountType === 'wholesaler' ? params.enableOrchardTools : false;
      try {
        if (cleanName.length < 2) {
          throw new Error('Display name must be at least 2 characters.');
        }
        const normalizedPhone = normalizePhoneDigits(params.phone);
        const normalizedWhatsapp = params.whatsapp?.trim()
          ? normalizePhoneDigits(params.whatsapp)
          : undefined;

        setOptimisticAccountType(params.accountType);
        setOptimisticOrchardTools(effectiveOrchard);
        if (params.experienceLevel !== undefined) {
          setExperienceLevel(params.experienceLevel);
        }
        if (params.notificationTopics !== undefined) {
          setNotificationTopics(params.notificationTopics);
        }
        if (params.pushNotificationsEnabled !== undefined) {
          setPushNotificationsEnabled(params.pushNotificationsEnabled);
        }

        if (!liveUserRoleInfo?.marketplaceOnboardingComplete) {
          const recoveryCode = generateRecoveryCode();
          await completeOnboardingMutation({
            displayName: cleanName,
            phone: normalizedPhone,
            whatsapp: normalizedWhatsapp,
            email: params.email?.trim() || undefined,
            accountType: params.accountType,
            enableOrchardTools: effectiveOrchard,
            recoveryCode,
          });
          if (
            params.experienceLevel !== undefined &&
            params.notificationTopics !== undefined &&
            params.pushNotificationsEnabled !== undefined
          ) {
            await updateCarePreferencesMutation({
              experienceLevel: params.experienceLevel,
              notificationTopics: params.notificationTopics,
              pushNotificationsEnabled: params.pushNotificationsEnabled,
              region: careSetup.locationZone,
              orchardName: `${cleanName}'s Walnut Orchard`,
            }).catch(() => {});
          }
          setLastRecoveryCode(recoveryCode);
          setLastSyncMessage(
            `Saved account settings (${params.accountType.toUpperCase()}). Save your recovery code!`
          );
          return { ok: true, recoveryCode };
        }

        await updateAccountSettingsMutation({
          displayName: cleanName,
          phone: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          email: params.email?.trim() || undefined,
          accountType: params.accountType,
          enableOrchardTools: effectiveOrchard,
          experienceLevel: params.experienceLevel,
          notificationTopics: params.notificationTopics,
          pushNotificationsEnabled: params.pushNotificationsEnabled,
        });
        setLastSyncMessage(
          `Saved account settings (${params.accountType === 'wholesaler' ? (effectiveOrchard ? 'Dual-Role Wholesaler + Orchard' : 'Wholesaler Buyer') : 'Producer / Grower'}).`
        );
        return { ok: true };
      } catch (err) {
        setOptimisticAccountType(null);
        setOptimisticOrchardTools(null);
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not save account settings.';
        setLastSyncMessage(msg);
        return { ok: false, error: msg };
      }
    };

  const signOutToOfflineMode = async () => {
    try {
      setOptimisticAccountType(null);
      setOptimisticOrchardTools(null);
      await signOut();
      setLastSyncMessage(
        'Signed out to Offline Mode. Local SQLite records remain safe on your phone.'
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
        // Attempt atomic server-side Clerk + Convex deletion first
        try {
          const actionRes = (await deleteClerkAndConvexAction({})) as {
            clerkDeletedServerSide: boolean;
            deletedCount: number;
          };
          if (actionRes?.clerkDeletedServerSide) {
            setOptimisticAccountType(null);
            setOptimisticOrchardTools(null);
            clearAllSqliteCache();
            setLocalCache([]);
            setMarketplaceDrafts([]);
            await signOut();
            setLastSyncMessage(
              'Account, Clerk login, Convex records, and local SQLite cache permanently deleted.'
            );
            return true;
          }
        } catch {
          // Fallback to client-initiated deletion sequence below
        }

        // Order: delete Convex data, clear SQLite, then remove Clerk user (handling reverification cleanly)
        await deleteAccountMutation({});
        clearAllSqliteCache();
        setLocalCache([]);
        setMarketplaceDrafts([]);
        try {
          await user.delete();
        } catch (clerkErr) {
          setLastSyncMessage(
            `Cloud & local data erased, but Clerk requires recent sign-in to close your login (${clerkErr instanceof Error ? clerkErr.message : 're-sign in and retry'}).`
          );
          return false;
        }
      }
      setOptimisticAccountType(null);
      setOptimisticOrchardTools(null);
      await signOut();
      setLastSyncMessage(
        'Your WalnutIQ account, Convex data, and local SQLite cache have been permanently deleted.'
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
        `Synced ${acks.length} SQLite record(s) to Convex. 14-day local retention timer started.`
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
      `14-Day SQLite Auto-Purge complete: Removed ${result.purgedCount} synced record(s) older than ${LOCAL_RETENTION_DAYS} days (${result.freedMb} MB freed).`
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
      `Saved "${title}" to local SQLite queue (Offline Safe • Pending Convex upload).`
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

  // Two-phase Marketplace photo + listing upload helper
  const publishOrUpdateCropListing = async (
    input: PublishCropListingInput
  ): Promise<string | null> => {
    const uploadedSlots: Array<{ slotKey: PhotoSlotKey; storageId: string }> =
      [];

    for (const item of input.photoUris.slice(0, 5)) {
      if (item.storageId) {
        uploadedSlots.push({
          slotKey: item.slotKey,
          storageId: item.storageId,
        });
        continue;
      }
      if (!item.localUri) continue;
      const uploadUrl = await generateListingPhotoUrlMutation({});
      const fileResp = await fetch(item.localUri);
      const blob = await fileResp.blob();
      const postResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const json = await postResp.json();
      if (json?.storageId) {
        uploadedSlots.push({
          slotKey: item.slotKey,
          storageId: json.storageId,
        });
      }
    }

    const res = (await createOrUpdateListingMutation({
      listingId: input.listingId as any,
      localDraftId: input.localDraftId,
      orchardFieldLocalId: input.orchardFieldLocalId,
      title: input.title,
      description: input.description,
      variety: input.variety,
      lotStage: input.lotStage,
      form: input.form,
      availableKg: input.availableKg,
      minOrderKg: input.minOrderKg,
      avgDiameterMm: input.avgDiameterMm,
      kernelGrade: input.kernelGrade,
      moisturePct: input.moisturePct,
      packagingType: input.packagingType,
      dryingMethod: input.dryingMethod,
      loadingLogistics: input.loadingLogistics,
      pricingMode: input.pricingMode,
      pricePerKg: input.pricePerKg,
      currency: input.currency,
      region: input.region,
      rawLat: input.rawLat,
      rawLng: input.rawLng,
      contactPhone: input.contactPhone,
      contactWhatsapp: input.contactWhatsapp,
      contactEmail: input.contactEmail,
      showPhone: input.showPhone,
      showWhatsapp: input.showWhatsapp,
      showEmail: input.showEmail,
      allowInAppChat: input.allowInAppChat,
      photoSlots: uploadedSlots,
    })) as { listingId: string };

    setLastSyncMessage(`Published "${input.title}" to Walnut Marketplace.`);
    return res?.listingId ?? null;
  };

  const saveOfflineCropDraft = (
    input: PublishCropListingInput,
    draftState: 'EDITING' | 'QUEUED_PUBLISH'
  ): string => {
    const localDraftId = input.localDraftId || `draft-${Date.now()}`;
    const draft: MarketplaceDraftRecord = {
      localDraftId,
      title: input.title || `${input.variety} Draft`,
      variety: input.variety,
      availableKg: input.availableKg,
      payloadJson: JSON.stringify({ ...input, localDraftId }),
      photoSlotsLocalJson: JSON.stringify(input.photoUris),
      draftState,
      updatedAtMs: Date.now(),
    };
    upsertMarketplaceDraftInSqlite(draft);
    setMarketplaceDrafts(loadMarketplaceDraftsFromSqlite());
    setLastSyncMessage(
      draftState === 'QUEUED_PUBLISH'
        ? `Saved "${draft.title}" to offline publish queue.`
        : `Saved "${draft.title}" as local draft in SQLite.`
    );
    return localDraftId;
  };

  const deleteOfflineCropDraft = (localDraftId: string) => {
    deleteMarketplaceDraftInSqlite(localDraftId);
    setMarketplaceDrafts(loadMarketplaceDraftsFromSqlite());
  };

  const syncPendingMarketplaceDrafts = async (): Promise<{
    syncedCount: number;
  }> => {
    const queued = marketplaceDrafts.filter(
      (d) => d.draftState === 'QUEUED_PUBLISH'
    );
    if (queued.length === 0 || !canQueryCloud) {
      return { syncedCount: 0 };
    }
    let syncedCount = 0;
    for (const draft of queued) {
      try {
        const parsed = JSON.parse(draft.payloadJson) as PublishCropListingInput;
        await publishOrUpdateCropListing({
          ...parsed,
          localDraftId: draft.localDraftId,
        });
        markMarketplaceDraftSyncedInSqlite(draft.localDraftId);
        syncedCount++;
      } catch (err) {
        console.warn('Draft publish retry deferred:', err);
      }
    }
    setMarketplaceDrafts(loadMarketplaceDraftsFromSqlite());
    return { syncedCount };
  };

  useEffect(() => {
    const hasQueued = marketplaceDrafts.some(
      (d) => d.draftState === 'QUEUED_PUBLISH'
    );
    if (
      canQueryCloud &&
      userProfile.isMarketplaceOnboardingComplete &&
      hasQueued
    ) {
      void syncPendingMarketplaceDrafts();
    }
  }, [canQueryCloud, userProfile.isMarketplaceOnboardingComplete]);

  const normalizedMyWholesalerProfile: WholesalerProfileInput | null =
    liveMyWholesalerProfile
      ? {
          companyName: liveMyWholesalerProfile.companyName,
          contactName: liveMyWholesalerProfile.contactName,
          region: liveMyWholesalerProfile.region,
          bio: liveMyWholesalerProfile.bio,
          howWeWork: liveMyWholesalerProfile.howWeWork,
          preferredVarieties: liveMyWholesalerProfile.preferredVarieties,
          minPurchaseKg: liveMyWholesalerProfile.minPurchaseKg,
          maxPurchaseKg: liveMyWholesalerProfile.maxPurchaseKg,
          phone: liveMyWholesalerProfile.contact.phone,
          whatsapp: liveMyWholesalerProfile.contact.whatsapp,
          email: liveMyWholesalerProfile.contact.email,
          showPhone: liveMyWholesalerProfile.contact.showPhone,
          showWhatsapp: liveMyWholesalerProfile.contact.showWhatsapp,
          showEmail: liveMyWholesalerProfile.contact.showEmail,
          allowInAppChat: liveMyWholesalerProfile.contact.allowInAppChat,
        }
      : null;

  const contextValue: WalnutCloudContextValue = {
    isCloudConfigured: true,
    isSignedIn,
    isOnlineSyncReady: isSignedIn,
    userProfile,
    lastRecoveryCode,
    clearLastRecoveryCode: () => setLastRecoveryCode(null),
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
    careFeed: canQueryCloud ? liveCareFeed ?? [] : [],
    localCache,
    marketplaceDrafts,
    syncMode,
    setSyncMode,
    pendingUploadCount,
    eligibleForPurgeCount,
    lastSyncMessage,
    signInWithGoogle,
    signInWithEmail,
    registerWithPhone,
    signInWithPhone,
    completeMarketplaceOnboarding,
    setEnableOrchardTools,
    saveAccountSettings,
    signOutToOfflineMode,
    deleteAccountAndData,
    syncPendingToConvex,
    runFourteenDayAutoPurge,
    addOfflineFieldRecord,
    marketplaceListings: canQueryCloud
      ? liveListings ?? []
      : DEMO_MARKETPLACE_LISTINGS,
    myListings: canQueryCloud ? liveMyListings ?? [] : [],
    wholesalers: canQueryCloud ? liveWholesalers ?? [] : DEMO_WHOLESALERS,
    myWholesalerProfile: normalizedMyWholesalerProfile,
    buyRequests: canQueryCloud ? liveBuyRequests ?? [] : DEMO_BUY_REQUESTS,
    marketplaceThreads: canQueryCloud ? liveThreads ?? [] : [],
    activeThreadId,
    setActiveThreadId,
    activeThreadMessages: canQueryCloud ? liveThreadMessages ?? [] : [],
    roleGroupMessages: canQueryCloud ? liveRoleMessages ?? [] : [],
    marketPulse: canQueryCloud ? liveMarketPulse ?? [] : DEMO_MARKET_PULSE,
    inspectingUserId,
    setInspectingUserId,
    inspectingTrustFeedback: canQueryCloud ? liveTrustFeedback ?? [] : [],
    publishOrUpdateCropListing,
    saveOfflineCropDraft,
    deleteOfflineCropDraft,
    syncPendingMarketplaceDrafts,
    updateListingStatus: async (listingId, status) => {
      await markListingStatusMutation({ listingId: listingId as any, status });
    },
    saveWholesalerBuyerProfile: async (input) => {
      const res = (await upsertWholesalerProfileMutation(input)) as {
        isProfileComplete: boolean;
      };
      setLastSyncMessage('Wholesaler Buyer Profile saved.');
      return Boolean(res?.isProfileComplete);
    },
    saveWholesalerBuyRequest: async (input) => {
      await upsertBuyRequestMutation({
        ...input,
        requestId: input.requestId as any,
      });
      setLastSyncMessage(`Buy request "${input.title}" updated.`);
    },
    openOrCreateB2BThread: async (params) => {
      const res = (await getOrCreateThreadMutation({
        listingId: params.listingId as any,
        buyRequestId: params.buyRequestId as any,
        counterpartyUserId: params.counterpartyUserId,
      })) as { threadId: string };
      setActiveThreadId(res?.threadId ?? null);
      return res?.threadId ?? null;
    },
    revealContactAndStartThread: async (params) => {
      const res = (await revealContactMutation({
        listingId: params.listingId as any,
        counterpartyUserId: params.counterpartyUserId,
      })) as {
        threadId: string | null;
        contact: {
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
        } | null;
      };
      if (res?.threadId) setActiveThreadId(res.threadId);
      return {
        threadId: res?.threadId ?? null,
        phone: res?.contact?.phone ?? null,
        whatsapp: res?.contact?.whatsapp ?? null,
        email: res?.contact?.email ?? null,
      };
    },
    sendB2BMessage: async (threadId, body) => {
      await sendThreadMessageMutation({ threadId: threadId as any, body });
    },
    sendB2BStructuredAction: async (threadId, payload) => {
      await sendStructuredActionMutation({
        threadId: threadId as any,
        payload,
      });
    },
    postRoleGroupMessage: async (text) => {
      await sendRoleGroupMessageMutation({ channelId: roleChannelId, text });
    },
    awardCounterpartyBadge: async (params) => {
      await awardTrustBadgeMutation({
        ...params,
        threadId: params.threadId as any,
      });
      setLastSyncMessage('Awarded Trusted Badge & factual feedback.');
      return true;
    },
    submitBadgeDispute: async (feedbackId, disputeReason) => {
      await requestDisputeMutation({
        feedbackId: feedbackId as any,
        disputeReason,
      });
      setLastSyncMessage('Dispute submitted to Admin for review.');
    },
    submitContentReport: async (params) => {
      await reportContentMutation(params);
      setLastSyncMessage('Report submitted for moderation review.');
    },
    blockUserAccount: async (targetUserId) => {
      await blockUserMutation({ targetUserId });
      setLastSyncMessage('User blocked and hidden from your Marketplace feed.');
    },
  };

  return (
    <WalnutCloudContext.Provider value={contextValue}>
      {children}
    </WalnutCloudContext.Provider>
  );
}

/**
 * Fallback Provider when `.env.local` keys are absent (local SQLite + Demo Marketplace)
 */
function FallbackLocalStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] =
    useState<GrowerUserProfile>(DEFAULT_PROFILE);
  const [lastRecoveryCode, setLastRecoveryCode] = useState<string | null>(null);
  const [trees, setTrees] = useState<WalnutTree[]>(INITIAL_TREES);
  const [fields, setFields] = useState<OrchardFieldBlock[]>(INITIAL_FIELDS);
  const [localCache, setLocalCache] = useState<LocalCachedRecord[]>(() =>
    loadOfflineCacheFromSqlite()
  );
  const [marketplaceDrafts, setMarketplaceDrafts] = useState<
    MarketplaceDraftRecord[]
  >(() => loadMarketplaceDraftsFromSqlite());
  const [syncMode, setSyncMode] = useState<'auto' | 'manual'>('auto');
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [careSetup, setCareSetup] =
    useState<OrchardCareSetup>(DEFAULT_CARE_SETUP);

  const [listings, setListings] = useState<MarketplaceListingItem[]>(
    DEMO_MARKETPLACE_LISTINGS
  );
  const [wholesalers, setWholesalers] =
    useState<WholesalerDirectoryItem[]>(DEMO_WHOLESALERS);
  const [myWholesalerProfile, setMyWholesalerProfile] =
    useState<WholesalerProfileInput | null>(null);
  const [buyRequests, setBuyRequests] =
    useState<WholesalerBuyRequestItem[]>(DEMO_BUY_REQUESTS);
  const [threads, setThreads] = useState<MarketplaceThreadItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messagesByThread, setMessagesByThread] = useState<
    Record<string, MarketplaceMessageItem[]>
  >({});
  const [roleMessages, setRoleMessages] = useState<RoleGroupMessageItem[]>([]);
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);

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
    lastRecoveryCode,
    clearLastRecoveryCode: () => setLastRecoveryCode(null),
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
    updateGrowerPreferences: async (patch) => {
      setUserProfile((prev) => ({
        ...prev,
        experienceLevel: patch.experienceLevel ?? prev.experienceLevel,
        notificationTopics: patch.notificationTopics ?? prev.notificationTopics,
        pushNotificationsEnabled:
          patch.pushNotificationsEnabled ?? prev.pushNotificationsEnabled,
      }));
      setLastSyncMessage('Updated local grower experience preferences.');
    },
    publishedCareBanner: null,
    careFeed: [],
    localCache,
    marketplaceDrafts,
    syncMode,
    setSyncMode,
    pendingUploadCount: localCache.filter(
      (r) => r.syncStatus === 'PENDING_UPLOAD'
    ).length,
    eligibleForPurgeCount: purgeExpiredSyncedCache(localCache).purgedCount,
    lastSyncMessage,
    signInWithGoogle: async () => {
      setIsSignedIn(true);
      setLastSyncMessage('Signed in (Local Demo Mode).');
    },
    signInWithEmail: async (email) => {
      const cleanEmail = email.trim();
      setUserProfile((p) => ({
        ...p,
        email: cleanEmail,
        displayName: cleanEmail ? cleanEmail.split('@')[0] : p.displayName,
        authProvider: 'email',
      }));
      setIsSignedIn(true);
      setLastSyncMessage('Signed in (Local Demo Mode).');
    },
    registerWithPhone: async (params) => {
      const code = generateRecoveryCode();
      setLastRecoveryCode(code);
      setUserProfile((p) => ({
        ...p,
        displayName: params.displayName.trim(),
        phone: normalizePhoneDigits(params.phone),
        email: params.email?.trim() || '',
        authProvider: 'phone',
        accountType: params.accountType,
        enableOrchardTools: params.enableOrchardTools ?? false,
        isMarketplaceOnboardingComplete: true,
      }));
      setIsSignedIn(true);
      setLastSyncMessage(
        `Registered ${params.phone} as ${params.accountType.toUpperCase()} (Local Demo).`
      );
      return { ok: true, recoveryCode: code };
    },
    signInWithPhone: async (phone) => {
      setUserProfile((p) => ({
        ...p,
        phone: normalizePhoneDigits(phone),
        authProvider: 'phone',
      }));
      setIsSignedIn(true);
      return true;
    },
    completeMarketplaceOnboarding: async (params) => {
      const code = generateRecoveryCode();
      setLastRecoveryCode(code);
      setUserProfile((p) => ({
        ...p,
        displayName: params.displayName.trim(),
        phone: normalizePhoneDigits(params.phone),
        whatsapp: params.whatsapp?.trim()
          ? normalizePhoneDigits(params.whatsapp)
          : undefined,
        email: params.email?.trim() || '',
        accountType: params.accountType,
        enableOrchardTools: params.enableOrchardTools ?? false,
        isMarketplaceOnboardingComplete: true,
      }));
      return true;
    },
    setEnableOrchardTools: async (enabled) => {
      setUserProfile((p) => ({ ...p, enableOrchardTools: enabled }));
    },
    saveAccountSettings: async (params) => {
      try {
        const cleanName = params.displayName.trim();
        if (cleanName.length < 2) {
          throw new Error('Display name must be at least 2 characters.');
        }
        const normalizedPhone = normalizePhoneDigits(params.phone);
        const effectiveOrchard =
          params.accountType === 'wholesaler' ? params.enableOrchardTools : false;
        setUserProfile((p) => ({
          ...p,
          displayName: cleanName,
          phone: normalizedPhone,
          whatsapp: params.whatsapp?.trim()
            ? normalizePhoneDigits(params.whatsapp)
            : p.whatsapp,
          email: params.email?.trim() || p.email,
          accountType: params.accountType,
          enableOrchardTools: effectiveOrchard,
          isMarketplaceOnboardingComplete: true,
          region:
            params.accountType === 'wholesaler'
              ? 'Regional Trade Hub'
              : careSetup.locationZone,
          experienceLevel: params.experienceLevel ?? p.experienceLevel,
          notificationTopics: params.notificationTopics ?? p.notificationTopics,
          pushNotificationsEnabled:
            params.pushNotificationsEnabled ?? p.pushNotificationsEnabled,
        }));
        setLastSyncMessage(
          `Saved account settings (${params.accountType.toUpperCase()} • Local Mode).`
        );
        return { ok: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to save settings.';
        setLastSyncMessage(msg);
        return { ok: false, error: msg };
      }
    },
    signOutToOfflineMode: async () => {
      setIsSignedIn(false);
      setLastSyncMessage('Switched to Offline Mode.');
    },
    deleteAccountAndData: async () => {
      clearAllSqliteCache();
      setLocalCache([]);
      setMarketplaceDrafts([]);
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
    marketplaceListings: listings,
    myListings: listings.filter((l) => l.userId === userProfile.clerkId),
    wholesalers,
    myWholesalerProfile,
    buyRequests,
    marketplaceThreads: threads,
    activeThreadId,
    setActiveThreadId,
    activeThreadMessages: activeThreadId
      ? messagesByThread[activeThreadId] ?? []
      : [],
    roleGroupMessages: roleMessages,
    marketPulse: DEMO_MARKET_PULSE,
    inspectingUserId,
    setInspectingUserId,
    inspectingTrustFeedback: [],
    publishOrUpdateCropListing: async (input) => {
      const id = input.listingId ?? `listing-${Date.now()}`;
      const item: MarketplaceListingItem = {
        _id: id,
        userId: userProfile.clerkId,
        producerName: userProfile.displayName,
        trustedSellerCount: userProfile.trustedSellerCount,
        verifiedOrchardSummary: input.orchardFieldLocalId
          ? { treeCount: 120, plantedYear: 2019, sampledDiameterMm: input.avgDiameterMm }
          : null,
        title: input.title,
        description: input.description,
        variety: input.variety,
        lotStage: input.lotStage,
        form: input.form,
        availableKg: input.availableKg,
        minOrderKg: input.minOrderKg ?? null,
        avgDiameterMm: input.avgDiameterMm ?? null,
        kernelGrade: input.kernelGrade,
        moisturePct: input.moisturePct ?? null,
        packagingType: input.packagingType,
        dryingMethod: input.dryingMethod,
        loadingLogistics: input.loadingLogistics,
        pricingMode: input.pricingMode,
        pricePerKg: input.pricePerKg ?? null,
        currency: input.currency,
        region: input.region,
        approxLat: null,
        approxLng: null,
        distanceKm: null,
        photos: input.photoUris.map((p) => ({
          slotKey: p.slotKey,
          storageId: p.storageId ?? 'local',
          url: p.localUri,
        })),
        contact: {
          phone: input.showPhone ? input.contactPhone || userProfile.phone : null,
          whatsapp: input.showWhatsapp ? input.contactWhatsapp || null : null,
          email: input.showEmail ? input.contactEmail || null : null,
          showPhone: input.showPhone,
          showWhatsapp: input.showWhatsapp,
          showEmail: input.showEmail,
          allowInAppChat: input.allowInAppChat,
          contactLockedReason: null,
        },
        status: 'active',
        updatedAtMs: Date.now(),
      };
      setListings((prev) => [item, ...prev.filter((l) => l._id !== id)]);
      return id;
    },
    saveOfflineCropDraft: (input, draftState) => {
      const localDraftId = input.localDraftId || `draft-${Date.now()}`;
      upsertMarketplaceDraftInSqlite({
        localDraftId,
        title: input.title || `${input.variety} Draft`,
        variety: input.variety,
        availableKg: input.availableKg,
        payloadJson: JSON.stringify({ ...input, localDraftId }),
        photoSlotsLocalJson: JSON.stringify(input.photoUris),
        draftState,
        updatedAtMs: Date.now(),
      });
      setMarketplaceDrafts(loadMarketplaceDraftsFromSqlite());
      return localDraftId;
    },
    deleteOfflineCropDraft: (localDraftId) => {
      deleteMarketplaceDraftInSqlite(localDraftId);
      setMarketplaceDrafts(loadMarketplaceDraftsFromSqlite());
    },
    syncPendingMarketplaceDrafts: async () => ({ syncedCount: 0 }),
    updateListingStatus: async (listingId, status) => {
      setListings((prev) =>
        prev.map((l) => (l._id === listingId ? { ...l, status } : l))
      );
    },
    saveWholesalerBuyerProfile: async (input) => {
      setMyWholesalerProfile(input);
      const isComplete = Boolean(
        input.companyName &&
          input.contactName &&
          (input.phone || userProfile.phone) &&
          input.region &&
          input.bio &&
          input.howWeWork
      );
      setUserProfile((p) => ({ ...p, isWholesalerProfileComplete: isComplete }));
      setWholesalers((prev) => [
        {
          _id: `buyer-${userProfile.clerkId}`,
          userId: userProfile.clerkId,
          companyName: input.companyName,
          contactName: input.contactName,
          region: input.region,
          bio: input.bio,
          howWeWork: input.howWeWork,
          preferredVarieties: input.preferredVarieties,
          minPurchaseKg: input.minPurchaseKg ?? null,
          maxPurchaseKg: input.maxPurchaseKg ?? null,
          trustedBuyerCount: userProfile.trustedBuyerCount,
          contact: {
            phone: input.showPhone ? input.phone || userProfile.phone : null,
            whatsapp: input.showWhatsapp ? input.whatsapp || null : null,
            email: input.showEmail ? input.email || null : null,
            showPhone: input.showPhone,
            showWhatsapp: input.showWhatsapp,
            showEmail: input.showEmail,
            allowInAppChat: input.allowInAppChat,
            contactLockedReason: null,
          },
          updatedAtMs: Date.now(),
        },
        ...prev.filter((w) => w.userId !== userProfile.clerkId),
      ]);
      return isComplete;
    },
    saveWholesalerBuyRequest: async (input) => {
      const id = input.requestId ?? `req-${Date.now()}`;
      setBuyRequests((prev) => [
        {
          _id: id,
          userId: userProfile.clerkId,
          companyName:
            myWholesalerProfile?.companyName || userProfile.displayName,
          ...input,
          updatedAtMs: Date.now(),
        },
        ...prev.filter((r) => r._id !== id),
      ]);
    },
    openOrCreateB2BThread: async (params) => {
      const tid = `thread-${Date.now()}`;
      setThreads((prev) => [
        {
          _id: tid,
          listingId: params.listingId,
          buyRequestId: params.buyRequestId,
          producerUserId:
            userProfile.accountType === 'producer'
              ? userProfile.clerkId
              : params.counterpartyUserId,
          wholesalerUserId:
            userProfile.accountType === 'wholesaler'
              ? userProfile.clerkId
              : params.counterpartyUserId,
          subjectTitle: 'Walnut Trade Inquiry (Demo)',
          hasProducerReplied: false,
          hasWholesalerReplied: false,
          lastMessageAtMs: Date.now(),
          lastMessagePreview: 'Thread opened',
        },
        ...prev,
      ]);
      setActiveThreadId(tid);
      return tid;
    },
    revealContactAndStartThread: async (params) => ({
      threadId: params.listingId ?? null,
      phone: '+15550100000',
      whatsapp: '+15550100000',
      email: null,
    }),
    sendB2BMessage: async (threadId, body) => {
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          {
            _id: `msg-${Date.now()}`,
            threadId,
            senderUserId: userProfile.clerkId,
            senderRole: userProfile.accountType,
            messageType: 'text',
            body,
            createdAtMs: Date.now(),
          },
        ],
      }));
    },
    sendB2BStructuredAction: async (threadId, payload) => {
      const body =
        payload.kind === 'sample_request'
          ? `Requested ${payload.sampleWeightKg} kg crack sample`
          : payload.kind === 'price_offer'
          ? `Trade Offer: ${payload.quantityKg} kg @ ${payload.pricePerKg} ${payload.currency}/kg`
          : `Exact Orchard GPS: ${payload.fieldLabel}`;
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          {
            _id: `msg-${Date.now()}`,
            threadId,
            senderUserId: userProfile.clerkId,
            senderRole: userProfile.accountType,
            messageType: payload.kind,
            body,
            structuredPayload: payload,
            createdAtMs: Date.now(),
          },
        ],
      }));
    },
    postRoleGroupMessage: async (text) => {
      setRoleMessages((prev) => [
        ...prev,
        {
          _id: `rmsg-${Date.now()}`,
          channelId:
            userProfile.accountType === 'wholesaler'
              ? 'buyers_only'
              : 'sellers_only',
          senderClerkId: userProfile.clerkId,
          senderName: userProfile.displayName,
          senderRole:
            userProfile.accountType === 'wholesaler'
              ? 'Wholesaler Buyer'
              : 'Walnut Producer',
          senderRegion: userProfile.region,
          text,
          createdAtMs: Date.now(),
        },
      ]);
    },
    awardCounterpartyBadge: async () => true,
    submitBadgeDispute: async () => {},
    submitContentReport: async () => {},
    blockUserAccount: async () => {},
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
