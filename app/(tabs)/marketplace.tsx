import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { HelpButton } from '../../src/components/HelpModal';
import {
  BuyRequestInput,
  PublishCropListingInput,
  WholesalerProfileInput,
  useWalnutCloud,
} from '../../src/providers/ConvexClerkProvider';
import {
  CropForm,
  CurrencyCode,
  DryingMethod,
  KernelGrade,
  LoadingLogistics,
  LotStage,
  MarketplaceListingItem,
  PHOTO_SLOT_LABELS,
  PackagingType,
  PhotoSlotKey,
  WholesalerBuyRequestItem,
  WholesalerDirectoryItem,
} from '../../src/data/marketplaceDemo';

type MarketplaceSubTab = 'crops' | 'buyers' | 'inbox';
type CropFilter =
  | 'All'
  | 'Chandler'
  | 'Howard'
  | 'Hartley'
  | 'Tulare'
  | 'In-Shell'
  | 'Kernel'
  | 'Tracked';

const PHOTO_SLOT_ORDER: PhotoSlotKey[] = [
  'pile',
  'caliber',
  'crack_test',
  'kernel_color',
  'storage',
];

const VARIETY_OPTIONS = ['Chandler', 'Howard', 'Hartley', 'Tulare', 'Fernor', 'Serr'];

const TRUST_PRESET_TAGS = [
  'Fast Payment',
  'Accurate Grading',
  'On-Time Loading',
  'Honest Weight',
  'Clean Storage',
];

const PACKAGING_LABELS: Record<PackagingType, string> = {
  bulk_bin: 'Bulk Bin',
  mesh_25kg: '25kg Mesh',
  jute_50kg: '50kg Jute',
  big_bag_1t: '1T Big-Bag',
  buyer_bags: 'Buyer Bags',
};

const DRYING_LABELS: Record<DryingMethod, string> = {
  green_in_hull: 'Green in Hull',
  washed_wet: 'Washed / Wet',
  mechanical_dryer: 'Mechanical Dryer',
  sun_dried: 'Sun Dried',
};

const LOADING_LABELS: Record<LoadingLogistics, string> = {
  farm_gate_forklift: 'Farm-Gate Forklift',
  producer_delivers: 'Producer Delivers',
};

const KERNEL_LABELS: Record<KernelGrade, string> = {
  extra_light: 'Extra Light',
  light: 'Light',
  amber: 'Amber',
  mixed: 'Mixed',
};

const LOT_STAGE_LABELS: Record<LotStage, string> = {
  pre_harvest: 'Pre-Harvest Reserve',
  harvesting: 'Harvesting Now',
  in_storage: 'Cured in Storage',
};

const CURRENCIES: CurrencyCode[] = ['USD', 'TRY', 'EUR'];

