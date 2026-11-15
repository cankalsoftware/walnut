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
    email: v.string(),
    displayName: v.string(),
    role: v.optional(v.union(v.literal('admin'), v.literal('grower'))),
    authProvider: v.union(v.literal('google'), v.literal('email')),
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
    .index('by_email', ['email']),

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
});

