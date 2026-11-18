export type AccountType = 'producer' | 'wholesaler';
export type CurrencyCode = 'USD' | 'TRY' | 'EUR';
export type CropForm = 'in_shell' | 'shelled_kernel';
export type LotStage = 'pre_harvest' | 'harvesting' | 'in_storage';
export type KernelGrade = 'extra_light' | 'light' | 'amber' | 'mixed';
export type PackagingType =
  | 'bulk_bin'
  | 'mesh_25kg'
  | 'jute_50kg'
  | 'big_bag_1t'
  | 'buyer_bags';
export type DryingMethod =
  | 'green_in_hull'
  | 'washed_wet'
  | 'mechanical_dryer'
  | 'sun_dried';
export type LoadingLogistics = 'farm_gate_forklift' | 'producer_delivers';
export type PhotoSlotKey =
  | 'pile'
  | 'caliber'
  | 'crack_test'
  | 'kernel_color'
  | 'storage';

export const PHOTO_SLOT_LABELS: Record<PhotoSlotKey, string> = {
  pile: 'Whole In-Shell Pile / Bin',
  caliber: 'Caliber Size Check (mm / ruler)',
  crack_test: '10-Nut Crack Test',
  kernel_color: 'Kernel Color Grade',
  storage: 'Orchard / Storage Condition',
};

export interface MarketplaceContactDto {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  allowInAppChat: boolean;
  contactLockedReason: 'complete_buyer_profile' | 'guest_demo' | null;
}

export interface MarketplaceListingItem {
  _id: string;
  userId: string;
  producerName: string;
  trustedSellerCount: number;
  verifiedOrchardSummary: {
    treeCount: number;
    plantedYear: number;
    sampledDiameterMm?: number;
  } | null;
  title: string;
  description: string;
  variety: string;
  lotStage: LotStage;
  form: CropForm;
  availableKg: number;
  minOrderKg: number | null;
  avgDiameterMm: number | null;
  kernelGrade: KernelGrade;
  moisturePct: number | null;
  packagingType: PackagingType;
  dryingMethod: DryingMethod;
  loadingLogistics: LoadingLogistics;
  pricingMode: 'fixed_per_kg' | 'contact_for_quote';
  pricePerKg: number | null;
  currency: CurrencyCode;
  region: string;
  approxLat: number | null;
  approxLng: number | null;
  distanceKm: number | null;
  photos: Array<{
    slotKey: PhotoSlotKey;
    storageId: string;
    url: string | null;
  }>;
  contact: MarketplaceContactDto;
  status: 'active' | 'negotiating' | 'sold' | 'archived';
  updatedAtMs: number;
}

export interface WholesalerDirectoryItem {
  _id: string;
  userId: string;
  companyName: string;
  contactName: string;
  region: string;
  bio: string;
  howWeWork: string;
  preferredVarieties: string[];
  minPurchaseKg: number | null;
  maxPurchaseKg: number | null;
  trustedBuyerCount: number;
  contact: MarketplaceContactDto;
  updatedAtMs: number;
}

export interface WholesalerBuyRequestItem {
  _id: string;
  userId: string;
  companyName: string;
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
  updatedAtMs: number;
}

export interface MarketplaceThreadItem {
  _id: string;
  listingId?: string;
  buyRequestId?: string;
  producerUserId: string;
  wholesalerUserId: string;
  subjectTitle: string;
  hasProducerReplied: boolean;
  hasWholesalerReplied: boolean;
  lastMessageAtMs: number;
  lastMessagePreview: string;
}

export interface MarketplaceMessageItem {
  _id: string;
  threadId: string;
  senderUserId: string;
  senderRole: 'producer' | 'wholesaler';
  messageType: 'text' | 'sample_request' | 'price_offer' | 'exact_gps_pin';
  body: string;
  structuredPayload?:
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
      };
  createdAtMs: number;
}

export interface RoleGroupMessageItem {
  _id: string;
  channelId: string;
  senderClerkId: string;
  senderName: string;
  senderRole: string;
  senderRegion: string;
  text: string;
  createdAtMs: number;
}

export interface MarketPulseItem {
  key: string;
  variety: string;
  form: CropForm;
  currency: CurrencyCode;
  activeListingCount: number;
  totalAvailableKg: number;
  minPricePerKg?: number;
  maxPricePerKg?: number;
  activeBuyRequestCount: number;
  totalDemandKg: number;
}

export interface TrustFeedbackPublicItem {
  _id: string;
  badgeType: 'trusted_seller' | 'trusted_buyer';
  visibilityStatus: 'published' | 'dispute_pending' | 'policy_removed';
  hiddenFromPublication: boolean;
  publicNotice: string | null;
  comment: string | null;
  canDispute: boolean;
  createdAtMs: number;
}

