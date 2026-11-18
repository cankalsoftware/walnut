import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * WalnutIQ: Tree Care & AI Count — Convex Real-Time Schema
 * Supports:
 * 1. Clerk-authenticated grower profiles (Google & Email)
 * 2. Orchard tree registry & YOLO canopy/ground yield tracking
 * 3. Hybrid Offline-First sync logs (enabling 14-day local post-sync auto-purge)
 * 4. Tuya Smart Orchard Sensor telemetry snapshots
 * 5. Real-time Grower Community Chat with embedded Tree Scan Cards
 */
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    displayName: v.string(),
    role: v.optional(v.union(v.literal('admin'), v.literal('grower'))),
    authProvider: v.union(
      v.literal('google'),
      v.literal('email'),
      v.literal('phone')
    ),
    accountType: v.optional(
      v.union(v.literal('producer'), v.literal('wholesaler'))
    ),
    phone: v.optional(v.string()),
    phoneVerified: v.optional(v.boolean()),
    whatsapp: v.optional(v.string()),
    enableOrchardTools: v.optional(v.boolean()),
    marketplaceOnboardingComplete: v.optional(v.boolean()),
    recoveryCodeHash: v.optional(v.string()),
    accountStatus: v.optional(
      v.union(v.literal('active'), v.literal('suspended'), v.literal('banned'))
    ),
    trustedSellerCount: v.optional(v.number()),
    trustedBuyerCount: v.optional(v.number()),
    region: v.optional(v.string()),
    orchardName: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(v.literal('beginner'), v.literal('experienced'), v.literal('expert'))
    ),
    notificationTopics: v.optional(v.array(v.string())),
    pushNotificationsEnabled: v.optional(v.boolean()),
    createdAtMs: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_phone', ['phone']),

  trees: defineTable({
    userId: v.string(), // Clerk userId
    localTreeId: v.string(),
    name: v.string(),
    variety: v.string(),
    plantedYear: v.number(),
    canopyDensity: v.union(
      v.literal('open'),
      v.literal('standard'),
      v.literal('dense')
    ),
    lastCanopyCount: v.number(),
    estimatedTotalNuts: v.number(),
    estimatedWeightKg: v.number(),
    avgNutDiameterMm: v.number(),
    healthScore: v.number(),
    updatedAtMs: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_local_id', ['userId', 'localTreeId']),

  yoloScans: defineTable({
    userId: v.string(),
    localRecordId: v.string(),
    treeId: v.string(),
    mode: v.union(
      v.literal('canopy'),
      v.literal('ground'),
      v.literal('growth')
    ),
    detectedCount: v.number(),
    hullSplitCount: v.number(),
    estimatedTotalNuts: v.number(),
    estimatedWeightKg: v.number(),
    avgDiameterMm: v.optional(v.number()),
    capturedAtMs: v.number(),
    syncedAtMs: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_local_record_id', ['localRecordId']),

  careLogs: defineTable({
    userId: v.string(),
    localRecordId: v.string(),
    category: v.union(
      v.literal('pruning'),
      v.literal('watering'),
      v.literal('feeding'),
      v.literal('harvest'),
      v.literal('winter')
    ),
    title: v.string(),
    notes: v.optional(v.string()),
    completed: v.boolean(),
    loggedAtMs: v.number(),
    syncedAtMs: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_local_record_id', ['localRecordId']),

  tuyaSensorSnapshots: defineTable({
    userId: v.string(),
    localRecordId: v.string(),
    sensorNodeId: v.string(),
    category: v.string(),
    label: v.string(),
    valueDisplay: v.string(),
    subValueDisplay: v.string(),
    recordedAtMs: v.number(),
    syncedAtMs: v.number(),
  }).index('by_user', ['userId']),

  // Admin-controlled optimal care defaults (managed from walnut.pinarlik.com)
  careDefaults: defineTable({
    key: v.string(), // e.g. "global_walnut_defaults"
    irrigationIntervalDays: v.number(),
    targetSoilMoisturePct: v.number(),
    chillHoursTarget: v.number(),
    nitrogenCutoffMonthDay: v.string(),
    harvestHullSplitPct: v.number(),
    dailyGuidanceNote: v.optional(v.string()),
    updatedByAdminAtMs: v.number(),
  }).index('by_key', ['key']),

  // Per-grower soil & location overrides (customizable in Mobile App)
  orchardOverrides: defineTable({
    userId: v.string(),
    soilType: v.union(v.literal('loam'), v.literal('clay'), v.literal('sandy')),
    locationZone: v.string(),
    irrigationIntervalDays: v.optional(v.number()),
    targetSoilMoisturePct: v.optional(v.number()),
    chillHoursTarget: v.optional(v.number()),
    updatedAtMs: v.number(),
  }).index('by_user', ['userId']),

  // Orchard Sensors & Smart Irrigation Switches Shop (Admin-managed from web-app)
  shopProducts: defineTable({
    sku: v.string(),
    name: v.string(),
    category: v.union(v.literal('sensor'), v.literal('switch'), v.literal('kit')),
    priceUsd: v.number(),
    description: v.string(),
    imageStorageId: v.optional(v.id('_storage')),
    imageUrl: v.optional(v.string()),
    inStock: v.boolean(),
    featured: v.boolean(),
    updatedAtMs: v.number(),
  }).index('by_sku', ['sku']),

  shopOrders: defineTable({
    userId: v.string(),
    items: v.array(
      v.object({
        sku: v.string(),
        name: v.string(),
        qty: v.number(),
        priceUsd: v.number(),
      })
    ),
    totalUsd: v.number(),
    shippingAddress: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('shipped')
    ),
    createdAtMs: v.number(),
  }).index('by_user', ['userId']),

  messages: defineTable({
    channelId: v.string(),
    senderClerkId: v.string(),
    senderName: v.string(),
    senderRole: v.string(),
    senderRegion: v.string(),
    text: v.string(),
    sharedCard: v.optional(
      v.object({
        treeName: v.string(),
        variety: v.string(),
        treeAgeYears: v.number(),
        scanMode: v.union(
          v.literal('Canopy Yield Count'),
          v.literal('Ground Harvest Picker'),
          v.literal('Health & Growth')
        ),
        detectedInFrame: v.number(),
        estimatedTotalNuts: v.number(),
        estimatedYieldKg: v.number(),
        avgNutSizeMm: v.number(),
        careNote: v.string(),
      })
    ),
    moderationStatus: v.optional(
      v.union(v.literal('approved'), v.literal('hidden_by_admin'))
    ),
    createdAtMs: v.number(),
  })
    .index('by_channel', ['channelId', 'createdAtMs'])
    .index('by_sender', ['senderClerkId']),

  pipelineLogs: defineTable({
    category: v.string(),
    jobName: v.string(),
    status: v.string(),
    target: v.optional(v.string()),
    engines: v.optional(v.array(v.string())),
    logs: v.array(v.string()),
    createdAtMs: v.number(),
    expiresAtMs: v.number(),
  })
    .index('by_category', ['category', 'createdAtMs'])
    .index('by_expires', ['expiresAtMs']),

  // Expert walnut care & maintenance cards (editable/expandable by admin)
  careCards: defineTable({
    slug: v.string(),
    title: v.string(),
    season: v.union(
      v.literal('spring'),
      v.literal('summer'),
      v.literal('fall'),
      v.literal('winter'),
      v.literal('all')
    ),
    category: v.string(), // blight_pest | fertilizing | irrigation | pruning | harvest | weather | seminars_expo | news
    targetLevel: v.union(
      v.literal('all'),
      v.literal('beginner'),
      v.literal('experienced'),
      v.literal('expert')
    ),
    summary: v.string(),
    actionChecklist: v.array(v.string()),
    defaultNotificationTitle: v.string(),
    defaultNotificationBody: v.string(),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
  }).index('by_slug', ['slug']),

  // Admin push & scheduled notifications to growers
  careNotifications: defineTable({
    title: v.string(),
    body: v.string(),
    category: v.string(),
    targetAudience: v.union(
      v.literal('all'),
      v.literal('level'),
      v.literal('selected_users')
    ),
    targetLevel: v.optional(
      v.union(v.literal('beginner'), v.literal('experienced'), v.literal('expert'))
    ),
    targetUserIds: v.optional(v.array(v.string())),
    status: v.union(
      v.literal('sent'),
      v.literal('scheduled'),
      v.literal('cancelled')
    ),
    scheduledForMs: v.optional(v.number()),
    sentAtMs: v.optional(v.number()),
    createdAtMs: v.number(),
  })
    .index('by_status', ['status', 'createdAtMs'])
    .index('by_created', ['createdAtMs']),

  // Grouped Orchard Fields with 4-Quadrant Yield Sampling & Insurance Evidence Blobs
  orchardFields: defineTable({
    userId: v.string(),
    localFieldId: v.string(),
    name: v.string(),
    variety: v.string(),
    plantedYear: v.number(),
    treeCount: v.number(),
    areaHectares: v.number(),
    canopyDensity: v.union(
      v.literal('open'),
      v.literal('standard'),
      v.literal('dense')
    ),
    seasonYear: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    treeSpacingMeters: v.optional(v.number()),
    boundaryPins: v.optional(
      v.array(
        v.object({
          latitude: v.number(),
          longitude: v.number(),
          label: v.optional(v.string()),
        })
      )
    ),
    fieldNote: v.optional(v.string()),
    quadrants: v.array(
      v.object({
        quadrantId: v.string(),
        allocatedTrees: v.optional(v.number()),
        sampledTreeLabel: v.string(),
        scannedNutsPerTree: v.number(),
        estimatedWeightKgPerTree: v.number(),
        note: v.string(),
        evidenceStorageIds: v.optional(v.array(v.id('_storage'))),
        updatedAtMs: v.number(),
      })
    ),
    updatedAtMs: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_local_id', ['userId', 'localFieldId']),

  // Marketplace: Producer Crop Listings
  marketplaceListings: defineTable({
    userId: v.string(),
    localDraftId: v.optional(v.string()),
    producerName: v.string(),
    orchardFieldLocalId: v.optional(v.string()),
    verifiedOrchardSummary: v.optional(
      v.object({
        treeCount: v.number(),
        plantedYear: v.number(),
        sampledDiameterMm: v.optional(v.number()),
      })
    ),
    title: v.string(),
    description: v.string(),
    variety: v.string(),
    lotStage: v.union(
      v.literal('pre_harvest'),
      v.literal('harvesting'),
      v.literal('in_storage')
    ),
    form: v.union(v.literal('in_shell'), v.literal('shelled_kernel')),
    availableKg: v.number(),
    minOrderKg: v.optional(v.number()),
    avgDiameterMm: v.optional(v.number()),
    kernelGrade: v.union(
      v.literal('extra_light'),
      v.literal('light'),
      v.literal('amber'),
      v.literal('mixed')
    ),
    moisturePct: v.optional(v.number()),
    packagingType: v.union(
      v.literal('bulk_bin'),
      v.literal('mesh_25kg'),
      v.literal('jute_50kg'),
      v.literal('big_bag_1t'),
      v.literal('buyer_bags')
    ),
    dryingMethod: v.union(
      v.literal('green_in_hull'),
      v.literal('washed_wet'),
      v.literal('mechanical_dryer'),
      v.literal('sun_dried')
    ),
    loadingLogistics: v.union(
      v.literal('farm_gate_forklift'),
      v.literal('producer_delivers')
    ),
    pricingMode: v.union(
      v.literal('fixed_per_kg'),
      v.literal('contact_for_quote')
    ),
    pricePerKg: v.optional(v.number()),
    currency: v.union(v.literal('USD'), v.literal('TRY'), v.literal('EUR')),
    region: v.string(),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
    contact: v.object({
      phone: v.string(),
      whatsapp: v.optional(v.string()),
      email: v.optional(v.string()),
      showPhone: v.boolean(),
      showWhatsapp: v.boolean(),
      showEmail: v.boolean(),
      allowInAppChat: v.boolean(),
    }),
    photoSlots: v.array(
      v.object({
        slotKey: v.union(
          v.literal('pile'),
          v.literal('caliber'),
          v.literal('crack_test'),
          v.literal('kernel_color'),
          v.literal('storage')
        ),
        storageId: v.id('_storage'),
      })
    ),
    status: v.union(
      v.literal('active'),
      v.literal('negotiating'),
      v.literal('sold'),
      v.literal('archived')
    ),
    moderationStatus: v.optional(
      v.union(v.literal('approved'), v.literal('hidden_by_admin'))
    ),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
  })
    .index('by_user', ['userId', 'updatedAtMs'])
    .index('by_user_and_local_draft', ['userId', 'localDraftId'])
    .index('by_status_updated', ['status', 'updatedAtMs'])
    .index('by_variety_status', ['variety', 'status', 'updatedAtMs']),

  // Marketplace: Wholesaler Public Buyer Profiles
  wholesalerProfiles: defineTable({
    userId: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    region: v.string(),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
    bio: v.string(),
    howWeWork: v.string(),
    preferredVarieties: v.array(v.string()),
    minPurchaseKg: v.optional(v.number()),
    maxPurchaseKg: v.optional(v.number()),
    contact: v.object({
      phone: v.string(),
      whatsapp: v.optional(v.string()),
      email: v.optional(v.string()),
      showPhone: v.boolean(),
      showWhatsapp: v.boolean(),
      showEmail: v.boolean(),
      allowInAppChat: v.boolean(),
    }),
    isProfileComplete: v.boolean(),
    moderationStatus: v.optional(
      v.union(v.literal('approved'), v.literal('hidden_by_admin'))
    ),
    updatedAtMs: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_complete_updated', ['isProfileComplete', 'updatedAtMs']),

  // Marketplace: Wholesaler Active Buy Requests (multiple per buyer)
  wholesalerBuyRequests: defineTable({
    userId: v.string(),
    companyName: v.string(),
    title: v.string(),
    variety: v.string(),
    form: v.union(v.literal('in_shell'), v.literal('shelled_kernel')),
    kernelGrade: v.optional(
      v.union(
        v.literal('extra_light'),
        v.literal('light'),
        v.literal('amber'),
        v.literal('mixed')
      )
    ),
    minDiameterMm: v.optional(v.number()),
    targetKg: v.number(),
    targetPricePerKg: v.optional(v.number()),
    currency: v.union(v.literal('USD'), v.literal('TRY'), v.literal('EUR')),
    region: v.string(),
    note: v.string(),
    status: v.union(v.literal('active'), v.literal('closed')),
    moderationStatus: v.optional(
      v.union(v.literal('approved'), v.literal('hidden_by_admin'))
    ),
    updatedAtMs: v.number(),
  })
    .index('by_user', ['userId', 'updatedAtMs'])
    .index('by_status_variety', ['status', 'variety', 'updatedAtMs']),

  // Marketplace: Private 1-on-1 B2B Threads & Messages
  marketplaceThreads: defineTable({
    listingId: v.optional(v.id('marketplaceListings')),
    buyRequestId: v.optional(v.id('wholesalerBuyRequests')),
    producerUserId: v.string(),
    wholesalerUserId: v.string(),
    subjectTitle: v.string(),
    hasProducerReplied: v.boolean(),
    hasWholesalerReplied: v.boolean(),
    lastMessageAtMs: v.number(),
    lastMessagePreview: v.string(),
    createdAtMs: v.number(),
  })
    .index('by_producer', ['producerUserId', 'lastMessageAtMs'])
    .index('by_wholesaler', ['wholesalerUserId', 'lastMessageAtMs'])
    .index('by_pair_listing', ['producerUserId', 'wholesalerUserId', 'listingId']),

  marketplaceMessages: defineTable({
    threadId: v.id('marketplaceThreads'),
    senderUserId: v.string(),
    senderRole: v.union(v.literal('producer'), v.literal('wholesaler')),
    messageType: v.union(
      v.literal('text'),
      v.literal('sample_request'),
      v.literal('price_offer'),
      v.literal('exact_gps_pin')
    ),
    body: v.string(),
    structuredPayload: v.optional(
      v.union(
        v.object({
          kind: v.literal('sample_request'),
          sampleWeightKg: v.number(),
          addressNote: v.string(),
        }),
        v.object({
          kind: v.literal('price_offer'),
          quantityKg: v.number(),
          pricePerKg: v.number(),
          currency: v.union(
            v.literal('USD'),
            v.literal('TRY'),
            v.literal('EUR')
          ),
          pickupWindow: v.string(),
        }),
        v.object({
          kind: v.literal('exact_gps_pin'),
          latitude: v.number(),
          longitude: v.number(),
          fieldLabel: v.string(),
        })
      )
    ),
    attachmentStorageId: v.optional(v.id('_storage')),
    scrubbedOnDeletion: v.optional(v.boolean()),
    createdAtMs: v.number(),
  })
    .index('by_thread_created', ['threadId', 'createdAtMs'])
    .index('by_sender', ['senderUserId']),

  // Marketplace: Peer Trust Badges & Dispute Audit Archive
  marketplaceTrustFeedback: defineTable({
    recipientUserId: v.optional(v.string()),
    recipientRole: v.union(v.literal('producer'), v.literal('wholesaler')),
    authorUserId: v.optional(v.string()),
    authorRole: v.union(v.literal('producer'), v.literal('wholesaler')),
    badgeType: v.union(
      v.literal('trusted_seller'),
      v.literal('trusted_buyer')
    ),
    threadId: v.id('marketplaceThreads'),
    comment: v.string(),
    visibilityStatus: v.union(
      v.literal('published'),
      v.literal('dispute_pending'),
      v.literal('cleared_unfounded'),
      v.literal('policy_removed')
    ),
    hiddenFromPublication: v.boolean(),
    disputeReason: v.optional(v.string()),
    reDisputeLocked: v.optional(v.boolean()),
    resolvedByAdminId: v.optional(v.string()),
    resolvedAtMs: v.optional(v.number()),
    anonymizedPhoneHash: v.optional(v.string()),
    expiresAtMs: v.optional(v.number()),
    createdAtMs: v.number(),
  })
    .index('by_recipient', ['recipientUserId', 'createdAtMs'])
    .index('by_author_recipient_type', [
      'authorUserId',
      'recipientUserId',
      'badgeType',
    ])
    .index('by_dispute_status', ['visibilityStatus', 'createdAtMs']),

  // Marketplace: Pre-aggregated O(1) Market Pulse Metrics
  marketPulseStats: defineTable({
    key: v.string(),
    variety: v.string(),
    form: v.union(v.literal('in_shell'), v.literal('shelled_kernel')),
    currency: v.union(v.literal('USD'), v.literal('TRY'), v.literal('EUR')),
    activeListingCount: v.number(),
    totalAvailableKg: v.number(),
    minPricePerKg: v.optional(v.number()),
    maxPricePerKg: v.optional(v.number()),
    activeBuyRequestCount: v.number(),
    totalDemandKg: v.number(),
    updatedAtMs: v.number(),
  }).index('by_key', ['key']),

  // Marketplace & Community: Google Play UGC Reporting & Blocking
  marketplaceReports: defineTable({
    reporterUserId: v.string(),
    targetType: v.union(
      v.literal('listing'),
      v.literal('wholesaler_profile'),
      v.literal('buy_request'),
      v.literal('thread_message'),
      v.literal('group_message')
    ),
    targetId: v.string(),
    reportedUserId: v.string(),
    reason: v.string(),
    status: v.union(
      v.literal('open'),
      v.literal('actioned'),
      v.literal('dismissed')
    ),
    createdAtMs: v.number(),
  }).index('by_status', ['status', 'createdAtMs']),

  userBlocks: defineTable({
    blockerUserId: v.string(),
    blockedUserId: v.string(),
    createdAtMs: v.number(),
  }).index('by_blocker', ['blockerUserId', 'blockedUserId']),
});