function isValidPhoneDigits(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function formatCurrency(amount: number | null | undefined, currency: CurrencyCode) {
  if (amount === null || amount === undefined) return 'Quote on inquiry';
  const sym = currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$';
  return `${sym}${amount.toFixed(2)}/kg`;
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    userProfile,
    fields,
    lastSyncMessage,
    marketplaceListings,
    myListings,
    marketplaceDrafts,
    wholesalers,
    myWholesalerProfile,
    buyRequests,
    marketplaceThreads,
    activeThreadId,
    setActiveThreadId,
    activeThreadMessages,
    inspectingUserId,
    setInspectingUserId,
    inspectingTrustFeedback,
    publishOrUpdateCropListing,
    saveOfflineCropDraft,
    deleteOfflineCropDraft,
    syncPendingMarketplaceDrafts,
    updateListingStatus,
    saveWholesalerBuyerProfile,
    saveWholesalerBuyRequest,
    openOrCreateB2BThread,
    revealContactAndStartThread,
    sendB2BMessage,
    sendB2BStructuredAction,
    awardCounterpartyBadge,
    submitBadgeDispute,
    submitContentReport,
    blockUserAccount,
  } = useWalnutCloud();

  const [subTab, setSubTab] = useState<MarketplaceSubTab>('crops');
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState<CropFilter>('All');
  const [buyersViewMode, setBuyersViewMode] = useState<'requests' | 'directory'>('requests');
  const [revealedContacts, setRevealedContacts] = useState<
    Record<string, { phone: string | null; whatsapp: string | null; email: string | null }>
  >({});

  // Publish Crop Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [cropTitle, setCropTitle] = useState('');
  const [cropDescription, setCropDescription] = useState('');
  const [cropVariety, setCropVariety] = useState('Chandler');
  const [cropLotStage, setCropLotStage] = useState<LotStage>('in_storage');
  const [cropForm, setCropForm] = useState<CropForm>('in_shell');
  const [cropAvailableKg, setCropAvailableKg] = useState('8000');
  const [cropMinOrderKg, setCropMinOrderKg] = useState('1000');
  const [cropDiameterMm, setCropDiameterMm] = useState('34.5');
  const [cropKernelGrade, setCropKernelGrade] = useState<KernelGrade>('extra_light');
  const [cropMoisturePct, setCropMoisturePct] = useState('7.5');
  const [cropPackaging, setCropPackaging] = useState<PackagingType>('big_bag_1t');
  const [cropDrying, setCropDrying] = useState<DryingMethod>('mechanical_dryer');
  const [cropLoading, setCropLoading] = useState<LoadingLogistics>('farm_gate_forklift');
  const [cropPricingMode, setCropPricingMode] = useState<'fixed_per_kg' | 'contact_for_quote'>('fixed_per_kg');
  const [cropPricePerKg, setCropPricePerKg] = useState('3.40');
  const [cropCurrency, setCropCurrency] = useState<CurrencyCode>('USD');
  const [cropRegion, setCropRegion] = useState(userProfile.region || 'Central Valley');
  const [linkedFieldId, setLinkedFieldId] = useState<string | undefined>(fields[0]?.id);
  const [cropContactPhone, setCropContactPhone] = useState(userProfile.phone || '');
  const [cropWhatsapp, setCropWhatsapp] = useState(userProfile.whatsapp || userProfile.phone || '');
  const [cropShowPhone, setCropShowPhone] = useState(true);
  const [cropShowWhatsapp, setCropShowWhatsapp] = useState(true);
  const [cropShowEmail, setCropShowEmail] = useState(false);
  const [cropAllowChat, setCropAllowChat] = useState(true);
  const [photoSlots, setPhotoSlots] = useState<Partial<Record<PhotoSlotKey, string>>>({});
  const [isSubmittingCrop, setIsSubmittingCrop] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [cropErrors, setCropErrors] = useState<Record<string, string>>({});
  const [cropSubmitError, setCropSubmitError] = useState<string | null>(null);

  // Camera modal for 5-slot checklist
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [activePhotoSlot, setActivePhotoSlot] = useState<PhotoSlotKey | null>(null);
  const [manualPhotoUriInput, setManualPhotoUriInput] = useState('');

  // Wholesaler Profile Modal State
  const [showBuyerProfileModal, setShowBuyerProfileModal] = useState(false);
  const [wpCompanyName, setWpCompanyName] = useState(myWholesalerProfile?.companyName || '');
  const [wpContactName, setWpContactName] = useState(
    myWholesalerProfile?.contactName || userProfile.displayName || ''
  );
  const [wpRegion, setWpRegion] = useState(myWholesalerProfile?.region || userProfile.region || '');
  const [wpBio, setWpBio] = useState(myWholesalerProfile?.bio || '');
  const [wpHowWeWork, setWpHowWeWork] = useState(myWholesalerProfile?.howWeWork || '');
  const [wpVarieties, setWpVarieties] = useState<string[]>(
    myWholesalerProfile?.preferredVarieties?.length
      ? myWholesalerProfile.preferredVarieties
      : ['Chandler', 'Howard']
  );
  const [wpMinKg, setWpMinKg] = useState(String(myWholesalerProfile?.minPurchaseKg ?? 2000));
  const [wpMaxKg, setWpMaxKg] = useState(String(myWholesalerProfile?.maxPurchaseKg ?? 100000));
  const [wpPhone, setWpPhone] = useState(myWholesalerProfile?.phone || userProfile.phone || '');
  const [wpWhatsapp, setWpWhatsapp] = useState(
    myWholesalerProfile?.whatsapp || userProfile.whatsapp || userProfile.phone || ''
  );
  const [wpShowPhone, setWpShowPhone] = useState(myWholesalerProfile?.showPhone ?? true);
  const [wpShowWhatsapp, setWpShowWhatsapp] = useState(myWholesalerProfile?.showWhatsapp ?? true);
  const [buyerProfileErrors, setBuyerProfileErrors] = useState<Record<string, string>>({});
  const [buyerProfileSubmitError, setBuyerProfileSubmitError] = useState<string | null>(null);
  const [buyerProfileInfoBanner, setBuyerProfileInfoBanner] = useState<string | null>(null);
  const [isSavingBuyerProfile, setIsSavingBuyerProfile] = useState(false);

  // Post Buy Request Modal State
  const [showBuyRequestModal, setShowBuyRequestModal] = useState(false);
  const [brTitle, setBrTitle] = useState('');
  const [brVariety, setBrVariety] = useState('Chandler');
  const [brForm, setBrForm] = useState<CropForm>('in_shell');
  const [brKernelGrade, setBrKernelGrade] = useState<KernelGrade>('extra_light');
  const [brMinMm, setBrMinMm] = useState('34');
  const [brTargetKg, setBrTargetKg] = useState('25000');
  const [brTargetPrice, setBrTargetPrice] = useState('3.25');
  const [brCurrency, setBrCurrency] = useState<CurrencyCode>('USD');
  const [brRegion, setBrRegion] = useState(userProfile.region || 'Central Valley');
  const [brNote, setBrNote] = useState('');
  const [buyRequestErrors, setBuyRequestErrors] = useState<Record<string, string>>({});
  const [buyRequestSubmitError, setBuyRequestSubmitError] = useState<string | null>(null);
  const [isSavingBuyRequest, setIsSavingBuyRequest] = useState(false);

  // B2B Inbox & Quick Actions State
  const [chatInput, setChatInput] = useState('');
  const [activeStructuredForm, setActiveStructuredForm] = useState<
    'sample_request' | 'price_offer' | 'exact_gps_pin' | null
  >(null);
  const [sampleKg, setSampleKg] = useState('5');
  const [sampleAddress, setSampleAddress] = useState('');
  const [offerQtyKg, setOfferQtyKg] = useState('5000');
  const [offerPriceKg, setOfferPriceKg] = useState('3.35');
  const [offerWindow, setOfferWindow] = useState('Within 7 days • certified scale');
  const [gpsLat, setGpsLat] = useState(
    fields[0]?.latitude ? String(fields[0].latitude) : '38.5449'
  );
  const [gpsLng, setGpsLng] = useState(
    fields[0]?.longitude ? String(fields[0].longitude) : '-121.7405'
  );
  const [gpsLabel, setGpsLabel] = useState(fields[0]?.name || 'Orchard Loading Gate #1');

  // Trust Badge Award & Inspector / Dispute Modals
  const [showAwardBadgeModal, setShowAwardBadgeModal] = useState(false);
  const [selectedTrustTag, setSelectedTrustTag] = useState(TRUST_PRESET_TAGS[0]);
  const [trustComment, setTrustComment] = useState('');
  const [inspectingTitle, setInspectingTitle] = useState('Marketplace Member');
  const [disputeTargetId, setDisputeTargetId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Report Modal State
  const [reportTarget, setReportTarget] = useState<{
    targetType:
      | 'listing'
      | 'wholesaler_profile'
      | 'buy_request'
      | 'thread_message'
      | 'group_message';
    targetId: string;
    reportedUserId: string;
    label: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');

  const canPublishCrops =
    userProfile.accountType === 'producer' || userProfile.enableOrchardTools;
  const isWholesaler = userProfile.accountType === 'wholesaler';

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return marketplaceListings.filter((item) => {
      if (cropFilter === 'Tracked' && !item.verifiedOrchardSummary) return false;
      if (cropFilter === 'In-Shell' && item.form !== 'in_shell') return false;
      if (cropFilter === 'Kernel' && item.form !== 'shelled_kernel') return false;
      if (
        ['Chandler', 'Howard', 'Hartley', 'Tulare'].includes(cropFilter) &&
        item.variety.toLowerCase() !== cropFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.variety.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.producerName.toLowerCase().includes(q)
      );
    });
  }, [marketplaceListings, searchQuery, cropFilter]);

  const filteredBuyRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return buyRequests.filter((req) => {
      if (!q) return true;
      return (
        req.title.toLowerCase().includes(q) ||
        req.variety.toLowerCase().includes(q) ||
        req.companyName.toLowerCase().includes(q) ||
        req.region.toLowerCase().includes(q)
      );
    });
  }, [buyRequests, searchQuery]);

  const filteredWholesalers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wholesalers.filter((w) => {
      if (!q) return true;
      return (
        w.companyName.toLowerCase().includes(q) ||
        w.region.toLowerCase().includes(q) ||
        w.bio.toLowerCase().includes(q) ||
        w.howWeWork.toLowerCase().includes(q)
      );
    });
  }, [wholesalers, searchQuery]);

  const activeThread = useMemo(
    () => marketplaceThreads.find((t) => t._id === activeThreadId) ?? null,
    [marketplaceThreads, activeThreadId]
  );

  const countMatchingRequests = (listing: MarketplaceListingItem) =>
    buyRequests.filter(
      (r) =>
        r.status === 'active' &&
        r.variety.toLowerCase() === listing.variety.toLowerCase() &&
        r.form === listing.form &&
        (r.minDiameterMm === undefined ||
          listing.avgDiameterMm === null ||
          listing.avgDiameterMm >= r.minDiameterMm)
    ).length;

  const countMatchingListings = (req: WholesalerBuyRequestItem) =>
    marketplaceListings.filter(
      (l) =>
        l.status === 'active' &&
        l.variety.toLowerCase() === req.variety.toLowerCase() &&
        l.form === req.form &&
        (req.minDiameterMm === undefined ||
          l.avgDiameterMm === null ||
          l.avgDiameterMm >= req.minDiameterMm)
    ).length;

  const requireSignedInAction = (actionLabel: string): boolean => {
    if (!isSignedIn) {
      Alert.alert(
        'Sign In Required',
        `Please sign in or register your mobile account to ${actionLabel}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Account', onPress: () => router.push('/auth') },
        ]
      );
      return false;
    }
    return true;
  };

  const buildPublishPayload = (): PublishCropListingInput => {
    const selectedField = fields.find((f) => f.id === linkedFieldId);
    const photoUris = PHOTO_SLOT_ORDER.filter((slot) => Boolean(photoSlots[slot])).map(
      (slot) => ({
        slotKey: slot,
        localUri: photoSlots[slot]!,
      })
    );

    return {
      orchardFieldLocalId: selectedField?.id,
      title:
        cropTitle.trim() ||
        `${cropVariety} • ${cropForm === 'in_shell' ? 'In-Shell' : 'Kernel'} Lot`,
      description:
        cropDescription.trim() ||
        `${cropVariety} orchard walnut lot ready for wholesale inspection.`,
      variety: cropVariety,
      lotStage: cropLotStage,
      form: cropForm,
      availableKg: Math.max(50, Number(cropAvailableKg) || 1000),
      minOrderKg: Number(cropMinOrderKg) || undefined,
      avgDiameterMm: Number(cropDiameterMm) || undefined,
      kernelGrade: cropKernelGrade,
      moisturePct: Number(cropMoisturePct) || undefined,
      packagingType: cropPackaging,
      dryingMethod: cropDrying,
      loadingLogistics: cropLoading,
      pricingMode: cropPricingMode,
      pricePerKg:
        cropPricingMode === 'fixed_per_kg' ? Number(cropPricePerKg) || 3.0 : undefined,
      currency: cropCurrency,
      region: cropRegion.trim() || userProfile.region || 'Orchard District',
      rawLat: selectedField?.latitude,
      rawLng: selectedField?.longitude,
      contactPhone: cropContactPhone.trim() || userProfile.phone,
      contactWhatsapp: cropWhatsapp.trim() || userProfile.whatsapp || userProfile.phone,
      contactEmail: userProfile.email || undefined,
      showPhone: cropShowPhone,
      showWhatsapp: cropShowWhatsapp,
      showEmail: cropShowEmail && Boolean(userProfile.email),
      allowInAppChat: cropAllowChat,
      photoUris,
    };
  };

  const openBuyerProfileModal = (reasonBanner?: string) => {
    setWpCompanyName(myWholesalerProfile?.companyName || '');
    setWpContactName(myWholesalerProfile?.contactName || userProfile.displayName || '');
    setWpRegion(myWholesalerProfile?.region || userProfile.region || '');
    setWpBio(myWholesalerProfile?.bio || '');
    setWpHowWeWork(myWholesalerProfile?.howWeWork || '');
    setWpVarieties(
      myWholesalerProfile?.preferredVarieties?.length
        ? myWholesalerProfile.preferredVarieties
        : ['Chandler', 'Howard']
    );
    setWpMinKg(String(myWholesalerProfile?.minPurchaseKg ?? 2000));
    setWpMaxKg(String(myWholesalerProfile?.maxPurchaseKg ?? 100000));
    setWpPhone(myWholesalerProfile?.phone || userProfile.phone || '');
    setWpWhatsapp(
      myWholesalerProfile?.whatsapp ||
        userProfile.whatsapp ||
        myWholesalerProfile?.phone ||
        userProfile.phone ||
        ''
    );
    setWpShowPhone(myWholesalerProfile?.showPhone ?? true);
    setWpShowWhatsapp(myWholesalerProfile?.showWhatsapp ?? true);
    setBuyerProfileErrors({});
    setBuyerProfileSubmitError(null);
    setBuyerProfileInfoBanner(reasonBanner ?? null);
    setShowBuyerProfileModal(true);
  };

  const openBuyRequestModal = () => {
    if (!userProfile.isWholesalerProfileComplete) {
      openBuyerProfileModal(
        'Complete all required (*) fields in your Buyer Profile below first — this unlocks posting Buy Requests and revealing seller phone numbers.'
      );
      return;
    }
    setBrRegion(myWholesalerProfile?.region || userProfile.region || '');
    setBuyRequestErrors({});
    setBuyRequestSubmitError(null);
    setShowBuyRequestModal(true);
  };

  const openPublishCropModal = () => {
    setCropRegion(userProfile.region || '');
    setCropContactPhone(userProfile.phone || '');
    setCropWhatsapp(userProfile.whatsapp || userProfile.phone || '');
    setCropErrors({});
    setCropSubmitError(null);
    setShowPublishModal(true);
  };

  const validateCropForm = (requirePhotoForLive: boolean): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (cropTitle.trim().length < 3) {
      errs.title = 'Enter a crop lot title (at least 3 characters).';
    }
    const kg = Number(cropAvailableKg);
    if (!Number.isFinite(kg) || kg < 50) {
      errs.availableKg = 'Enter at least 50 kg available.';
    }
    if (cropPricingMode === 'fixed_per_kg') {
      const p = Number(cropPricePerKg);
      if (!Number.isFinite(p) || p <= 0) {
        errs.pricePerKg = 'Enter a valid ask price/kg (or choose Contact for Quote).';
      }
    }
    if (cropRegion.trim().length < 2) {
      errs.region = 'Enter your growing region or district.';
    }
    if (cropDescription.trim().length < 10) {
      errs.description = 'Add a short description (at least 10 characters: grade, moisture, harvest timing).';
    }
    const photoCount = PHOTO_SLOT_ORDER.filter((slot) => Boolean(photoSlots[slot])).length;
    if (requirePhotoForLive && cropLotStage !== 'pre_harvest' && photoCount === 0) {
      errs.photos = 'Attach at least 1 photo for Harvesting or Cured in Storage lots (optional for Pre-Harvest).';
    }
    if (!cropShowPhone && !cropAllowChat) {
      errs.contactChannel = 'Enable at least Show Phone or Allow In-App B2B Chat.';
    }
    const effectivePhone = cropContactPhone.trim() || userProfile.phone;
    if (cropShowPhone && !isValidPhoneDigits(effectivePhone)) {
      errs.contactPhone = 'Enter a valid 8–15 digit phone number with country code.';
    }
    return errs;
  };

  const handlePublishLive = async () => {
    if (!requireSignedInAction('publish a live crop listing')) return;
    const errs = validateCropForm(true);
    setCropErrors(errs);
    if (Object.keys(errs).length > 0) {
      setCropSubmitError(
        `Please fix ${Object.keys(errs).length} missing or invalid field(s) highlighted in red above.`
      );
      return;
    }
    setCropSubmitError(null);
    setIsSubmittingCrop(true);
    try {
      const payload = buildPublishPayload();
      const id = await publishOrUpdateCropListing(payload);
      if (id) {
        setShowPublishModal(false);
        setActionNotice({
          type: 'success',
          message: `Published "${payload.title}" to Walnut Marketplace.`,
        });
      }
    } catch (err: any) {
      setCropSubmitError(
        err?.message ?? 'Could not publish right now. You can save as an offline draft.'
      );
    } finally {
      setIsSubmittingCrop(false);
    }
  };

  const handleSaveOfflineDraft = () => {
    const errs = validateCropForm(false);
    setCropErrors(errs);
    if (Object.keys(errs).length > 0) {
      setCropSubmitError(
        `Please fix ${Object.keys(errs).length} required field(s) highlighted in red above before saving draft.`
      );
      return;
    }
    setCropSubmitError(null);
    const payload = buildPublishPayload();
    saveOfflineCropDraft(payload, 'QUEUED_PUBLISH');
    setShowPublishModal(false);
    setActionNotice({
      type: 'success',
      message: `Saved offline draft "${payload.title}" in SQLite.`,
    });
  };

  const handleOpenCameraSlot = async (slot: PhotoSlotKey) => {
    setActivePhotoSlot(slot);
    setManualPhotoUriInput(photoSlots[slot] ?? '');
    if (Platform.OS !== 'web' && !cameraPermission?.granted) {
      await requestCameraPermission();
    }
  };

  const handleCaptureCameraFrame = async () => {
    if (!activePhotoSlot || !cameraRef.current) return;
    try {
      const snap = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (snap?.uri) {
        setPhotoSlots((prev) => ({ ...prev, [activePhotoSlot]: snap.uri }));
        setCropErrors((prev) => ({ ...prev, photos: '' }));
        setActivePhotoSlot(null);
      }
    } catch (err: any) {
      Alert.alert('Camera Notice', err?.message ?? 'Failed to capture photo.');
    }
  };

  const handleOpenThreadFor = async (params: {
    listingId?: string;
    buyRequestId?: string;
    counterpartyUserId: string;
  }) => {
    if (!requireSignedInAction('message counterparties')) return;
    try {
      const threadId = await openOrCreateB2BThread(params);
      if (threadId) {
        setActiveThreadId(threadId);
        setSubTab('inbox');
      }
    } catch (err: any) {
      const msg = String(err?.message ?? 'Unable to open chat thread.');
      if (msg.includes('Wholesaler Buyer Profile')) {
        openBuyerProfileModal(
          'Complete all required (*) fields in your Buyer Profile first so sellers can inspect how you work before trading.'
        );
        return;
      }
      setActionNotice({ type: 'error', message: msg });
    }
  };

  const handleRevealContact = async (params: {
    key: string;
    listingId?: string;
    counterpartyUserId: string;
    lockedReason?: 'complete_buyer_profile' | 'guest_demo' | null;
  }) => {
    if (!requireSignedInAction('reveal verified phone & WhatsApp contact details')) return;
    if (params.lockedReason === 'complete_buyer_profile') {
      openBuyerProfileModal(
        'Complete all required (*) fields in your Buyer Profile first to unlock producer phone and WhatsApp numbers.'
      );
      return;
    }
    try {
      const res = await revealContactAndStartThread({
        listingId: params.listingId,
        counterpartyUserId: params.counterpartyUserId,
      });
      if (res) {
        setRevealedContacts((prev) => ({
          ...prev,
          [params.key]: {
            phone: res.phone,
            whatsapp: res.whatsapp,
            email: res.email,
          },
        }));
        if (res.threadId) {
          setActiveThreadId(res.threadId);
        }
      }
    } catch (err: any) {
      const msg = String(err?.message ?? 'Could not reveal contact right now.');
      if (msg.includes('Wholesaler Buyer Profile')) {
        openBuyerProfileModal(
          'Complete all required (*) fields in your Buyer Profile first to unlock producer phone numbers.'
        );
        return;
      }
      setActionNotice({ type: 'error', message: msg });
    }
  };

  const handleSaveWholesalerProfile = async () => {
    if (!requireSignedInAction('save your Wholesaler Buyer Profile')) return;

    const cleanCompany = wpCompanyName.trim();
    const cleanContact = wpContactName.trim();
    const cleanRegion = wpRegion.trim();
    const cleanBio = wpBio.trim();
    const cleanHowWeWork = wpHowWeWork.trim();
    const effectivePhone = wpPhone.trim() || userProfile.phone || '';

    const errs: Record<string, string> = {};
    if (cleanCompany.length < 2) {
      errs.companyName = 'Enter Company / Buyer Name (at least 2 characters).';
    }
    if (cleanContact.length < 2) {
      errs.contactName = 'Enter Purchasing Contact Name (at least 2 characters).';
    }
    if (cleanRegion.length < 2) {
      errs.region = 'Enter your Operating Region (at least 2 characters).';
    }
    if (cleanBio.length < 10) {
      errs.bio = `Enter Bio & Purchasing Focus (at least 10 characters; currently ${cleanBio.length}).`;
    }
    if (cleanHowWeWork.length < 10) {
      errs.howWeWork = `Describe How We Work & Track Record (at least 10 characters; currently ${cleanHowWeWork.length}).`;
    }
    if (wpVarieties.length === 0) {
      errs.varieties = 'Select at least 1 preferred walnut variety.';
    }
    if (!isValidPhoneDigits(effectivePhone)) {
      errs.phone = 'Enter a valid 8–15 digit phone number with country code (e.g. +905551234567).';
    }
    if (wpWhatsapp.trim() && !isValidPhoneDigits(wpWhatsapp)) {
      errs.whatsapp = 'WhatsApp number must be 8–15 digits with country code (or leave blank).';
    }

    setBuyerProfileErrors(errs);
    if (Object.keys(errs).length > 0) {
      setBuyerProfileSubmitError(
        `Please complete the ${Object.keys(errs).length} required field(s) highlighted in red above.`
      );
      return;
    }

    setBuyerProfileSubmitError(null);
    setIsSavingBuyerProfile(true);
    try {
      const payload: WholesalerProfileInput = {
        companyName: cleanCompany,
        contactName: cleanContact,
        region: cleanRegion,
        bio: cleanBio,
        howWeWork: cleanHowWeWork,
        preferredVarieties: wpVarieties,
        minPurchaseKg: Number(wpMinKg) || undefined,
        maxPurchaseKg: Number(wpMaxKg) || undefined,
        phone: effectivePhone,
        whatsapp: wpWhatsapp.trim() || undefined,
        email: userProfile.email || undefined,
        showPhone: wpShowPhone,
        showWhatsapp: wpShowWhatsapp,
        showEmail: Boolean(userProfile.email),
        allowInAppChat: true,
      };
      const isComplete = await saveWholesalerBuyerProfile(payload);
      if (!isComplete) {
        setBuyerProfileSubmitError(
          'Profile was saved as incomplete. Check that Company Name, Contact Name, Region, Bio (10+ chars), How We Work (10+ chars), and Phone are all filled cleanly.'
        );
        return;
      }
      setShowBuyerProfileModal(false);
      setBuyerProfileInfoBanner(null);
      setActionNotice({
        type: 'success',
        message: 'Buyer Profile & "How We Work" is active! You can now post Buy Requests and unlock seller numbers.',
      });
    } catch (err: any) {
      setBuyerProfileSubmitError(
        err?.message ?? 'Could not save Buyer Profile. Verify all fields and try again.'
      );
    } finally {
      setIsSavingBuyerProfile(false);
    }
  };

  const handleSaveBuyRequest = async () => {
    if (!requireSignedInAction('post a Buy Request')) return;
    if (!userProfile.isWholesalerProfileComplete) {
      setShowBuyRequestModal(false);
      openBuyerProfileModal(
        'Finish all required (*) fields in your Buyer Profile first before publishing Buy Requests.'
      );
      return;
    }

    const errs: Record<string, string> = {};
    if (brTitle.trim().length < 3) {
      errs.title = 'Enter a Buy Request headline (at least 3 characters, e.g. Seeking 25T Chandler).';
    }
    const kg = Number(brTargetKg);
    if (!Number.isFinite(kg) || kg < 100) {
      errs.targetKg = 'Target Volume must be at least 100 kg.';
    }
    if (brTargetPrice.trim()) {
      const price = Number(brTargetPrice);
      if (!Number.isFinite(price) || price <= 0) {
        errs.targetPrice = 'Target Price/kg must be greater than 0 (or leave blank).';
      }
    }
    if (brRegion.trim().length < 2) {
      errs.region = 'Enter delivery / buying region (at least 2 characters).';
    }
    if (brNote.trim().length < 5) {
      errs.note = 'Add pickup, scale & payment terms notes (at least 5 characters).';
    }

    setBuyRequestErrors(errs);
    if (Object.keys(errs).length > 0) {
      setBuyRequestSubmitError(
        `Please fill in the ${Object.keys(errs).length} required field(s) highlighted in red above.`
      );
      return;
    }

    setBuyRequestSubmitError(null);
    setIsSavingBuyRequest(true);
    try {
      const payload: BuyRequestInput = {
        title: brTitle.trim(),
        variety: brVariety,
        form: brForm,
        kernelGrade: brKernelGrade,
        minDiameterMm: Number(brMinMm) || undefined,
        targetKg: Math.round(kg),
        targetPricePerKg: brTargetPrice.trim() ? Number(brTargetPrice) : undefined,
        currency: brCurrency,
        region: brRegion.trim(),
        note: brNote.trim(),
        status: 'active',
      };
      await saveWholesalerBuyRequest(payload);
      setShowBuyRequestModal(false);
      setActionNotice({
        type: 'success',
        message: `Published Buy Request "${payload.title}". Matching walnut producers will see your demand.`,
      });
    } catch (err: any) {
      setBuyRequestSubmitError(
        err?.message ?? 'Could not publish Buy Request. Please check all required fields.'
      );
    } finally {
      setIsSavingBuyRequest(false);
    }
  };

  const handleOpenInspector = (targetUserId: string, label: string) => {
    if (!requireSignedInAction('inspect Trust Badges and feedback history')) return;
    setInspectingTitle(label);
    setInspectingUserId(targetUserId);
  };

  const handleSendThreadMessage = async () => {
    if (!activeThread || !chatInput.trim()) return;
    await sendB2BMessage(activeThread._id, chatInput.trim());
    setChatInput('');
  };

  const handleSubmitStructuredAction = async () => {
    if (!activeThread || !activeStructuredForm) return;
    try {
      if (activeStructuredForm === 'sample_request') {
        await sendB2BStructuredAction(activeThread._id, {
          kind: 'sample_request',
          sampleWeightKg: Math.max(1, Number(sampleKg) || 5),
          addressNote: sampleAddress.trim() || 'Depot / Warehouse Dropoff',
        });
      } else if (activeStructuredForm === 'price_offer') {
        await sendB2BStructuredAction(activeThread._id, {
          kind: 'price_offer',
          quantityKg: Math.max(50, Number(offerQtyKg) || 1000),
          pricePerKg: Math.max(0.5, Number(offerPriceKg) || 3.2),
          currency: cropCurrency,
          pickupWindow: offerWindow.trim() || 'Within 7 days',
        });
      } else {
        await sendB2BStructuredAction(activeThread._id, {
          kind: 'exact_gps_pin',
          latitude: Number(gpsLat) || 38.5449,
          longitude: Number(gpsLng) || -121.7405,
          fieldLabel: gpsLabel.trim() || 'Orchard Loading Gate',
        });
      }
      setActiveStructuredForm(null);
    } catch (err: any) {
      Alert.alert('Action Notice', err?.message ?? 'Could not send structured action.');
    }
  };

  const handleAwardTrustBadge = async () => {
    if (!activeThread) return;
    const isCallerProducer = activeThread.producerUserId === userProfile.clerkId;
    const recipientUserId = isCallerProducer
      ? activeThread.wholesalerUserId
      : activeThread.producerUserId;
    const badgeType = isCallerProducer ? 'trusted_buyer' : 'trusted_seller';
    const fullComment = `${selectedTrustTag}: ${
      trustComment.trim() || 'Smooth verified trade communication and terms.'
    }`;
    try {
      await awardCounterpartyBadge({
        threadId: activeThread._id,
        recipientUserId,
        badgeType,
        comment: fullComment,
      });
      setShowAwardBadgeModal(false);
      setTrustComment('');
      Alert.alert('Trust Badge Awarded', 'Verified counterparty badge has been published.');
    } catch (err: any) {
      Alert.alert('Trust Badge Gate', err?.message ?? 'Unable to award badge right now.');
    }
  };

  const renderContactActions = (
    key: string,
    contact: MarketplaceListingItem['contact'],
    counterpartyUserId: string,
    listingId?: string,
    buyRequestId?: string
  ) => {
    const unlocked = revealedContacts[key];
    return (
      <View style={styles.cardActionsWrap}>
        <View style={styles.cardPrimaryBtns}>
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={() =>
              handleOpenThreadFor({
                listingId,
                buyRequestId,
                counterpartyUserId,
              })
            }
          >
            <Ionicons name="chatbubbles-outline" size={15} color="#FFFFFF" />
            <Text style={styles.chatActionBtnText}>
              {buyRequestId ? 'Pitch My Crop' : 'Message in App'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() =>
              handleRevealContact({
                key,
                listingId,
                counterpartyUserId,
                lockedReason: contact.contactLockedReason,
              })
            }
          >
            <Ionicons name="call-outline" size={15} color={Colors.walnutGreen[800]} />
            <Text style={styles.revealBtnText}>
              {unlocked ? 'Contact Revealed' : 'Reveal Phone / WA'}
            </Text>
          </TouchableOpacity>
        </View>

        {unlocked && (
          <View style={styles.unlockedContactBox}>
            {unlocked.phone ? (
              <TouchableOpacity
                style={styles.directCallPill}
                onPress={() => Linking.openURL(`tel:${unlocked.phone}`)}
              >
                <Ionicons name="call" size={14} color={Colors.walnutGreen[800]} />
                <Text style={styles.directCallText}>{unlocked.phone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.mutedSmall}>No direct phone published</Text>
            )}
            {unlocked.whatsapp && (
              <TouchableOpacity
                style={[styles.directCallPill, { backgroundColor: '#DCFCE7' }]}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${unlocked.whatsapp!.replace(/[^\d]/g, '')}`
                  )
                }
              >
                <Ionicons name="logo-whatsapp" size={14} color="#15803D" />
                <Text style={[styles.directCallText, { color: '#15803D' }]}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Walnut Marketplace</Text>
          <Text style={styles.subtitle}>
            {isWholesaler && userProfile.enableOrchardTools
              ? 'Dual-Role Hub • Buy Wholesale Lots & Publish Your Own Orchard Crops'
              : isWholesaler
                ? 'Buyer Hub • Browse Orchard Lots, Post Buy Requests & Trade'
                : 'Producer Exchange • List Harvest Lots & Pitch Verified Buyers'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HelpButton
            help={{
              title: 'Walnut Marketplace',
              whatItDoes:
                'Connects Walnut Producers directly with Verified Wholesalers using transparent quality metrics, guided 5-slot photos, and B2B messaging.',
              howToDoIt: [
                'Switch between Walnut Crops, Wholesalers & Buy Requests, and B2B Inbox.',
                'Producers: tap + Publish Crop (or save offline SQLite drafts in the field).',
                'Wholesalers: complete My Buyer Profile & How We Work to unlock phone numbers and post Buy Requests.',
              ],
              whatToExpect:
                'Exact orchard GPS coordinates stay hidden until you explicitly share an Exact Loading GPS Pin inside a 1-on-1 B2B thread.',
            }}
          />
          <TouchableOpacity
            style={styles.accountChip}
            onPress={() => router.push('/auth')}
          >
            <Ionicons
              name={isSignedIn ? 'person-circle' : 'log-in-outline'}
              size={18}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.accountChipText}>
              {isSignedIn ? 'Account' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {actionNotice && (
        <View
          style={[
            styles.noticeBanner,
            actionNotice.type === 'error'
              ? styles.actionNoticeError
              : styles.actionNoticeSuccess,
          ]}
        >
          <Ionicons
            name={actionNotice.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={actionNotice.type === 'error' ? '#991B1B' : '#166534'}
          />
          <Text
            style={[
              styles.noticeBannerText,
              { color: actionNotice.type === 'error' ? '#991B1B' : '#166534' },
            ]}
          >
            {actionNotice.message}
          </Text>
          <TouchableOpacity onPress={() => setActionNotice(null)}>
            <Ionicons name="close" size={16} color={Colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      {lastSyncMessage && (
        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle" size={15} color={Colors.walnutGreen[800]} />
          <Text style={styles.noticeBannerText}>{lastSyncMessage}</Text>
        </View>
      )}

      {/* Sub-view switcher */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'crops' && styles.subTabBtnActive]}
          onPress={() => setSubTab('crops')}
        >
          <Text
            style={[styles.subTabText, subTab === 'crops' && styles.subTabTextActive]}
          >
            Walnut Crops ({filteredListings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'buyers' && styles.subTabBtnActive]}
          onPress={() => setSubTab('buyers')}
        >
          <Text
            style={[styles.subTabText, subTab === 'buyers' && styles.subTabTextActive]}
          >
            Wholesalers ({buyRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'inbox' && styles.subTabBtnActive]}
          onPress={() => setSubTab('inbox')}
        >
          <Text
            style={[styles.subTabText, subTab === 'inbox' && styles.subTabTextActive]}
          >
            B2B Inbox ({marketplaceThreads.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar for Crops & Buyers */}
      {subTab !== 'inbox' && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              subTab === 'crops'
                ? 'Search variety, region, or orchard...'
                : 'Search buyer company, variety, or how they work...'
            }
            placeholderTextColor={Colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {canPublishCrops && subTab === 'crops' && (
            <TouchableOpacity
              style={styles.primaryMiniBtn}
              onPress={() => {
                if (!requireSignedInAction('publish a walnut crop listing')) return;
                openPublishCropModal();
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primaryMiniBtnText}>Publish Crop</Text>
            </TouchableOpacity>
          )}
          {isWholesaler && subTab === 'buyers' && (
            <TouchableOpacity
              style={styles.primaryMiniBtn}
              onPress={() => {
                if (!requireSignedInAction('post a Buy Request')) return;
                openBuyRequestModal();
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primaryMiniBtnText}>Buy Request</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SUB-VIEW 1: WALNUT CROPS */}
      {subTab === 'crops' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterStrip}
          >
            {(
              [
                'All',
                'Chandler',
                'Howard',
                'Hartley',
                'Tulare',
                'In-Shell',
                'Kernel',
                'Tracked',
              ] as CropFilter[]
            ).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, cropFilter === f && styles.filterPillActive]}
                onPress={() => setCropFilter(f)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    cropFilter === f && styles.filterPillTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Offline SQLite Crop Drafts Banner */}
          {canPublishCrops && marketplaceDrafts.length > 0 && (
            <View style={styles.draftsCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.draftsTitle}>
                  Offline Crop Drafts ({marketplaceDrafts.length})
                </Text>
                <TouchableOpacity
                  style={styles.syncNowBtn}
                  onPress={async () => {
                    const res = await syncPendingMarketplaceDrafts();
                    Alert.alert(
                      'Draft Sync',
                      `Uploaded ${res.syncedCount} offline crop draft(s) to Marketplace.`
                    );
                  }}
                >
                  <Text style={styles.syncNowBtnText}>Sync Queued Now</Text>
                </TouchableOpacity>
              </View>
              {marketplaceDrafts.map((d) => (
                <View key={d.localDraftId} style={styles.draftItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftItemTitle}>
                      {d.title} ({d.variety} • {d.availableKg} kg)
                    </Text>
                    <Text style={styles.draftItemMeta}>State: {d.draftState}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteOfflineCropDraft(d.localDraftId)}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.status.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* My Active Listings Status Quick-Toggle */}
          {canPublishCrops && isSignedIn && myListings.length > 0 && (
            <View style={styles.myListingsBox}>
              <Text style={styles.sectionHeaderSmall}>
                My Published Lots ({myListings.length})
              </Text>
              {myListings.slice(0, 3).map((mine) => (
                <View key={mine._id} style={styles.myListingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.myListingName}>{mine.title}</Text>
                    <Text style={styles.myListingSub}>
                      {mine.availableKg} kg • Status: {mine.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.statusMiniGroup}>
                    {(['active', 'negotiating', 'sold'] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusMiniPill,
                          mine.status === st && styles.statusMiniPillActive,
                        ]}
                        onPress={() => updateListingStatus(mine._id, st)}
                      >
                        <Text
                          style={[
                            styles.statusMiniText,
                            mine.status === st && styles.statusMiniTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Feed Cards */}
          {filteredListings.map((item) => {
            const matchingBuyers = countMatchingRequests(item);
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.badgeRow}>
                    <View style={styles.varietyPill}>
                      <Text style={styles.varietyPillText}>
                        {item.variety} •{' '}
                        {item.form === 'in_shell' ? 'In-Shell' : 'Shelled Kernel'}
                      </Text>
                    </View>
                    {item.verifiedOrchardSummary && (
                      <View style={styles.trackedPill}>
                        <Ionicons
                          name="shield-checkmark"
                          size={12}
                          color={Colors.walnutGreen[800]}
                        />
                        <Text style={styles.trackedPillText}>
                          Tracked Orchard ({item.verifiedOrchardSummary.treeCount} trees)
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.priceBadge}>
                    {formatCurrency(item.pricePerKg, item.currency)}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>
                  Seller: {item.producerName} • {item.region}
                </Text>

                {/* Trust Badge & Matching Buyers Row */}
                <View style={styles.metaPillRow}>
                  <TouchableOpacity
                    style={styles.trustPill}
                    onPress={() => handleOpenInspector(item.userId, item.producerName)}
                  >
                    <Ionicons name="ribbon-outline" size={13} color={Colors.walnutShell[700]} />
                    <Text style={styles.trustPillText}>
                      Trusted Seller ({item.trustedSellerCount})
                    </Text>
                  </TouchableOpacity>

                  {matchingBuyers > 0 && (
                    <View style={styles.matchPill}>
                      <Text style={styles.matchPillText}>
                        {matchingBuyers} Matching Buy Request(s)
                      </Text>
                    </View>
                  )}

                  <View style={styles.stagePill}>
                    <Text style={styles.stagePillText}>
                      {LOT_STAGE_LABELS[item.lotStage]}
                    </Text>
                  </View>
                </View>

                {/* Photo Strip */}
                {item.photos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {item.photos.map((p, idx) =>
                      p.url ? (
                        <View key={`${item._id}-photo-${idx}`} style={styles.photoThumbBox}>
                          <Image source={{ uri: p.url }} style={styles.photoThumb} />
                          <Text style={styles.photoSlotCaption}>
                            {PHOTO_SLOT_LABELS[p.slotKey].split(' ')[0]}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </ScrollView>
                )}

                <Text style={styles.cardBody}>{item.description}</Text>

                {/* Specs Grid */}
                <View style={styles.specGrid}>
                  <View style={styles.specBox}>
                    <Text style={styles.specVal}>{item.availableKg.toLocaleString()} kg</Text>
                    <Text style={styles.specLbl}>Available</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specVal}>
                      {item.avgDiameterMm ? `${item.avgDiameterMm} mm` : '—'}
                    </Text>
                    <Text style={styles.specLbl}>Caliber</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specVal}>{KERNEL_LABELS[item.kernelGrade]}</Text>
                    <Text style={styles.specLbl}>Kernel</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specVal}>
                      {item.moisturePct ? `${item.moisturePct}%` : '—'}
                    </Text>
                    <Text style={styles.specLbl}>Moisture</Text>
                  </View>
                </View>

                {/* Logistics Line */}
                <Text style={styles.logisticsLine}>
                  Logistics: {PACKAGING_LABELS[item.packagingType]} •{' '}
                  {DRYING_LABELS[item.dryingMethod]} • {LOADING_LABELS[item.loadingLogistics]}
                </Text>

                {/* Contact & Moderation */}
                {item.userId !== userProfile.clerkId && (
                  <>
                    {renderContactActions(
                      item._id,
                      item.contact,
                      item.userId,
                      item._id,
                      undefined
                    )}
                    <View style={styles.safetyRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setReportTarget({
                            targetType: 'listing',
                            targetId: item._id,
                            reportedUserId: item.userId,
                            label: item.title,
                          })
                        }
                      >
                        <Text style={styles.safetyLink}>Report Listing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (!requireSignedInAction('block this user')) return;
                          blockUserAccount(item.userId);
                        }}
                      >
                        <Text style={[styles.safetyLink, { color: Colors.status.danger }]}>
                          Block User
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* SUB-VIEW 2: WHOLESALERS & BUY REQUESTS */}
      {subTab === 'buyers' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Wholesaler Onboarding Reminder / Profile Action Bar */}
          {isWholesaler && isSignedIn && (
            <View style={styles.wholesalerBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.wholesalerBannerTitle}>
                  {userProfile.isWholesalerProfileComplete
                    ? 'Your Wholesaler Buyer Profile is Active'
                    : 'Complete Your Buyer Profile & "How We Work"'}
                </Text>
                <Text style={styles.wholesalerBannerDesc}>
                  Producers inspect how you weigh, sample, and settle payment before sharing exact
                  loading pins.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => openBuyerProfileModal()}
              >
                <Text style={styles.editProfileBtnText}>
                  {userProfile.isWholesalerProfileComplete ? 'Edit Profile' : 'Setup Now'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sub-switch between Active Buy Requests and Wholesaler Directory */}
          <View style={styles.pillToggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                buyersViewMode === 'requests' && styles.toggleChipActive,
              ]}
              onPress={() => setBuyersViewMode('requests')}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  buyersViewMode === 'requests' && styles.toggleChipTextActive,
                ]}
              >
                Active Buy Requests ({filteredBuyRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                buyersViewMode === 'directory' && styles.toggleChipActive,
              ]}
              onPress={() => setBuyersViewMode('directory')}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  buyersViewMode === 'directory' && styles.toggleChipTextActive,
                ]}
              >
                Verified Wholesalers ({filteredWholesalers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {buyersViewMode === 'requests' &&
            filteredBuyRequests.map((req) => {
              const matchingLots = countMatchingListings(req);
              return (
                <View key={req._id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.varietyPill}>
                      <Text style={styles.varietyPillText}>
                        Seeking {req.variety} •{' '}
                        {req.form === 'in_shell' ? 'In-Shell' : 'Kernel'}
                      </Text>
                    </View>
                    <Text style={styles.priceBadge}>
                      {formatCurrency(req.targetPricePerKg, req.currency)}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle}>{req.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    Buyer: {req.companyName} • Region: {req.region}
                  </Text>

                  <View style={styles.metaPillRow}>
                    <View style={styles.matchPill}>
                      <Text style={styles.matchPillText}>
                        Target: {(req.targetKg / 1000).toFixed(1)} Tonnes
                      </Text>
                    </View>
                    {req.minDiameterMm && (
                      <View style={styles.stagePill}>
                        <Text style={styles.stagePillText}>
                          Min {req.minDiameterMm} mm
                        </Text>
                      </View>
                    )}
                    {matchingLots > 0 && (
                      <View style={styles.trackedPill}>
                        <Text style={styles.trackedPillText}>
                          {matchingLots} Matching Orchard Lot(s)
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardBody}>{req.note}</Text>

                  {req.userId !== userProfile.clerkId && (
                    <View style={styles.cardActionsWrap}>
                      <TouchableOpacity
                        style={styles.chatActionBtn}
                        onPress={() =>
                          handleOpenThreadFor({
                            buyRequestId: req._id,
                            counterpartyUserId: req.userId,
                          })
                        }
                      >
                        <Ionicons name="send-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.chatActionBtnText}>Pitch My Crop in App</Text>
                      </TouchableOpacity>
                      <View style={styles.safetyRow}>
                        <TouchableOpacity
                          onPress={() =>
                            setReportTarget({
                              targetType: 'buy_request',
                              targetId: req._id,
                              reportedUserId: req.userId,
                              label: req.title,
                            })
                          }
                        >
                          <Text style={styles.safetyLink}>Report Request</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (!requireSignedInAction('block this buyer')) return;
                            blockUserAccount(req.userId);
                          }}
                        >
                          <Text style={[styles.safetyLink, { color: Colors.status.danger }]}>
                            Block User
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

          {buyersViewMode === 'directory' &&
            filteredWholesalers.map((w: WholesalerDirectoryItem) => (
              <View key={w._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{w.companyName}</Text>
                  <TouchableOpacity
                    style={styles.trustPill}
                    onPress={() => handleOpenInspector(w.userId, w.companyName)}
                  >
                    <Ionicons name="ribbon-outline" size={13} color={Colors.walnutShell[700]} />
                    <Text style={styles.trustPillText}>
                      Trusted Buyer ({w.trustedBuyerCount})
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>
                  Contact: {w.contactName} • {w.region}
                </Text>
                <Text style={styles.cardBody}>{w.bio}</Text>

                {/* Highlighted How We Work Box */}
                <View style={styles.howWeWorkBox}>
                  <Text style={styles.howWeWorkHeading}>How We Work & Track Record</Text>
                  <Text style={styles.howWeWorkBody}>{w.howWeWork}</Text>
                  <Text style={styles.howWeWorkMeta}>
                    Preferred: {w.preferredVarieties.join(', ')} • Volume:{' '}
                    {w.minPurchaseKg ? `${(w.minPurchaseKg / 1000).toFixed(1)}T` : 'Any'} –{' '}
                    {w.maxPurchaseKg ? `${(w.maxPurchaseKg / 1000).toFixed(0)}T` : 'No cap'}
                  </Text>
                </View>

                {w.userId !== userProfile.clerkId && (
                  <>
                    {renderContactActions(
                      `buyer-${w._id}`,
                      w.contact,
                      w.userId,
                      undefined,
                      undefined
                    )}
                    <View style={styles.safetyRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setReportTarget({
                            targetType: 'wholesaler_profile',
                            targetId: w._id,
                            reportedUserId: w.userId,
                            label: w.companyName,
                          })
                        }
                      >
                        <Text style={styles.safetyLink}>Report Profile</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (!requireSignedInAction('block this buyer')) return;
                          blockUserAccount(w.userId);
                        }}
                      >
                        <Text style={[styles.safetyLink, { color: Colors.status.danger }]}>
                          Block User
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
        </ScrollView>
      )}

      {/* SUB-VIEW 3: B2B INBOX (1-ON-1 PRODUCER <-> WHOLESALER THREADS) */}
      {subTab === 'inbox' && (
        <View style={{ flex: 1 }}>
          {!isSignedIn ? (
            <View style={styles.emptyInbox}>
              <Ionicons name="lock-closed-outline" size={32} color={Colors.walnutGreen[700]} />
              <Text style={styles.emptyTitle}>Sign In for Private B2B Threads</Text>
              <Text style={styles.emptyDesc}>
                Negotiate lots, send sample requests, offer per-kg pricing, and share exact
                loading GPS coordinates privately.
              </Text>
              <TouchableOpacity
                style={styles.primaryMiniBtn}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.primaryMiniBtnText}>Sign In / Register</Text>
              </TouchableOpacity>
            </View>
          ) : !activeThread ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {marketplaceThreads.length === 0 ? (
                <View style={styles.emptyInbox}>
                  <Ionicons name="chatbox-ellipses-outline" size={32} color={Colors.walnutGreen[700]} />
                  <Text style={styles.emptyTitle}>No B2B Conversations Yet</Text>
                  <Text style={styles.emptyDesc}>
                    Tap "Message in App" on any crop listing or "Pitch My Crop" on a buyer request
                    to start a trade thread.
                  </Text>
                </View>
              ) : (
                marketplaceThreads.map((t) => (
                  <TouchableOpacity
                    key={t._id}
                    style={styles.threadListCard}
                    onPress={() => setActiveThreadId(t._id)}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.threadTitle}>{t.subjectTitle}</Text>
                      <Ionicons name="chevron-forward" size={18} color={Colors.text.muted} />
                    </View>
                    <Text style={styles.threadPreview} numberOfLines={2}>
                      {t.lastMessagePreview}
                    </Text>
                    <Text style={styles.threadMeta}>
                      Producer replied: {t.hasProducerReplied ? 'Yes' : 'No'} • Wholesaler
                      replied: {t.hasWholesalerReplied ? 'Yes' : 'No'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Thread Header & Trust Badge Actions */}
              <View style={styles.activeThreadHeader}>
                <TouchableOpacity
                  onPress={() => setActiveThreadId(null)}
                  style={styles.backBtn}
                >
                  <Ionicons name="arrow-back" size={18} color={Colors.walnutGreen[900]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.threadHeaderTitle} numberOfLines={1}>
                    {activeThread.subjectTitle}
                  </Text>
                  <Text style={styles.threadHeaderMeta}>
                    {activeThread.hasProducerReplied && activeThread.hasWholesalerReplied
                      ? 'Two-way conversation active • Trust Badge unlocked'
                      : 'Both sides must reply once before awarding a Trust Badge'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.awardBadgeBtn}
                  onPress={() => setShowAwardBadgeModal(true)}
                >
                  <Ionicons name="ribbon" size={14} color="#FFFFFF" />
                  <Text style={styles.awardBadgeText}>Award Badge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const otherUser =
                      activeThread.producerUserId === userProfile.clerkId
                        ? activeThread.wholesalerUserId
                        : activeThread.producerUserId;
                    handleOpenInspector(otherUser, 'Trade Counterparty');
                  }}
                >
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.walnutGreen[800]} />
                </TouchableOpacity>
              </View>

              {/* Thread Messages */}
              <ScrollView contentContainerStyle={styles.messagesList}>
                {activeThreadMessages.map((msg) => {
                  const mine = msg.senderUserId === userProfile.clerkId;
                  return (
                    <View
                      key={msg._id}
                      style={[styles.msgCard, mine ? styles.msgMine : styles.msgTheirs]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={styles.msgRoleTag}>
                          {msg.senderRole === 'producer' ? 'Producer' : 'Wholesaler'}
                          {msg.messageType !== 'text' ? ` • ${msg.messageType.replace('_', ' ')}` : ''}
                        </Text>
                        {!mine && (
                          <TouchableOpacity
                            onPress={() =>
                              setReportTarget({
                                targetType: 'thread_message',
                                targetId: msg._id,
                                reportedUserId: msg.senderUserId,
                                label: msg.body.slice(0, 40),
                              })
                            }
                          >
                            <Text style={styles.reportTiny}>Report</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.msgBodyText}>{msg.body}</Text>
                      {msg.structuredPayload?.kind === 'exact_gps_pin' && (
                        <TouchableOpacity
                          style={styles.gpsLinkBtn}
                          onPress={() =>
                            Linking.openURL(
                              `https://maps.google.com/?q=${msg.structuredPayload!.kind === 'exact_gps_pin' ? msg.structuredPayload!.latitude : 0},${msg.structuredPayload!.kind === 'exact_gps_pin' ? msg.structuredPayload!.longitude : 0}`
                            )
                          }
                        >
                          <Ionicons name="location" size={14} color={Colors.walnutGreen[900]} />
                          <Text style={styles.gpsLinkText}>Open Loading Pin in Maps</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* 3 Structured B2B Quick Actions */}
              <View style={styles.quickActionsBar}>
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() =>
                    setActiveStructuredForm((prev) =>
                      prev === 'sample_request' ? null : 'sample_request'
                    )
                  }
                >
                  <Text style={styles.quickActionText}>Request Sample</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() =>
                    setActiveStructuredForm((prev) =>
                      prev === 'price_offer' ? null : 'price_offer'
                    )
                  }
                >
                  <Text style={styles.quickActionText}>Send Price Offer</Text>
                </TouchableOpacity>
                {activeThread.producerUserId === userProfile.clerkId && (
                  <TouchableOpacity
                    style={[styles.quickActionChip, { backgroundColor: Colors.walnutGreen[200] }]}
                    onPress={() =>
                      setActiveStructuredForm((prev) =>
                        prev === 'exact_gps_pin' ? null : 'exact_gps_pin'
                      )
                    }
                  >
                    <Text style={styles.quickActionText}>Share Exact GPS Pin</Text>
                  </TouchableOpacity>
                )}
              </View>

              {activeStructuredForm && (
                <View style={styles.structuredDrawer}>
                  {activeStructuredForm === 'sample_request' && (
                    <>
                      <Text style={styles.drawerTitle}>Send Structured Sample Request</Text>
                      <TextInput
                        style={styles.drawerInput}
                        placeholder="Sample weight (kg)"
                        keyboardType="numeric"
                        value={sampleKg}
                        onChangeText={setSampleKg}
                      />
                      <TextInput
                        style={styles.drawerInput}
                        placeholder="Delivery warehouse / courier note"
                        value={sampleAddress}
                        onChangeText={setSampleAddress}
                      />
                    </>
                  )}
                  {activeStructuredForm === 'price_offer' && (
                    <>
                      <Text style={styles.drawerTitle}>Send Per-Kg Price Offer</Text>
                      <View style={styles.twoColRow}>
                        <TextInput
                          style={[styles.drawerInput, { flex: 1 }]}
                          placeholder="Qty (kg)"
                          keyboardType="numeric"
                          value={offerQtyKg}
                          onChangeText={setOfferQtyKg}
                        />
                        <TextInput
                          style={[styles.drawerInput, { flex: 1 }]}
                          placeholder="Price/kg"
                          keyboardType="numeric"
                          value={offerPriceKg}
                          onChangeText={setOfferPriceKg}
                        />
                      </View>
                      <TextInput
                        style={styles.drawerInput}
                        placeholder="Pickup window & payment note"
                        value={offerWindow}
                        onChangeText={setOfferWindow}
                      />
                    </>
                  )}
                  {activeStructuredForm === 'exact_gps_pin' && (
                    <>
                      <Text style={styles.drawerTitle}>
                        Share Exact Orchard Gate GPS Coordinates
                      </Text>
                      <View style={styles.twoColRow}>
                        <TextInput
                          style={[styles.drawerInput, { flex: 1 }]}
                          placeholder="Latitude"
                          keyboardType="numeric"
                          value={gpsLat}
                          onChangeText={setGpsLat}
                        />
                        <TextInput
                          style={[styles.drawerInput, { flex: 1 }]}
                          placeholder="Longitude"
                          keyboardType="numeric"
                          value={gpsLng}
                          onChangeText={setGpsLng}
                        />
                      </View>
                      <TextInput
                        style={styles.drawerInput}
                        placeholder="Gate / Block label"
                        value={gpsLabel}
                        onChangeText={setGpsLabel}
                      />
                    </>
                  )}
                  <View style={styles.twoColRow}>
                    <TouchableOpacity
                      style={styles.drawerCancelBtn}
                      onPress={() => setActiveStructuredForm(null)}
                    >
                      <Text style={styles.drawerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.drawerSendBtn}
                      onPress={handleSubmitStructuredAction}
                    >
                      <Text style={styles.drawerSendText}>Send to Thread</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Thread Text Composer */}
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Write private trade message..."
                  placeholderTextColor={Colors.text.muted}
                  value={chatInput}
                  onChangeText={setChatInput}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendThreadMessage}>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* PUBLISH CROP MODAL (WITH TRACKED ORCHARD LINK & 5-SLOT PHOTO CHECKLIST) */}
      <Modal
        visible={showPublishModal}
        animationType="slide"
        onRequestClose={() => setShowPublishModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Publish Walnut Crop Lot</Text>
            <TouchableOpacity onPress={() => setShowPublishModal(false)}>
              <Ionicons name="close" size={24} color={Colors.walnutGreen[900]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLbl}>Variety</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {VARIETY_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.choiceChip, cropVariety === v && styles.choiceChipActive]}
                  onPress={() => setCropVariety(v)}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      cropVariety === v && styles.choiceChipTextActive,
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLbl}>Link Tracked Orchard Field (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <TouchableOpacity
                style={[styles.choiceChip, !linkedFieldId && styles.choiceChipActive]}
                onPress={() => setLinkedFieldId(undefined)}
              >
                <Text style={styles.choiceChipText}>Unlinked Lot</Text>
              </TouchableOpacity>
              {fields.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.choiceChip, linkedFieldId === f.id && styles.choiceChipActive]}
                  onPress={() => setLinkedFieldId(f.id)}
                >
                  <Text style={styles.choiceChipText}>
                    {f.name} ({f.treeCount} trees)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLbl}>Listing Title *</Text>
            <TextInput
              style={[styles.modalInput, Boolean(cropErrors.title) && styles.inputError]}
              placeholder="e.g. 2026 Cured Chandler 34mm+ Extra Light"
              value={cropTitle}
              onChangeText={(t) => {
                setCropTitle(t);
                setCropErrors((prev) => ({ ...prev, title: '' }));
                setCropSubmitError(null);
              }}
            />
            {Boolean(cropErrors.title) && (
              <Text style={styles.fieldErrorText}>{cropErrors.title}</Text>
            )}

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Available (kg) *</Text>
                <TextInput
                  style={[styles.modalInput, Boolean(cropErrors.availableKg) && styles.inputError]}
                  keyboardType="numeric"
                  value={cropAvailableKg}
                  onChangeText={(t) => {
                    setCropAvailableKg(t);
                    setCropErrors((prev) => ({ ...prev, availableKg: '' }));
                    setCropSubmitError(null);
                  }}
                />
                {Boolean(cropErrors.availableKg) && (
                  <Text style={styles.fieldErrorText}>{cropErrors.availableKg}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Min Order (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={cropMinOrderKg}
                  onChangeText={setCropMinOrderKg}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Avg Caliber (mm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={cropDiameterMm}
                  onChangeText={setCropDiameterMm}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Moisture (%)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={cropMoisturePct}
                  onChangeText={setCropMoisturePct}
                />
              </View>
            </View>

            <Text style={styles.fieldLbl}>Lot Stage & Form</Text>
            <View style={styles.wrapChipRow}>
              {(['pre_harvest', 'harvesting', 'in_storage'] as LotStage[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.choiceChip, cropLotStage === st && styles.choiceChipActive]}
                  onPress={() => {
                    setCropLotStage(st);
                    if (st === 'pre_harvest') {
                      setCropErrors((prev) => ({ ...prev, photos: '' }));
                    }
                  }}
                >
                  <Text style={styles.choiceChipText}>{LOT_STAGE_LABELS[st]}</Text>
                </TouchableOpacity>
              ))}
              {(['in_shell', 'shelled_kernel'] as CropForm[]).map((fm) => (
                <TouchableOpacity
                  key={fm}
                  style={[styles.choiceChip, cropForm === fm && styles.choiceChipActive]}
                  onPress={() => setCropForm(fm)}
                >
                  <Text style={styles.choiceChipText}>
                    {fm === 'in_shell' ? 'In-Shell' : 'Shelled Kernel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLbl}>Kernel Color Grade</Text>
            <View style={styles.wrapChipRow}>
              {(['extra_light', 'light', 'amber', 'mixed'] as KernelGrade[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.choiceChip, cropKernelGrade === g && styles.choiceChipActive]}
                  onPress={() => setCropKernelGrade(g)}
                >
                  <Text style={styles.choiceChipText}>{KERNEL_LABELS[g]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLbl}>Packaging, Drying & Loading Logistics</Text>
            <View style={styles.wrapChipRow}>
              {(['big_bag_1t', 'jute_50kg', 'mesh_25kg', 'bulk_bin', 'buyer_bags'] as PackagingType[]).map(
                (p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.choiceChip, cropPackaging === p && styles.choiceChipActive]}
                    onPress={() => setCropPackaging(p)}
                  >
                    <Text style={styles.choiceChipText}>{PACKAGING_LABELS[p]}</Text>
                  </TouchableOpacity>
                )
              )}
              {(['mechanical_dryer', 'sun_dried', 'washed_wet', 'green_in_hull'] as DryingMethod[]).map(
                (d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.choiceChip, cropDrying === d && styles.choiceChipActive]}
                    onPress={() => setCropDrying(d)}
                  >
                    <Text style={styles.choiceChipText}>{DRYING_LABELS[d]}</Text>
                  </TouchableOpacity>
                )
              )}
              {(['farm_gate_forklift', 'producer_delivers'] as LoadingLogistics[]).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.choiceChip, cropLoading === l && styles.choiceChipActive]}
                  onPress={() => setCropLoading(l)}
                >
                  <Text style={styles.choiceChipText}>{LOADING_LABELS[l]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLbl}>Pricing & Currency</Text>
            <View style={styles.wrapChipRow}>
              <TouchableOpacity
                style={[
                  styles.choiceChip,
                  cropPricingMode === 'fixed_per_kg' && styles.choiceChipActive,
                ]}
                onPress={() => setCropPricingMode('fixed_per_kg')}
              >
                <Text style={styles.choiceChipText}>Fixed / kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.choiceChip,
                  cropPricingMode === 'contact_for_quote' && styles.choiceChipActive,
                ]}
                onPress={() => {
                  setCropPricingMode('contact_for_quote');
                  setCropErrors((prev) => ({ ...prev, pricePerKg: '' }));
                }}
              >
                <Text style={styles.choiceChipText}>Contact for Quote</Text>
              </TouchableOpacity>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur}
                  style={[styles.choiceChip, cropCurrency === cur && styles.choiceChipActive]}
                  onPress={() => setCropCurrency(cur)}
                >
                  <Text style={styles.choiceChipText}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {cropPricingMode === 'fixed_per_kg' && (
              <>
                <Text style={styles.fieldLbl}>Ask Price per kg *</Text>
                <TextInput
                  style={[styles.modalInput, Boolean(cropErrors.pricePerKg) && styles.inputError]}
                  placeholder="Ask Price per kg"
                  keyboardType="numeric"
                  value={cropPricePerKg}
                  onChangeText={(t) => {
                    setCropPricePerKg(t);
                    setCropErrors((prev) => ({ ...prev, pricePerKg: '' }));
                    setCropSubmitError(null);
                  }}
                />
                {Boolean(cropErrors.pricePerKg) && (
                  <Text style={styles.fieldErrorText}>{cropErrors.pricePerKg}</Text>
                )}
              </>
            )}

            <Text style={styles.fieldLbl}>Region / District *</Text>
            <TextInput
              style={[styles.modalInput, Boolean(cropErrors.region) && styles.inputError]}
              placeholder="Region / District (exact GPS stays hidden)"
              value={cropRegion}
              onChangeText={(t) => {
                setCropRegion(t);
                setCropErrors((prev) => ({ ...prev, region: '' }));
                setCropSubmitError(null);
              }}
            />
            {Boolean(cropErrors.region) && (
              <Text style={styles.fieldErrorText}>{cropErrors.region}</Text>
            )}

            <Text style={styles.fieldLbl}>Description * (min 10 chars)</Text>
            <TextInput
              style={[
                styles.modalInput,
                { height: 74, textAlignVertical: 'top' },
                Boolean(cropErrors.description) && styles.inputError,
              ]}
              multiline
              placeholder="Crack percentage, harvest week, lab notes..."
              value={cropDescription}
              onChangeText={(t) => {
                setCropDescription(t);
                setCropErrors((prev) => ({ ...prev, description: '' }));
                setCropSubmitError(null);
              }}
            />
            {Boolean(cropErrors.description) && (
              <Text style={styles.fieldErrorText}>{cropErrors.description}</Text>
            )}

            {/* 5-Slot Guided Photo Checklist */}
            <Text style={styles.fieldLbl}>
              Guided 5-Photo Inspection Checklist{cropLotStage === 'pre_harvest' ? ' (Optional for Pre-Harvest)' : ' * (At least 1 photo for live listing)'}
            </Text>
            <View
              style={[
                styles.photoChecklistBox,
                Boolean(cropErrors.photos) && styles.photoChecklistError,
              ]}
            >
              {PHOTO_SLOT_ORDER.map((slot, i) => {
                const attached = Boolean(photoSlots[slot]);
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.photoSlotRow, attached && styles.photoSlotRowDone]}
                    onPress={() => handleOpenCameraSlot(slot)}
                  >
                    <Ionicons
                      name={attached ? 'checkmark-circle' : 'camera-outline'}
                      size={20}
                      color={attached ? Colors.status.success : Colors.walnutGreen[800]}
                    />
                    <Text style={styles.photoSlotLabel}>
                      {i + 1}. {PHOTO_SLOT_LABELS[slot]}
                    </Text>
                    <Text style={styles.photoSlotStatus}>
                      {attached ? 'Attached' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {Boolean(cropErrors.photos) && (
              <Text style={styles.fieldErrorText}>{cropErrors.photos}</Text>
            )}

            {/* Contact Controls */}
            <Text style={styles.fieldLbl}>
              Buyer Contact Channels {cropShowPhone ? '(Phone *)' : ''}
            </Text>
            <TextInput
              style={[styles.modalInput, Boolean(cropErrors.contactPhone) && styles.inputError]}
              placeholder="Phone number for revealed buyers (+country code)"
              value={cropContactPhone}
              onChangeText={(t) => {
                setCropContactPhone(t);
                setCropErrors((prev) => ({ ...prev, contactPhone: '' }));
                setCropSubmitError(null);
              }}
            />
            {Boolean(cropErrors.contactPhone) && (
              <Text style={styles.fieldErrorText}>{cropErrors.contactPhone}</Text>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder="WhatsApp number (optional)"
              value={cropWhatsapp}
              onChangeText={setCropWhatsapp}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show Phone after Buyer logs in</Text>
              <Switch
                value={cropShowPhone}
                onValueChange={(val) => {
                  setCropShowPhone(val);
                  setCropErrors((prev) => ({
                    ...prev,
                    contactPhone: '',
                    contactChannel: '',
                  }));
                }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show WhatsApp</Text>
              <Switch value={cropShowWhatsapp} onValueChange={setCropShowWhatsapp} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show Email (if set)</Text>
              <Switch value={cropShowEmail} onValueChange={setCropShowEmail} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow In-App B2B Chat</Text>
              <Switch
                value={cropAllowChat}
                onValueChange={(val) => {
                  setCropAllowChat(val);
                  setCropErrors((prev) => ({ ...prev, contactChannel: '' }));
                }}
              />
            </View>
            {Boolean(cropErrors.contactChannel) && (
              <Text style={styles.fieldErrorText}>{cropErrors.contactChannel}</Text>
            )}

            {cropSubmitError && (
              <View style={styles.formErrorBanner}>
                <Text style={styles.formErrorBannerTitle}>Missing or Invalid Fields</Text>
                <Text style={styles.formErrorBannerText}>{cropSubmitError}</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.offlineSaveBtn}
                onPress={handleSaveOfflineDraft}
              >
                <Text style={styles.offlineSaveBtnText}>Save Offline Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishSubmitBtn, isSubmittingCrop && { opacity: 0.7 }]}
                disabled={isSubmittingCrop}
                onPress={handlePublishLive}
              >
                <Text style={styles.publishSubmitBtnText}>
                  {isSubmittingCrop ? 'Publishing...' : 'Publish Live'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CAMERA / PHOTO SLOT CAPTURE MODAL */}
      <Modal
        visible={Boolean(activePhotoSlot)}
        animationType="fade"
        onRequestClose={() => setActivePhotoSlot(null)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {activePhotoSlot ? PHOTO_SLOT_LABELS[activePhotoSlot] : 'Crop Photo'}
            </Text>
            <TouchableOpacity onPress={() => setActivePhotoSlot(null)}>
              <Ionicons name="close" size={24} color={Colors.walnutGreen[900]} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, padding: 16, gap: 12 }}>
            {Platform.OS !== 'web' && cameraPermission?.granted ? (
              <View style={styles.cameraPreviewWrap}>
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
                <TouchableOpacity
                  style={styles.shutterBtn}
                  onPress={handleCaptureCameraFrame}
                >
                  <Ionicons name="camera" size={26} color="#FFFFFF" />
                  <Text style={styles.shutterBtnText}>Capture Lot Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.webCameraBox}>
                <Ionicons name="camera-outline" size={32} color={Colors.walnutGreen[700]} />
                <Text style={styles.emptyDesc}>
                  {Platform.OS === 'web'
                    ? 'Camera capture runs on native iOS/Android. You can attach an image URL below on Web.'
                    : 'Grant camera permission to capture orchard & crack-test photos.'}
                </Text>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.primaryMiniBtn}
                    onPress={requestCameraPermission}
                  >
                    <Text style={styles.primaryMiniBtnText}>Enable Camera</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.fieldLbl}>Or Paste Local / HTTPS Image URI</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="file://... or https://..."
              value={manualPhotoUriInput}
              onChangeText={setManualPhotoUriInput}
            />
            <TouchableOpacity
              style={styles.publishSubmitBtn}
              onPress={() => {
                if (activePhotoSlot && manualPhotoUriInput.trim()) {
                  setPhotoSlots((prev) => ({
                    ...prev,
                    [activePhotoSlot]: manualPhotoUriInput.trim(),
                  }));
                }
                setActivePhotoSlot(null);
              }}
            >
              <Text style={styles.publishSubmitBtnText}>Save Photo Slot</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* WHOLESALER BUYER PROFILE & "HOW WE WORK" MODAL */}
      <Modal
        visible={showBuyerProfileModal}
        animationType="slide"
        onRequestClose={() => setShowBuyerProfileModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Buyer Profile & "How We Work"</Text>
            <TouchableOpacity onPress={() => setShowBuyerProfileModal(false)}>
              <Ionicons name="close" size={24} color={Colors.walnutGreen[900]} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {buyerProfileInfoBanner && (
              <View style={styles.formInfoBanner}>
                <Ionicons name="information-circle" size={18} color="#92400E" />
                <Text style={styles.formInfoBannerText}>{buyerProfileInfoBanner}</Text>
              </View>
            )}

            <Text style={styles.fieldLbl}>Company / Buyer Name *</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyerProfileErrors.companyName) && styles.inputError,
              ]}
              placeholder="e.g. Valley Harvest Walnut Trading"
              value={wpCompanyName}
              onChangeText={(t) => {
                setWpCompanyName(t);
                setBuyerProfileErrors((prev) => ({ ...prev, companyName: '' }));
                setBuyerProfileSubmitError(null);
              }}
            />
            {Boolean(buyerProfileErrors.companyName) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.companyName}</Text>
            )}

            <Text style={styles.fieldLbl}>Purchasing Contact Name *</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyerProfileErrors.contactName) && styles.inputError,
              ]}
              placeholder="e.g. Ahmet Demir"
              value={wpContactName}
              onChangeText={(t) => {
                setWpContactName(t);
                setBuyerProfileErrors((prev) => ({ ...prev, contactName: '' }));
                setBuyerProfileSubmitError(null);
              }}
            />
            {Boolean(buyerProfileErrors.contactName) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.contactName}</Text>
            )}

            <Text style={styles.fieldLbl}>Operating Region *</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyerProfileErrors.region) && styles.inputError,
              ]}
              placeholder="e.g. Bursa / Marmara / Central Valley"
              value={wpRegion}
              onChangeText={(t) => {
                setWpRegion(t);
                setBuyerProfileErrors((prev) => ({ ...prev, region: '' }));
                setBuyerProfileSubmitError(null);
              }}
            />
            {Boolean(buyerProfileErrors.region) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.region}</Text>
            )}

            <View style={styles.rowBetween}>
              <Text style={styles.fieldLbl}>Bio & Purchasing Focus * (min 10 chars)</Text>
              <Text
                style={
                  wpBio.trim().length >= 10 ? styles.charCountOk : styles.charCountWarn
                }
              >
                {wpBio.trim().length}/10+ chars
              </Text>
            </View>
            <TextInput
              style={[
                styles.modalInput,
                { height: 70, textAlignVertical: 'top' },
                Boolean(buyerProfileErrors.bio) && styles.inputError,
              ]}
              multiline
              value={wpBio}
              onChangeText={(t) => {
                setWpBio(t);
                setBuyerProfileErrors((prev) => ({ ...prev, bio: '' }));
                setBuyerProfileSubmitError(null);
              }}
              placeholder="Describe the varieties, volumes, and markets you supply..."
            />
            {Boolean(buyerProfileErrors.bio) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.bio}</Text>
            )}

            <View style={styles.rowBetween}>
              <Text style={styles.fieldLbl}>
                How We Work & Track Record * (min 10 chars)
              </Text>
              <Text
                style={
                  wpHowWeWork.trim().length >= 10
                    ? styles.charCountOk
                    : styles.charCountWarn
                }
              >
                {wpHowWeWork.trim().length}/10+ chars
              </Text>
            </View>
            <TextInput
              style={[
                styles.modalInput,
                { height: 90, textAlignVertical: 'top' },
                Boolean(buyerProfileErrors.howWeWork) && styles.inputError,
              ]}
              multiline
              value={wpHowWeWork}
              onChangeText={(t) => {
                setWpHowWeWork(t);
                setBuyerProfileErrors((prev) => ({ ...prev, howWeWork: '' }));
                setBuyerProfileSubmitError(null);
              }}
              placeholder="e.g. On-farm crack sample -> certified weighbridge -> bank wire on loading..."
            />
            {Boolean(buyerProfileErrors.howWeWork) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.howWeWork}</Text>
            )}

            <Text style={styles.fieldLbl}>Preferred Varieties * (pick at least 1)</Text>
            <View style={styles.wrapChipRow}>
              {VARIETY_OPTIONS.map((v) => {
                const selected = wpVarieties.includes(v);
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => {
                      setWpVarieties((prev) =>
                        prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                      );
                      setBuyerProfileErrors((prev) => ({ ...prev, varieties: '' }));
                      setBuyerProfileSubmitError(null);
                    }}
                  >
                    <Text style={styles.choiceChipText}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {Boolean(buyerProfileErrors.varieties) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.varieties}</Text>
            )}

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Min Volume (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={wpMinKg}
                  onChangeText={setWpMinKg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Max Volume (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={wpMaxKg}
                  onChangeText={setWpMaxKg}
                />
              </View>
            </View>

            <Text style={styles.fieldLbl}>Published Phone * (E.164 with country code)</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyerProfileErrors.phone) && styles.inputError,
              ]}
              placeholder="Phone (+905551234567)"
              keyboardType="phone-pad"
              value={wpPhone}
              onChangeText={(t) => {
                setWpPhone(t);
                setBuyerProfileErrors((prev) => ({ ...prev, phone: '' }));
                setBuyerProfileSubmitError(null);
              }}
            />
            {Boolean(buyerProfileErrors.phone) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.phone}</Text>
            )}

            <Text style={styles.fieldLbl}>WhatsApp Number (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyerProfileErrors.whatsapp) && styles.inputError,
              ]}
              placeholder="WhatsApp (+905551234567)"
              keyboardType="phone-pad"
              value={wpWhatsapp}
              onChangeText={(t) => {
                setWpWhatsapp(t);
                setBuyerProfileErrors((prev) => ({ ...prev, whatsapp: '' }));
                setBuyerProfileSubmitError(null);
              }}
            />
            {Boolean(buyerProfileErrors.whatsapp) && (
              <Text style={styles.fieldErrorText}>{buyerProfileErrors.whatsapp}</Text>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show Phone to Sellers</Text>
              <Switch value={wpShowPhone} onValueChange={setWpShowPhone} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show WhatsApp</Text>
              <Switch value={wpShowWhatsapp} onValueChange={setWpShowWhatsapp} />
            </View>

            {buyerProfileSubmitError && (
              <View style={styles.formErrorBanner}>
                <Text style={styles.formErrorBannerTitle}>
                  Cannot Save Buyer Profile Yet
                </Text>
                <Text style={styles.formErrorBannerText}>{buyerProfileSubmitError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.publishSubmitBtn,
                { marginTop: 12 },
                isSavingBuyerProfile && { opacity: 0.7 },
              ]}
              disabled={isSavingBuyerProfile}
              onPress={handleSaveWholesalerProfile}
            >
              <Text style={styles.publishSubmitBtnText}>
                {isSavingBuyerProfile ? 'Saving Buyer Profile...' : 'Save Buyer Profile'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* POST BUY REQUEST MODAL */}
      <Modal
        visible={showBuyRequestModal}
        animationType="slide"
        onRequestClose={() => setShowBuyRequestModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post New Buy Request</Text>
            <TouchableOpacity onPress={() => setShowBuyRequestModal(false)}>
              <Ionicons name="close" size={24} color={Colors.walnutGreen[900]} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {!userProfile.isWholesalerProfileComplete && (
              <View style={styles.formInfoBanner}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.formInfoBannerText}>
                    Finish your Wholesaler Buyer Profile & "How We Work" before
                    publishing a Buy Request.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowBuyRequestModal(false);
                      openBuyerProfileModal(
                        'Complete all required (*) fields in your Buyer Profile first to unlock Buy Requests.'
                      );
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: Colors.walnutShell[700],
                      }}
                    >
                      Complete Buyer Profile First →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.fieldLbl}>Request Headline *</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyRequestErrors.title) && styles.inputError,
              ]}
              placeholder="e.g. Seeking 25T Chandler 34mm+ In-Shell"
              value={brTitle}
              onChangeText={(t) => {
                setBrTitle(t);
                setBuyRequestErrors((prev) => ({ ...prev, title: '' }));
                setBuyRequestSubmitError(null);
              }}
            />
            {Boolean(buyRequestErrors.title) && (
              <Text style={styles.fieldErrorText}>{buyRequestErrors.title}</Text>
            )}

            <Text style={styles.fieldLbl}>Variety Wanted *</Text>
            <View style={styles.wrapChipRow}>
              {VARIETY_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.choiceChip, brVariety === v && styles.choiceChipActive]}
                  onPress={() => setBrVariety(v)}
                >
                  <Text style={styles.choiceChipText}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLbl}>Form & Target Kernel</Text>
            <View style={styles.wrapChipRow}>
              {(['in_shell', 'shelled_kernel'] as CropForm[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.choiceChip, brForm === f && styles.choiceChipActive]}
                  onPress={() => setBrForm(f)}
                >
                  <Text style={styles.choiceChipText}>
                    {f === 'in_shell' ? 'In-Shell' : 'Shelled Kernel'}
                  </Text>
                </TouchableOpacity>
              ))}
              {(['extra_light', 'light', 'amber'] as KernelGrade[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.choiceChip, brKernelGrade === g && styles.choiceChipActive]}
                  onPress={() => setBrKernelGrade(g)}
                >
                  <Text style={styles.choiceChipText}>{KERNEL_LABELS[g]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Target Volume (kg) * (min 100)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    Boolean(buyRequestErrors.targetKg) && styles.inputError,
                  ]}
                  keyboardType="numeric"
                  value={brTargetKg}
                  onChangeText={(t) => {
                    setBrTargetKg(t);
                    setBuyRequestErrors((prev) => ({ ...prev, targetKg: '' }));
                    setBuyRequestSubmitError(null);
                  }}
                />
                {Boolean(buyRequestErrors.targetKg) && (
                  <Text style={styles.fieldErrorText}>{buyRequestErrors.targetKg}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Min Caliber (mm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={brMinMm}
                  onChangeText={setBrMinMm}
                />
              </View>
            </View>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Target Price / kg (Optional)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    Boolean(buyRequestErrors.targetPrice) && styles.inputError,
                  ]}
                  keyboardType="numeric"
                  value={brTargetPrice}
                  onChangeText={(t) => {
                    setBrTargetPrice(t);
                    setBuyRequestErrors((prev) => ({ ...prev, targetPrice: '' }));
                    setBuyRequestSubmitError(null);
                  }}
                />
                {Boolean(buyRequestErrors.targetPrice) && (
                  <Text style={styles.fieldErrorText}>{buyRequestErrors.targetPrice}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Currency</Text>
                <View style={styles.wrapChipRow}>
                  {CURRENCIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.choiceChip, brCurrency === c && styles.choiceChipActive]}
                      onPress={() => setBrCurrency(c)}
                    >
                      <Text style={styles.choiceChipText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.fieldLbl}>Operating Region *</Text>
            <TextInput
              style={[
                styles.modalInput,
                Boolean(buyRequestErrors.region) && styles.inputError,
              ]}
              placeholder="e.g. Marmara / California"
              value={brRegion}
              onChangeText={(t) => {
                setBrRegion(t);
                setBuyRequestErrors((prev) => ({ ...prev, region: '' }));
                setBuyRequestSubmitError(null);
              }}
            />
            {Boolean(buyRequestErrors.region) && (
              <Text style={styles.fieldErrorText}>{buyRequestErrors.region}</Text>
            )}

            <Text style={styles.fieldLbl}>Pickup & Payment Notes * (min 5 chars)</Text>
            <TextInput
              style={[
                styles.modalInput,
                { height: 74, textAlignVertical: 'top' },
                Boolean(buyRequestErrors.note) && styles.inputError,
              ]}
              multiline
              placeholder="Bags supplied, certified truck scale, payment window..."
              value={brNote}
              onChangeText={(t) => {
                setBrNote(t);
                setBuyRequestErrors((prev) => ({ ...prev, note: '' }));
                setBuyRequestSubmitError(null);
              }}
            />
            {Boolean(buyRequestErrors.note) && (
              <Text style={styles.fieldErrorText}>{buyRequestErrors.note}</Text>
            )}

            {buyRequestSubmitError && (
              <View style={styles.formErrorBanner}>
                <Text style={styles.formErrorBannerTitle}>
                  Missing or Invalid Buy Request Fields
                </Text>
                <Text style={styles.formErrorBannerText}>{buyRequestSubmitError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.publishSubmitBtn,
                { marginTop: 12 },
                isSavingBuyRequest && { opacity: 0.7 },
              ]}
              disabled={isSavingBuyRequest}
              onPress={handleSaveBuyRequest}
            >
              <Text style={styles.publishSubmitBtnText}>
                {isSavingBuyRequest ? 'Publishing Buy Request...' : 'Publish Buy Request'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* AWARD TRUST BADGE MODAL */}
      <Modal
        visible={showAwardBadgeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAwardBadgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.modalTitle}>Award Verified Trust Badge</Text>
            <Text style={styles.emptyDesc}>
              Available after both sides have exchanged at least one message in this trade thread.
            </Text>
            <View style={styles.wrapChipRow}>
              {TRUST_PRESET_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.choiceChip,
                    selectedTrustTag === tag && styles.choiceChipActive,
                  ]}
                  onPress={() => setSelectedTrustTag(tag)}
                >
                  <Text style={styles.choiceChipText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              placeholder="Factual trade note (e.g. 8T settled same day)"
              value={trustComment}
              onChangeText={setTrustComment}
            />
            <View style={styles.twoColRow}>
              <TouchableOpacity
                style={styles.drawerCancelBtn}
                onPress={() => setShowAwardBadgeModal(false)}
              >
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerSendBtn} onPress={handleAwardTrustBadge}>
                <Text style={styles.drawerSendText}>Publish Badge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TRUST INSPECTOR & DISPUTE MODAL */}
      <Modal
        visible={Boolean(inspectingUserId)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setInspectingUserId(null);
          setDisputeTargetId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.overlayCard, { maxHeight: '80%' }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Trust Record • {inspectingTitle}</Text>
              <TouchableOpacity
                onPress={() => {
                  setInspectingUserId(null);
                  setDisputeTargetId(null);
                }}
              >
                <Ionicons name="close" size={22} color={Colors.walnutGreen[900]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
              {inspectingTrustFeedback.length === 0 ? (
                <Text style={styles.emptyDesc}>No published Trust Badges recorded yet.</Text>
              ) : (
                inspectingTrustFeedback.map((fb) => (
                  <View key={fb._id} style={styles.feedbackItem}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.feedbackBadgeType}>
                        {fb.badgeType === 'trusted_seller'
                          ? 'Trusted Seller Badge'
                          : 'Trusted Buyer Badge'}
                      </Text>
                      <Text style={styles.feedbackStatus}>{fb.visibilityStatus}</Text>
                    </View>
                    {fb.visibilityStatus === 'policy_removed' ? (
                      <Text style={styles.policyRemovedNotice}>
                        {fb.publicNotice || 'Trust Badge Removed'}
                      </Text>
                    ) : (
                      <Text style={styles.cardBody}>{fb.comment}</Text>
                    )}
                    {fb.canDispute && (
                      <TouchableOpacity
                        onPress={() => setDisputeTargetId(fb._id)}
                        style={{ marginTop: 4 }}
                      >
                        <Text style={styles.safetyLink}>Dispute This Badge</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}

              {disputeTargetId && (
                <View style={styles.structuredDrawer}>
                  <Text style={styles.drawerTitle}>Submit Admin Dispute Review</Text>
                  <TextInput
                    style={styles.drawerInput}
                    placeholder="Reason & evidence (e.g. weighbridge ticket)"
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                  />
                  <TouchableOpacity
                    style={styles.drawerSendBtn}
                    onPress={async () => {
                      await submitBadgeDispute(disputeTargetId, disputeReason);
                      setDisputeTargetId(null);
                      setDisputeReason('');
                      Alert.alert(
                        'Dispute Submitted',
                        'Admin moderation will review your dispute in the Web Console.'
                      );
                    }}
                  >
                    <Text style={styles.drawerSendText}>Submit Dispute</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REPORT CONTENT MODAL */}
      <Modal
        visible={Boolean(reportTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.modalTitle}>Report Content</Text>
            <Text style={styles.emptyDesc}>Target: {reportTarget?.label}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason (e.g. misleading crop photo, spam, abusive text)"
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.twoColRow}>
              <TouchableOpacity
                style={styles.drawerCancelBtn}
                onPress={() => {
                  setReportTarget(null);
                  setReportReason('');
                }}
              >
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.drawerSendBtn, { backgroundColor: Colors.status.danger }]}
                onPress={async () => {
                  if (!requireSignedInAction('submit a moderation report')) return;
                  if (reportTarget) {
                    await submitContentReport({
                      targetType: reportTarget.targetType,
                      targetId: reportTarget.targetId,
                      reportedUserId: reportTarget.reportedUserId,
                      reason: reportReason.trim() || 'Inappropriate marketplace content',
                    });
                  }
                  setReportTarget(null);
                  setReportReason('');
                  Alert.alert('Reported', 'Submitted to WalnutIQ Admin moderation.');
                }}
              >
                <Text style={styles.drawerSendText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.walnutGreen[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.walnutGreen[900] },
  subtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.walnutGreen[100],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.walnutGreen[100],
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  noticeBannerText: { fontSize: 11, fontWeight: '600', color: Colors.walnutGreen[900], flex: 1 },
  subTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  subTabBtn: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
  },
  subTabBtnActive: {
    backgroundColor: Colors.walnutGreen[600],
    borderColor: Colors.walnutGreen[700],
  },
  subTabText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  subTabTextActive: { color: '#FFFFFF' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.walnutGreen[900], paddingVertical: 4 },
  primaryMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.walnutGreen[600],
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  primaryMiniBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  scrollContent: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 40 },
  filterStrip: { gap: 6, paddingBottom: 4 },
  filterPill: {
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  filterPillActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[600],
  },
  filterPillText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  filterPillTextActive: { color: Colors.walnutGreen[900], fontWeight: '800' },
  draftsCard: {
    backgroundColor: Colors.walnutShell[50],
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  draftsTitle: { fontSize: 13, fontWeight: '800', color: Colors.walnutShell[700] },
  syncNowBtn: {
    backgroundColor: Colors.walnutShell[500],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  syncNowBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  draftItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  draftItemTitle: { fontSize: 12, fontWeight: '700', color: Colors.walnutGreen[900] },
  draftItemMeta: { fontSize: 11, color: Colors.text.muted },
  myListingsBox: {
    backgroundColor: Colors.surface.cardTinted,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    gap: 8,
  },
  sectionHeaderSmall: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[800] },
  myListingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myListingName: { fontSize: 12, fontWeight: '700', color: Colors.walnutGreen[900] },
  myListingSub: { fontSize: 11, color: Colors.text.secondary },
  statusMiniGroup: { flexDirection: 'row', gap: 4 },
  statusMiniPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  statusMiniPillActive: {
    backgroundColor: Colors.walnutGreen[600],
    borderColor: Colors.walnutGreen[700],
  },
  statusMiniText: { fontSize: 10, fontWeight: '700', color: Colors.text.secondary },
  statusMiniTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 6,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  varietyPill: {
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  varietyPillText: { fontSize: 11, fontWeight: '800', color: Colors.walnutGreen[800] },
  trackedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trackedPillText: { fontSize: 10, fontWeight: '800', color: '#166534' },
  priceBadge: { fontSize: 14, fontWeight: '800', color: Colors.walnutShell[700] },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.walnutGreen[900] },
  cardSubtitle: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  metaPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.walnutShell[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trustPillText: { fontSize: 11, fontWeight: '700', color: Colors.walnutShell[700] },
  matchPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchPillText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  stagePill: {
    backgroundColor: Colors.walnutGreen[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  stagePillText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  photoThumbBox: { alignItems: 'center', gap: 3 },
  photoThumb: { width: 70, height: 70, borderRadius: 10, backgroundColor: Colors.walnutGreen[100] },
  photoSlotCaption: { fontSize: 10, color: Colors.text.muted, fontWeight: '600' },
  cardBody: { fontSize: 13, color: Colors.walnutGreen[900], lineHeight: 19 },
  specGrid: { flexDirection: 'row', gap: 6, marginTop: 4 },
  specBox: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  specVal: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[800] },
  specLbl: { fontSize: 10, color: Colors.text.muted },
  logisticsLine: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary, marginTop: 2 },
  cardActionsWrap: { gap: 8, marginTop: 6 },
  cardPrimaryBtns: { flexDirection: 'row', gap: 8 },
  chatActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 9,
    borderRadius: 10,
  },
  chatActionBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  revealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.walnutGreen[100],
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  revealBtnText: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[800] },
  unlockedContactBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  directCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directCallText: { fontSize: 12, fontWeight: '700', color: Colors.walnutGreen[900] },
  mutedSmall: { fontSize: 11, color: Colors.text.muted },
  safetyRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 2 },
  safetyLink: { fontSize: 11, fontWeight: '700', color: Colors.text.muted },
  wholesalerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.walnutShell[100],
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
  },
  wholesalerBannerTitle: { fontSize: 13, fontWeight: '800', color: Colors.walnutShell[700] },
  wholesalerBannerDesc: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  editProfileBtn: {
    backgroundColor: Colors.walnutShell[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editProfileBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  pillToggleRow: { flexDirection: 'row', gap: 8 },
  toggleChip: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
  },
  toggleChipActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[600],
  },
  toggleChipText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  toggleChipTextActive: { color: Colors.walnutGreen[900] },
  howWeWorkBox: {
    backgroundColor: Colors.walnutShell[50],
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    gap: 4,
  },
  howWeWorkHeading: { fontSize: 12, fontWeight: '800', color: Colors.walnutShell[700] },
  howWeWorkBody: { fontSize: 12, color: Colors.walnutGreen[900], lineHeight: 18 },
  howWeWorkMeta: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  emptyInbox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.walnutGreen[900], textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  threadListCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 4,
  },
  threadTitle: { fontSize: 14, fontWeight: '800', color: Colors.walnutGreen[900], flex: 1 },
  threadPreview: { fontSize: 12, color: Colors.text.secondary },
  threadMeta: { fontSize: 10, color: Colors.text.muted },
  activeThreadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.border,
  },
  backBtn: { padding: 4 },
  threadHeaderTitle: { fontSize: 14, fontWeight: '800', color: Colors.walnutGreen[900] },
  threadHeaderMeta: { fontSize: 10, color: Colors.text.secondary },
  awardBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.walnutShell[500],
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  awardBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  messagesList: { padding: 14, gap: 8 },
  msgCard: { borderRadius: 14, padding: 12, maxWidth: '88%', gap: 4 },
  msgMine: { alignSelf: 'flex-end', backgroundColor: Colors.walnutGreen[200] },
  msgTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  msgRoleTag: { fontSize: 10, fontWeight: '800', color: Colors.walnutShell[700] },
  reportTiny: { fontSize: 10, fontWeight: '700', color: Colors.text.muted },
  msgBodyText: { fontSize: 13, color: Colors.walnutGreen[900], lineHeight: 18 },
  gpsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
  },
  gpsLinkText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  quickActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.walnutGreen[100],
  },
  quickActionChip: {
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  quickActionText: { fontSize: 11, fontWeight: '700', color: Colors.walnutGreen[900] },
  structuredDrawer: {
    backgroundColor: Colors.surface.card,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
    gap: 8,
  },
  drawerTitle: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[900] },
  drawerInput: {
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.walnutGreen[900],
  },
  twoColRow: { flexDirection: 'row', gap: 8 },
  drawerCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
  },
  drawerCancelText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  drawerSendBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[600],
    alignItems: 'center',
  },
  drawerSendText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: Colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.walnutGreen[900],
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.walnutGreen[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSafe: { flex: 1, backgroundColor: Colors.walnutGreen[50] },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.border,
    backgroundColor: Colors.surface.card,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.walnutGreen[900] },
  modalBody: { padding: 16, gap: 8, paddingBottom: 40 },
  fieldLbl: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[800], marginTop: 4 },
  modalInput: {
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.walnutGreen[900],
  },
  wrapChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choiceChip: {
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  choiceChipActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[600],
  },
  choiceChipText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  choiceChipTextActive: { color: Colors.walnutGreen[900] },
  photoSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  photoSlotRowDone: { borderColor: Colors.status.success, backgroundColor: '#F0FDF4' },
  photoSlotLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.walnutGreen[900] },
  photoSlotStatus: { fontSize: 11, fontWeight: '700', color: Colors.walnutGreen[700] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: Colors.walnutGreen[900] },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  offlineSaveBtn: {
    flex: 1,
    backgroundColor: Colors.walnutShell[100],
    borderWidth: 1,
    borderColor: Colors.walnutShell[500],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  offlineSaveBtnText: { fontSize: 13, fontWeight: '800', color: Colors.walnutShell[700] },
  publishSubmitBtn: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishSubmitBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  cameraPreviewWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', gap: 10 },
  shutterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 14,
    borderRadius: 12,
  },
  shutterBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  webCameraBox: {
    padding: 24,
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 15, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  feedbackItem: {
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 4,
  },
  feedbackBadgeType: { fontSize: 12, fontWeight: '800', color: Colors.walnutGreen[900] },
  feedbackStatus: { fontSize: 10, fontWeight: '700', color: Colors.text.muted },
  policyRemovedNotice: { fontSize: 12, fontWeight: '800', color: Colors.status.danger },
  actionNoticeSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  actionNoticeError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: -2,
    marginBottom: 4,
  },
  formErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  formErrorBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  formErrorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D',
    lineHeight: 17,
  },
  formInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  formInfoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 17,
  },
  photoChecklistBox: {
    gap: 6,
    borderRadius: 12,
  },
  photoChecklistError: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 8,
  },
  charCountOk: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  charCountWarn: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
});