export const DEMO_MARKETPLACE_LISTINGS: MarketplaceListingItem[] = [
  {
    _id: 'demo-listing-1',
    userId: 'demo-producer-1',
    producerName: 'Demo Oak Ridge Walnut Orchard',
    trustedSellerCount: 4,
    verifiedOrchardSummary: {
      treeCount: 240,
      plantedYear: 2018,
      sampledDiameterMm: 35.4,
    },
    title: '2026 Cure-Ready Chandler • 34mm+ In-Shell',
    description:
      'Demo sample listing: Mechanically dried to 7.6% moisture, Extra Light kernel ratio 88%. Sign in to view real grower lots and direct contact options.',
    variety: 'Chandler',
    lotStage: 'in_storage',
    form: 'in_shell',
    availableKg: 12000,
    minOrderKg: 1000,
    avgDiameterMm: 35.4,
    kernelGrade: 'extra_light',
    moisturePct: 7.6,
    packagingType: 'big_bag_1t',
    dryingMethod: 'mechanical_dryer',
    loadingLogistics: 'farm_gate_forklift',
    pricingMode: 'fixed_per_kg',
    pricePerKg: 3.4,
    currency: 'USD',
    region: 'District Hub Demo',
    approxLat: null,
    approxLng: null,
    distanceKm: null,
    photos: [],
    contact: {
      phone: null,
      whatsapp: null,
      email: null,
      showPhone: false,
      showWhatsapp: false,
      showEmail: false,
      allowInAppChat: false,
      contactLockedReason: 'guest_demo',
    },
    status: 'active',
    updatedAtMs: Date.now() - 86400000,
  },
  {
    _id: 'demo-listing-2',
    userId: 'demo-producer-2',
    producerName: 'Demo Valley Howard Block',
    trustedSellerCount: 2,
    verifiedOrchardSummary: null,
    title: 'Pre-Harvest Reserve • Howard Orchard Lot',
    description:
      'Demo sample listing: Estimated 8.5T harvest window. Sign in to connect with real producers or publish your crop.',
    variety: 'Howard',
    lotStage: 'pre_harvest',
    form: 'in_shell',
    availableKg: 8500,
    minOrderKg: 2000,
    avgDiameterMm: 33.8,
    kernelGrade: 'light',
    moisturePct: null,
    packagingType: 'bulk_bin',
    dryingMethod: 'sun_dried',
    loadingLogistics: 'producer_delivers',
    pricingMode: 'contact_for_quote',
    pricePerKg: null,
    currency: 'USD',
    region: 'District Hub Demo',
    approxLat: null,
    approxLng: null,
    distanceKm: null,
    photos: [],
    contact: {
      phone: null,
      whatsapp: null,
      email: null,
      showPhone: false,
      showWhatsapp: false,
      showEmail: false,
      allowInAppChat: false,
      contactLockedReason: 'guest_demo',
    },
    status: 'active',
    updatedAtMs: Date.now() - 172800000,
  },
];

export const DEMO_WHOLESALERS: WholesalerDirectoryItem[] = [
  {
    _id: 'demo-buyer-1',
    userId: 'demo-wholesaler-1',
    companyName: 'Demo Anatolian Nut Trading Co.',
    contactName: 'Wholesale Purchasing Desk',
    region: 'District Hub Demo',
    bio: 'Demo buyer profile: Commercial walnut aggregator supplying domestic & export inshell/kernel packers.',
    howWeWork:
      'We inspect 100-nut samples on-farm, supply 1-ton FIBC big bags, weigh on certified truck scales, and settle bank transfer upon loading.',
    preferredVarieties: ['Chandler', 'Howard', 'Tulare'],
    minPurchaseKg: 2000,
    maxPurchaseKg: 150000,
    trustedBuyerCount: 5,
    contact: {
      phone: null,
      whatsapp: null,
      email: null,
      showPhone: false,
      showWhatsapp: false,
      showEmail: false,
      allowInAppChat: false,
      contactLockedReason: 'guest_demo',
    },
    updatedAtMs: Date.now() - 86400000,
  },
];

export const DEMO_BUY_REQUESTS: WholesalerBuyRequestItem[] = [
  {
    _id: 'demo-buyreq-1',
    userId: 'demo-wholesaler-1',
    companyName: 'Demo Anatolian Nut Trading Co.',
    title: 'Seeking 50T Chandler 34mm+ Extra Light',
    variety: 'Chandler',
    form: 'in_shell',
    kernelGrade: 'extra_light',
    minDiameterMm: 34,
    targetKg: 50000,
    targetPricePerKg: 3.3,
    currency: 'USD',
    region: 'District Hub Demo',
    note: 'Immediate pickup with certified truck scale. Sign in to contact buyers.',
    status: 'active',
    updatedAtMs: Date.now() - 43200000,
  },
];

export const DEMO_MARKET_PULSE: MarketPulseItem[] = [
  {
    key: 'Chandler:in_shell:USD',
    variety: 'Chandler',
    form: 'in_shell',
    currency: 'USD',
    activeListingCount: 1,
    totalAvailableKg: 12000,
    minPricePerKg: 3.4,
    maxPricePerKg: 3.4,
    activeBuyRequestCount: 1,
    totalDemandKg: 50000,
  },
];
