import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import {
  isAdminCaller,
  normalizeE164Phone,
  requireAdmin,
  requireCompletedOnboarding,
  requireCompletedWholesalerProfile,
  requireSignedIn,
  snapApproxCoords,
} from './lib/auth';

const PHOTO_SLOT_VALIDATOR = v.object({
  slotKey: v.union(
    v.literal('pile'),
    v.literal('caliber'),
    v.literal('crack_test'),
    v.literal('kernel_color'),
    v.literal('storage')
  ),
  storageId: v.id('_storage'),
});

const CURRENCY_VALIDATOR = v.union(
  v.literal('USD'),
  v.literal('TRY'),
  v.literal('EUR')
);

const FORM_VALIDATOR = v.union(
  v.literal('in_shell'),
  v.literal('shelled_kernel')
);

const KERNEL_GRADE_VALIDATOR = v.union(
  v.literal('extra_light'),
  v.literal('light'),
  v.literal('amber'),
  v.literal('mixed')
);

function haversineKm(
  lat1?: number,
  lng1?: number,
  lat2?: number,
  lng2?: number
): number | null {
  if (
    lat1 === undefined ||
    lng1 === undefined ||
    lat2 === undefined ||
    lng2 === undefined
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(a))).toFixed(1));
}

async function getBlockedUserSet(
  ctx: QueryCtx | MutationCtx,
  callerId: string
): Promise<Set<string>> {
  const blocked = await ctx.db
    .query('userBlocks')
    .withIndex('by_blocker', (q) => q.eq('blockerUserId', callerId))
    .collect();
  return new Set(blocked.map((b) => b.blockedUserId));
}

async function isBlockedPair(
  ctx: QueryCtx | MutationCtx,
  userA: string,
  userB: string
): Promise<boolean> {
  const ab = await ctx.db
    .query('userBlocks')
    .withIndex('by_blocker', (q) =>
      q.eq('blockerUserId', userA).eq('blockedUserId', userB)
    )
    .first();
  if (ab) return true;
  const ba = await ctx.db
    .query('userBlocks')
    .withIndex('by_blocker', (q) =>
      q.eq('blockerUserId', userB).eq('blockedUserId', userA)
    )
    .first();
  return Boolean(ba);
}

function redactContactDto(
  contact: {
    phone: string;
    whatsapp?: string;
    email?: string;
    showPhone: boolean;
    showWhatsapp: boolean;
    showEmail: boolean;
    allowInAppChat: boolean;
  },
  isLockedForBuyerProfile: boolean
) {
  if (isLockedForBuyerProfile) {
    return {
      phone: null,
      whatsapp: null,
      email: null,
      showPhone: contact.showPhone,
      showWhatsapp: contact.showWhatsapp,
      showEmail: contact.showEmail,
      allowInAppChat: false,
      contactLockedReason: 'complete_buyer_profile' as const,
    };
  }
  return {
    phone: contact.showPhone ? contact.phone : null,
    whatsapp: contact.showWhatsapp ? contact.whatsapp ?? contact.phone : null,
    email: contact.showEmail ? contact.email ?? null : null,
    showPhone: contact.showPhone,
    showWhatsapp: contact.showWhatsapp,
    showEmail: contact.showEmail,
    allowInAppChat: contact.allowInAppChat,
    contactLockedReason: null,
  };
}

/**
 * Incrementally refreshes a materialized `(variety, form, currency)` bucket in `marketPulseStats`.
 */
async function refreshPulseBucket(
  ctx: MutationCtx,
  variety: string,
  form: 'in_shell' | 'shelled_kernel',
  currency: 'USD' | 'TRY' | 'EUR'
) {
  const key = `${variety}:${form}:${currency}`;
  const listings = await ctx.db
    .query('marketplaceListings')
    .withIndex('by_variety_status', (q) => q.eq('variety', variety))
    .collect();

  const activeListings = listings.filter(
    (l) =>
      (l.status === 'active' || l.status === 'negotiating') &&
      l.moderationStatus !== 'hidden_by_admin' &&
      l.form === form &&
      l.currency === currency
  );

  const requests = await ctx.db
    .query('wholesalerBuyRequests')
    .withIndex('by_status_variety', (q) =>
      q.eq('status', 'active').eq('variety', variety)
    )
    .collect();

  const activeRequests = requests.filter(
    (r) =>
      r.moderationStatus !== 'hidden_by_admin' &&
      r.form === form &&
      r.currency === currency
  );

  const prices = activeListings
    .map((l) => l.pricePerKg)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  const payload = {
    key,
    variety,
    form,
    currency,
    activeListingCount: activeListings.length,
    totalAvailableKg: activeListings.reduce((s, l) => s + l.availableKg, 0),
    minPricePerKg: prices.length > 0 ? Math.min(...prices) : undefined,
    maxPricePerKg: prices.length > 0 ? Math.max(...prices) : undefined,
    activeBuyRequestCount: activeRequests.length,
    totalDemandKg: activeRequests.reduce((s, r) => s + r.targetKg, 0),
    updatedAtMs: Date.now(),
  };

  const existing = await ctx.db
    .query('marketPulseStats')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert('marketPulseStats', payload);
  }
}

async function resolvePhotoUrls(
  ctx: QueryCtx,
  slots: Doc<'marketplaceListings'>['photoSlots']
) {
  return await Promise.all(
    slots.map(async (slot) => ({
      slotKey: slot.slotKey,
      storageId: slot.storageId,
      url: await ctx.storage.getUrl(slot.storageId),
    }))
  );
}

async function getCallerContactGate(
  ctx: QueryCtx,
  user: Doc<'users'> | null,
  callerId: string
): Promise<boolean> {
  if (!user || user.accountType !== 'wholesaler') {
    return false;
  }
  const wp = await ctx.db
    .query('wholesalerProfiles')
    .withIndex('by_user', (q) => q.eq('userId', callerId))
    .first();
  return !(wp && wp.isProfileComplete);
}

// ============================================================================
// CROP LISTINGS (PRODUCER SELLERS)
// ============================================================================

export const generateListingPhotoUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSignedIn(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const listMarketplaceListings = query({
  args: {
    variety: v.optional(v.string()),
    form: v.optional(FORM_VALIDATOR),
    lotStage: v.optional(
      v.union(
        v.literal('pre_harvest'),
        v.literal('harvesting'),
        v.literal('in_storage')
      )
    ),
    minKg: v.optional(v.number()),
    minDiameterMm: v.optional(v.number()),
    maxDistanceKm: v.optional(v.number()),
    callerLat: v.optional(v.number()),
    callerLng: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const caller = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    if (caller?.accountStatus === 'banned') {
      return [];
    }

    const blockedSet = await getBlockedUserSet(ctx, identity.subject);
    const lockContact = await getCallerContactGate(
      ctx,
      caller,
      identity.subject
    );

    const limit = Math.min(50, Math.max(1, args.limit ?? 30));
    const rawRows = args.variety
      ? await ctx.db
          .query('marketplaceListings')
          .withIndex('by_variety_status', (q) =>
            q.eq('variety', args.variety!).eq('status', 'active')
          )
          .order('desc')
          .take(limit * 2)
      : await ctx.db
          .query('marketplaceListings')
          .withIndex('by_status_updated', (q) => q.eq('status', 'active'))
          .order('desc')
          .take(limit * 2);

    const filtered = rawRows
      .filter((item) => {
        if (item.moderationStatus === 'hidden_by_admin') return false;
        if (blockedSet.has(item.userId)) return false;
        if (args.form && item.form !== args.form) return false;
        if (args.lotStage && item.lotStage !== args.lotStage) return false;
        if (args.minKg !== undefined && item.availableKg < args.minKg) {
          return false;
        }
        if (
          args.minDiameterMm !== undefined &&
          (item.avgDiameterMm ?? 0) < args.minDiameterMm
        ) {
          return false;
        }
        if (args.maxDistanceKm !== undefined) {
          const dist = haversineKm(
            args.callerLat,
            args.callerLng,
            item.approxLat,
            item.approxLng
          );
          if (dist !== null && dist > args.maxDistanceKm) return false;
        }
        return true;
      })
      .slice(0, limit);

    return await Promise.all(
      filtered.map(async (item) => {
        const owner = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', (q) => q.eq('clerkId', item.userId))
          .first();
        const photos = await resolvePhotoUrls(ctx, item.photoSlots);
        const distanceKm = haversineKm(
          args.callerLat,
          args.callerLng,
          item.approxLat,
          item.approxLng
        );
        return {
          _id: item._id,
          userId: item.userId,
          producerName: item.producerName,
          trustedSellerCount: owner?.trustedSellerCount ?? 0,
          verifiedOrchardSummary: item.verifiedOrchardSummary ?? null,
          title: item.title,
          description: item.description,
          variety: item.variety,
          lotStage: item.lotStage,
          form: item.form,
          availableKg: item.availableKg,
          minOrderKg: item.minOrderKg ?? null,
          avgDiameterMm: item.avgDiameterMm ?? null,
          kernelGrade: item.kernelGrade,
          moisturePct: item.moisturePct ?? null,
          packagingType: item.packagingType,
          dryingMethod: item.dryingMethod,
          loadingLogistics: item.loadingLogistics,
          pricingMode: item.pricingMode,
          pricePerKg: item.pricePerKg ?? null,
          currency: item.currency,
          region: item.region,
          approxLat: item.approxLat ?? null,
          approxLng: item.approxLng ?? null,
          distanceKm,
          photos,
          contact: redactContactDto(
            item.contact,
            item.userId === identity.subject ? false : lockContact
          ),
          status: item.status,
          updatedAtMs: item.updatedAtMs,
        };
      })
    );
  },
});

export const listMyListings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db
      .query('marketplaceListings')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .take(40);

    return await Promise.all(
      rows.map(async (item) => ({
        ...item,
        photos: await resolvePhotoUrls(ctx, item.photoSlots),
      }))
    );
  },
});

export const getListingById = query({
  args: { listingId: v.id('marketplaceListings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const item = await ctx.db.get(args.listingId);
    if (!item) return null;
    if (
      item.moderationStatus === 'hidden_by_admin' &&
      item.userId !== identity.subject &&
      !(await isAdminCaller(ctx))
    ) {
      return null;
    }

    const caller = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    const lockContact =
      item.userId !== identity.subject &&
      (await getCallerContactGate(ctx, caller, identity.subject));

    return {
      ...item,
      photos: await resolvePhotoUrls(ctx, item.photoSlots),
      contact: redactContactDto(item.contact, lockContact),
    };
  },
});

export const createOrUpdateListing = mutation({
  args: {
    listingId: v.optional(v.id('marketplaceListings')),
    localDraftId: v.optional(v.string()),
    orchardFieldLocalId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    variety: v.string(),
    lotStage: v.union(
      v.literal('pre_harvest'),
      v.literal('harvesting'),
      v.literal('in_storage')
    ),
    form: FORM_VALIDATOR,
    availableKg: v.number(),
    minOrderKg: v.optional(v.number()),
    avgDiameterMm: v.optional(v.number()),
    kernelGrade: KERNEL_GRADE_VALIDATOR,
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
    currency: CURRENCY_VALIDATOR,
    region: v.string(),
    rawLat: v.optional(v.number()),
    rawLng: v.optional(v.number()),
    contactPhone: v.optional(v.string()),
    contactWhatsapp: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    showPhone: v.boolean(),
    showWhatsapp: v.boolean(),
    showEmail: v.boolean(),
    allowInAppChat: v.boolean(),
    photoSlots: v.array(PHOTO_SLOT_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    if (user.accountType !== 'producer') {
      throw new Error('Only Producer accounts can publish walnut crop listings.');
    }

    if (!args.showPhone && !args.allowInAppChat) {
      throw new Error(
        'Enable at least Phone display or In-App Chat so wholesalers can reach you.'
      );
    }

    if (args.lotStage !== 'pre_harvest' && args.photoSlots.length === 0) {
      throw new Error(
        'Upload at least 1 photo for harvesting or in-storage lots (optional for pre-harvest).'
      );
    }

    const contactPhone = normalizeE164Phone(args.contactPhone || user.phone!);
    const contactWhatsapp = args.contactWhatsapp?.trim()
      ? normalizeE164Phone(args.contactWhatsapp)
      : undefined;
    const contactEmail = args.contactEmail?.trim().toLowerCase() || undefined;

    // Verify tracked orchard block ownership if linked
    let verifiedOrchardSummary:
      | {
          treeCount: number;
          plantedYear: number;
          sampledDiameterMm?: number;
        }
      | undefined;
    let coordLat = args.rawLat;
    let coordLng = args.rawLng;

    if (args.orchardFieldLocalId) {
      const ownedField = await ctx.db
        .query('orchardFields')
        .withIndex('by_user_and_local_id', (q) =>
          q
            .eq('userId', identity.subject)
            .eq('localFieldId', args.orchardFieldLocalId!)
        )
        .first();
      if (!ownedField) {
        throw new Error('Selected orchard field block does not belong to you.');
      }
      verifiedOrchardSummary = {
        treeCount: ownedField.treeCount,
        plantedYear: ownedField.plantedYear,
        sampledDiameterMm: args.avgDiameterMm,
      };
      if (coordLat === undefined && ownedField.latitude !== undefined) {
        coordLat = ownedField.latitude;
        coordLng = ownedField.longitude;
      }
    }

    const { approxLat, approxLng } = snapApproxCoords(coordLat, coordLng);

    // Resolve existing listing either by ID or idempotent localDraftId
    let existing = args.listingId ? await ctx.db.get(args.listingId) : null;
    if (!existing && args.localDraftId) {
      existing = await ctx.db
        .query('marketplaceListings')
        .withIndex('by_user_and_local_draft', (q) =>
          q
            .eq('userId', identity.subject)
            .eq('localDraftId', args.localDraftId!)
        )
        .first();
    }

    if (existing && existing.userId !== identity.subject) {
      throw new Error('Forbidden: cannot modify another producer listing.');
    }

    // Delete replaced _storage photo blobs
    if (existing) {
      const nextIds = new Set(
        args.photoSlots.map((s) => String(s.storageId))
      );
      for (const prevSlot of existing.photoSlots) {
        if (!nextIds.has(String(prevSlot.storageId))) {
          try {
            await ctx.storage.delete(prevSlot.storageId);
          } catch {
            // Blob already missing
          }
        }
      }
    }

    const now = Date.now();
    const recordFields = {
      userId: identity.subject,
      ...(args.localDraftId ? { localDraftId: args.localDraftId } : {}),
      producerName: user.displayName,
      orchardFieldLocalId: args.orchardFieldLocalId,
      verifiedOrchardSummary,
      title: args.title.trim(),
      description: args.description.trim(),
      variety: args.variety.trim(),
      lotStage: args.lotStage,
      form: args.form,
      availableKg: Math.max(1, args.availableKg),
      minOrderKg: args.minOrderKg,
      avgDiameterMm: args.avgDiameterMm,
      kernelGrade: args.kernelGrade,
      moisturePct: args.moisturePct,
      packagingType: args.packagingType,
      dryingMethod: args.dryingMethod,
      loadingLogistics: args.loadingLogistics,
      pricingMode: args.pricingMode,
      pricePerKg:
        args.pricingMode === 'fixed_per_kg' ? args.pricePerKg : undefined,
      currency: args.currency,
      region: args.region.trim() || user.region || 'Orchard Region',
      approxLat,
      approxLng,
      contact: {
        phone: contactPhone,
        whatsapp: contactWhatsapp,
        email: contactEmail,
        showPhone: args.showPhone,
        showWhatsapp: args.showWhatsapp,
        showEmail: args.showEmail,
        allowInAppChat: args.allowInAppChat,
      },
      photoSlots: args.photoSlots.slice(0, 5),
      status: existing?.status ?? ('active' as const),
      moderationStatus: existing?.moderationStatus ?? ('approved' as const),
      updatedAtMs: now,
    };

    let listingId: Id<'marketplaceListings'>;
    if (existing) {
      await ctx.db.patch(existing._id, recordFields);
      listingId = existing._id;
    } else {
      listingId = await ctx.db.insert('marketplaceListings', {
        ...recordFields,
        createdAtMs: now,
      });
    }

    await refreshPulseBucket(ctx, args.variety.trim(), args.form, args.currency);
    return { listingId };
  },
});

export const markListingStatus = mutation({
  args: {
    listingId: v.id('marketplaceListings'),
    status: v.union(
      v.literal('active'),
      v.literal('negotiating'),
      v.literal('sold'),
      v.literal('archived')
    ),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireCompletedOnboarding(ctx);
    const existing = await ctx.db.get(args.listingId);
    if (!existing) {
      throw new Error('Listing not found.');
    }
    if (existing.userId !== identity.subject) {
      throw new Error('Forbidden: only the listing owner can change status.');
    }
    await ctx.db.patch(existing._id, {
      status: args.status,
      updatedAtMs: Date.now(),
    });
    await refreshPulseBucket(
      ctx,
      existing.variety,
      existing.form,
      existing.currency
    );
    return { updated: true, status: args.status };
  },
});

// ============================================================================
// WHOLESALER PROFILES & BUY REQUESTS
// ============================================================================

export const upsertWholesalerProfile = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    region: v.string(),
    rawLat: v.optional(v.number()),
    rawLng: v.optional(v.number()),
    bio: v.string(),
    howWeWork: v.string(),
    preferredVarieties: v.array(v.string()),
    minPurchaseKg: v.optional(v.number()),
    maxPurchaseKg: v.optional(v.number()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    showPhone: v.boolean(),
    showWhatsapp: v.boolean(),
    showEmail: v.boolean(),
    allowInAppChat: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    if (user.accountType !== 'wholesaler') {
      throw new Error(
        'Only Wholesaler accounts can publish a buyer profile.'
      );
    }

    const normalizedPhone = normalizeE164Phone(args.phone || user.phone!);
    const companyName = args.companyName.trim();
    const contactName = args.contactName.trim();
    const region = args.region.trim();
    const bio = args.bio.trim();
    const howWeWork = args.howWeWork.trim();

    const isProfileComplete = Boolean(
      companyName.length >= 2 &&
        contactName.length >= 2 &&
        normalizedPhone &&
        region.length >= 2 &&
        bio.length >= 10 &&
        howWeWork.length >= 10
    );

    const { approxLat, approxLng } = snapApproxCoords(args.rawLat, args.rawLng);
    const existing = await ctx.db
      .query('wholesalerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first();

    const payload = {
      userId: identity.subject,
      companyName,
      contactName,
      region,
      approxLat,
      approxLng,
      bio,
      howWeWork,
      preferredVarieties: args.preferredVarieties,
      minPurchaseKg: args.minPurchaseKg,
      maxPurchaseKg: args.maxPurchaseKg,
      contact: {
        phone: normalizedPhone,
        whatsapp: args.whatsapp?.trim()
          ? normalizeE164Phone(args.whatsapp)
          : undefined,
        email: args.email?.trim().toLowerCase() || undefined,
        showPhone: args.showPhone,
        showWhatsapp: args.showWhatsapp,
        showEmail: args.showEmail,
        allowInAppChat: args.allowInAppChat,
      },
      isProfileComplete,
      moderationStatus: existing?.moderationStatus ?? ('approved' as const),
      updatedAtMs: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { profileId: existing._id, isProfileComplete };
    }
    const profileId = await ctx.db.insert('wholesalerProfiles', payload);
    return { profileId, isProfileComplete };
  },
});

export const getMyWholesalerProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('wholesalerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first();
  },
});

export const listWholesalers = query({
  args: {
    variety: v.optional(v.string()),
    region: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const blockedSet = await getBlockedUserSet(ctx, identity.subject);
    const limit = Math.min(50, Math.max(1, args.limit ?? 30));

    const profiles = await ctx.db
      .query('wholesalerProfiles')
      .withIndex('by_complete_updated', (q) => q.eq('isProfileComplete', true))
      .order('desc')
      .take(limit * 2);

    const filtered = profiles
      .filter((p) => {
        if (p.moderationStatus === 'hidden_by_admin') return false;
        if (blockedSet.has(p.userId)) return false;
        if (
          args.variety &&
          !p.preferredVarieties.includes('All') &&
          !p.preferredVarieties.includes(args.variety)
        ) {
          return false;
        }
        if (
          args.region &&
          !p.region.toLowerCase().includes(args.region.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .slice(0, limit);

    return await Promise.all(
      filtered.map(async (p) => {
        const owner = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', (q) => q.eq('clerkId', p.userId))
          .first();
        return {
          _id: p._id,
          userId: p.userId,
          companyName: p.companyName,
          contactName: p.contactName,
          region: p.region,
          bio: p.bio,
          howWeWork: p.howWeWork,
          preferredVarieties: p.preferredVarieties,
          minPurchaseKg: p.minPurchaseKg ?? null,
          maxPurchaseKg: p.maxPurchaseKg ?? null,
          trustedBuyerCount: owner?.trustedBuyerCount ?? 0,
          contact: redactContactDto(p.contact, false),
          updatedAtMs: p.updatedAtMs,
        };
      })
    );
  },
});

export const upsertBuyRequest = mutation({
  args: {
    requestId: v.optional(v.id('wholesalerBuyRequests')),
    title: v.string(),
    variety: v.string(),
    form: FORM_VALIDATOR,
    kernelGrade: v.optional(KERNEL_GRADE_VALIDATOR),
    minDiameterMm: v.optional(v.number()),
    targetKg: v.number(),
    targetPricePerKg: v.optional(v.number()),
    currency: CURRENCY_VALIDATOR,
    region: v.string(),
    note: v.string(),
    status: v.union(v.literal('active'), v.literal('closed')),
  },
  handler: async (ctx, args) => {
    const { identity, profile } = await requireCompletedWholesalerProfile(ctx);
    const existing = args.requestId ? await ctx.db.get(args.requestId) : null;
    if (existing && existing.userId !== identity.subject) {
      throw new Error('Forbidden: cannot edit another buyer request.');
    }

    const payload = {
      userId: identity.subject,
      companyName: profile.companyName,
      title: args.title.trim(),
      variety: args.variety.trim(),
      form: args.form,
      kernelGrade: args.kernelGrade,
      minDiameterMm: args.minDiameterMm,
      targetKg: Math.max(100, args.targetKg),
      targetPricePerKg: args.targetPricePerKg,
      currency: args.currency,
      region: args.region.trim() || profile.region,
      note: args.note.trim(),
      status: args.status,
      moderationStatus: existing?.moderationStatus ?? ('approved' as const),
      updatedAtMs: Date.now(),
    };

    let requestId: Id<'wholesalerBuyRequests'>;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      requestId = existing._id;
    } else {
      requestId = await ctx.db.insert('wholesalerBuyRequests', payload);
    }

    await refreshPulseBucket(ctx, args.variety.trim(), args.form, args.currency);
    return { requestId };
  },
});

export const listActiveBuyRequests = query({
  args: {
    variety: v.optional(v.string()),
    form: v.optional(FORM_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const blockedSet = await getBlockedUserSet(ctx, identity.subject);
    const rows = args.variety
      ? await ctx.db
          .query('wholesalerBuyRequests')
          .withIndex('by_status_variety', (q) =>
            q.eq('status', 'active').eq('variety', args.variety!)
          )
          .order('desc')
          .take(40)
      : await ctx.db
          .query('wholesalerBuyRequests')
          .withIndex('by_status_variety', (q) => q.eq('status', 'active'))
          .order('desc')
          .take(40);

    return rows.filter((r) => {
      if (r.moderationStatus === 'hidden_by_admin') return false;
      if (blockedSet.has(r.userId)) return false;
      if (args.form && r.form !== args.form) return false;
      return true;
    });
  },
});

export const getMatchingBuyRequestsForListing = query({
  args: { listingId: v.id('marketplaceListings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return [];

    const requests = await ctx.db
      .query('wholesalerBuyRequests')
      .withIndex('by_status_variety', (q) =>
        q.eq('status', 'active').eq('variety', listing.variety)
      )
      .take(25);

    return requests.filter((r) => {
      if (r.moderationStatus === 'hidden_by_admin') return false;
      if (r.form !== listing.form) return false;
      if (
        r.minDiameterMm !== undefined &&
        listing.avgDiameterMm !== undefined &&
        listing.avgDiameterMm < r.minDiameterMm
      ) {
        return false;
      }
      return true;
    });
  },
});

export const getMatchingListingsForBuyRequest = query({
  args: { buyRequestId: v.id('wholesalerBuyRequests') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const req = await ctx.db.get(args.buyRequestId);
    if (!req) return [];

    const listings = await ctx.db
      .query('marketplaceListings')
      .withIndex('by_variety_status', (q) =>
        q.eq('variety', req.variety).eq('status', 'active')
      )
      .take(25);

    return listings.filter((l) => {
      if (l.moderationStatus === 'hidden_by_admin') return false;
      if (l.form !== req.form) return false;
      if (
        req.minDiameterMm !== undefined &&
        l.avgDiameterMm !== undefined &&
        l.avgDiameterMm < req.minDiameterMm
      ) {
        return false;
      }
      return true;
    });
  },
});

// ============================================================================
// B2B PRIVATE 1-ON-1 THREADS, ROLE-ISOLATED CHANNELS & MARKET PULSE
// ============================================================================

async function resolveThreadParties(
  ctx: MutationCtx,
  caller: Doc<'users'>,
  counterpartyUserId: string,
  listingId?: Id<'marketplaceListings'>,
  buyRequestId?: Id<'wholesalerBuyRequests'>
) {
  if (counterpartyUserId === caller.clerkId) {
    throw new Error('You cannot start a B2B conversation with yourself.');
  }
  if (await isBlockedPair(ctx, caller.clerkId, counterpartyUserId)) {
    throw new Error('Messaging unavailable due to a user block setting.');
  }

  let producerUserId: string;
  let wholesalerUserId: string;
  let subjectTitle = 'Walnut Trade Inquiry';

  if (caller.accountType === 'wholesaler') {
    await requireCompletedWholesalerProfile(ctx);
    wholesalerUserId = caller.clerkId;
    producerUserId = counterpartyUserId;
  } else {
    producerUserId = caller.clerkId;
    wholesalerUserId = counterpartyUserId;
  }

  if (listingId) {
    const listing = await ctx.db.get(listingId);
    if (listing) {
      subjectTitle = `${listing.variety} • ${listing.availableKg} kg (${listing.region})`;
    }
  } else if (buyRequestId) {
    const req = await ctx.db.get(buyRequestId);
    if (req) {
      subjectTitle = `Buy Request: ${req.variety} • ${req.targetKg} kg`;
    }
  }

  return { producerUserId, wholesalerUserId, subjectTitle };
}

export const getOrCreateThread = mutation({
  args: {
    listingId: v.optional(v.id('marketplaceListings')),
    buyRequestId: v.optional(v.id('wholesalerBuyRequests')),
    counterpartyUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCompletedOnboarding(ctx);
    const { producerUserId, wholesalerUserId, subjectTitle } =
      await resolveThreadParties(
        ctx,
        user,
        args.counterpartyUserId,
        args.listingId,
        args.buyRequestId
      );

    const existing = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_pair_listing', (q) =>
        q
          .eq('producerUserId', producerUserId)
          .eq('wholesalerUserId', wholesalerUserId)
          .eq('listingId', args.listingId)
      )
      .first();

    if (existing) {
      return { threadId: existing._id };
    }

    const now = Date.now();
    const threadId = await ctx.db.insert('marketplaceThreads', {
      listingId: args.listingId,
      buyRequestId: args.buyRequestId,
      producerUserId,
      wholesalerUserId,
      subjectTitle,
      hasProducerReplied: false,
      hasWholesalerReplied: false,
      lastMessageAtMs: now,
      lastMessagePreview: 'B2B inquiry opened',
      createdAtMs: now,
    });
    return { threadId };
  },
});

export const revealContactAndEnsureThread = mutation({
  args: {
    listingId: v.optional(v.id('marketplaceListings')),
    counterpartyUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCompletedOnboarding(ctx);
    if (user.accountType === 'wholesaler') {
      await requireCompletedWholesalerProfile(ctx);
    }

    const { producerUserId, wholesalerUserId, subjectTitle } =
      await resolveThreadParties(
        ctx,
        user,
        args.counterpartyUserId,
        args.listingId,
        undefined
      );

    let thread = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_pair_listing', (q) =>
        q
          .eq('producerUserId', producerUserId)
          .eq('wholesalerUserId', wholesalerUserId)
          .eq('listingId', args.listingId)
      )
      .first();

    if (!thread) {
      const now = Date.now();
      const tid = await ctx.db.insert('marketplaceThreads', {
        listingId: args.listingId,
        producerUserId,
        wholesalerUserId,
        subjectTitle,
        hasProducerReplied: false,
        hasWholesalerReplied: false,
        lastMessageAtMs: now,
        lastMessagePreview: 'Direct contact requested',
        createdAtMs: now,
      });
      thread = await ctx.db.get(tid);
    }

    if (args.listingId) {
      const listing = await ctx.db.get(args.listingId);
      if (listing) {
        return {
          threadId: thread?._id ?? null,
          contact: redactContactDto(listing.contact, false),
        };
      }
    }

    const profile = await ctx.db
      .query('wholesalerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', args.counterpartyUserId))
      .first();
    if (profile) {
      return {
        threadId: thread?._id ?? null,
        contact: redactContactDto(profile.contact, false),
      };
    }
    return { threadId: thread?._id ?? null, contact: null };
  },
});

export const listMyThreads = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const asProducer = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_producer', (q) => q.eq('producerUserId', identity.subject))
      .order('desc')
      .take(30);
    const asWholesaler = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_wholesaler', (q) =>
        q.eq('wholesalerUserId', identity.subject)
      )
      .order('desc')
      .take(30);

    const combined = new Map<string, Doc<'marketplaceThreads'>>();
    for (const t of [...asProducer, ...asWholesaler]) {
      combined.set(String(t._id), t);
    }

    return Array.from(combined.values()).sort(
      (a, b) => b.lastMessageAtMs - a.lastMessageAtMs
    );
  },
});

async function assertThreadParticipantOrDisputeAdmin(
  ctx: QueryCtx | MutationCtx,
  threadId: Id<'marketplaceThreads'>,
  callerId: string
) {
  const thread = await ctx.db.get(threadId);
  if (!thread) {
    throw new Error('Conversation thread not found.');
  }
  const isParticipant =
    thread.producerUserId === callerId ||
    thread.wholesalerUserId === callerId;
  if (isParticipant) {
    return thread;
  }

  // Only allow Admin read access if a dispute or report references this thread
  if (await isAdminCaller(ctx)) {
    const pendingDisputes = await ctx.db
      .query('marketplaceTrustFeedback')
      .withIndex('by_dispute_status', (q) =>
        q.eq('visibilityStatus', 'dispute_pending')
      )
      .collect();
    if (pendingDisputes.some((d) => d.threadId === thread._id)) {
      return thread;
    }
  }
  throw new Error('Forbidden: not a participant in this B2B thread.');
}

export const listThreadMessages = query({
  args: { threadId: v.id('marketplaceThreads') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    await assertThreadParticipantOrDisputeAdmin(
      ctx,
      args.threadId,
      identity.subject
    );

    return await ctx.db
      .query('marketplaceMessages')
      .withIndex('by_thread_created', (q) => q.eq('threadId', args.threadId))
      .order('asc')
      .take(100);
  },
});

export const generateThreadAttachmentUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCompletedOnboarding(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendThreadMessage = mutation({
  args: {
    threadId: v.id('marketplaceThreads'),
    body: v.string(),
    attachmentStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    const thread = await assertThreadParticipantOrDisputeAdmin(
      ctx,
      args.threadId,
      identity.subject
    );
    if (user.accountType === 'wholesaler') {
      await requireCompletedWholesalerProfile(ctx);
    }

    const senderRole =
      thread.producerUserId === identity.subject ? 'producer' : 'wholesaler';
    const text = args.body.trim();
    if (!text && !args.attachmentStorageId) {
      throw new Error('Message cannot be empty.');
    }

    const now = Date.now();
    await ctx.db.insert('marketplaceMessages', {
      threadId: thread._id,
      senderUserId: identity.subject,
      senderRole,
      messageType: 'text',
      body: text,
      attachmentStorageId: args.attachmentStorageId,
      createdAtMs: now,
    });

    await ctx.db.patch(thread._id, {
      hasProducerReplied: thread.hasProducerReplied || senderRole === 'producer',
      hasWholesalerReplied:
        thread.hasWholesalerReplied || senderRole === 'wholesaler',
      lastMessageAtMs: now,
      lastMessagePreview: text.slice(0, 80) || 'Attachment shared',
    });
    return { sent: true };
  },
});

export const sendStructuredAction = mutation({
  args: {
    threadId: v.id('marketplaceThreads'),
    payload: v.union(
      v.object({
        kind: v.literal('sample_request'),
        sampleWeightKg: v.number(),
        addressNote: v.string(),
      }),
      v.object({
        kind: v.literal('price_offer'),
        quantityKg: v.number(),
        pricePerKg: v.number(),
        currency: CURRENCY_VALIDATOR,
        pickupWindow: v.string(),
      }),
      v.object({
        kind: v.literal('exact_gps_pin'),
        latitude: v.number(),
        longitude: v.number(),
        fieldLabel: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    const thread = await assertThreadParticipantOrDisputeAdmin(
      ctx,
      args.threadId,
      identity.subject
    );
    if (user.accountType === 'wholesaler') {
      await requireCompletedWholesalerProfile(ctx);
    }

    const senderRole =
      thread.producerUserId === identity.subject ? 'producer' : 'wholesaler';

    if (args.payload.kind === 'exact_gps_pin' && senderRole !== 'producer') {
      throw new Error(
        'Only the Producer in this thread can share the orchard loading GPS pin.'
      );
    }

    let body = '';
    if (args.payload.kind === 'sample_request') {
      body = `Requested ${args.payload.sampleWeightKg} kg crack-test sample • ${args.payload.addressNote}`;
    } else if (args.payload.kind === 'price_offer') {
      body = `Trade Offer: ${args.payload.quantityKg} kg @ ${args.payload.pricePerKg} ${args.payload.currency}/kg (${args.payload.pickupWindow})`;
    } else {
      body = `Exact Orchard Loading GPS Pin: ${args.payload.fieldLabel} (${args.payload.latitude.toFixed(4)}, ${args.payload.longitude.toFixed(4)})`;
    }

    const now = Date.now();
    await ctx.db.insert('marketplaceMessages', {
      threadId: thread._id,
      senderUserId: identity.subject,
      senderRole,
      messageType: args.payload.kind,
      body,
      structuredPayload: args.payload,
      createdAtMs: now,
    });

    await ctx.db.patch(thread._id, {
      hasProducerReplied: thread.hasProducerReplied || senderRole === 'producer',
      hasWholesalerReplied:
        thread.hasWholesalerReplied || senderRole === 'wholesaler',
      lastMessageAtMs: now,
      lastMessagePreview: body.slice(0, 80),
    });
    return { sent: true };
  },
});

export const listRoleGroupMessages = query({
  args: {
    channelId: v.union(v.literal('sellers_only'), v.literal('buyers_only')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    if (!user || user.accountStatus === 'banned') return [];

    const isAdmin = await isAdminCaller(ctx);
    if (
      args.channelId === 'sellers_only' &&
      user.accountType !== 'producer' &&
      !isAdmin
    ) {
      throw new Error('Forbidden: Sellers Only room is restricted to Producers.');
    }
    if (
      args.channelId === 'buyers_only' &&
      user.accountType !== 'wholesaler' &&
      !isAdmin
    ) {
      throw new Error('Forbidden: Buyers Only room is restricted to Wholesalers.');
    }

    const rows = await ctx.db
      .query('messages')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
      .order('desc')
      .take(50);

    return rows
      .filter((m) => m.moderationStatus !== 'hidden_by_admin')
      .reverse();
  },
});

export const sendRoleGroupMessage = mutation({
  args: {
    channelId: v.union(v.literal('sellers_only'), v.literal('buyers_only')),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    const isAdmin = await isAdminCaller(ctx);

    if (
      args.channelId === 'sellers_only' &&
      user.accountType !== 'producer' &&
      !isAdmin
    ) {
      throw new Error('Forbidden: only Producers may post in Sellers Only.');
    }
    if (
      args.channelId === 'buyers_only' &&
      user.accountType !== 'wholesaler' &&
      !isAdmin
    ) {
      throw new Error('Forbidden: only Wholesalers may post in Buyers Only.');
    }

    const cleanText = args.text.trim();
    if (!cleanText) {
      throw new Error('Message text cannot be empty.');
    }

    let senderRegion = user.region ?? 'Orchard Region';
    if (user.accountType === 'wholesaler') {
      const wp = await ctx.db
        .query('wholesalerProfiles')
        .withIndex('by_user', (q) => q.eq('userId', identity.subject))
        .first();
      if (wp?.region) senderRegion = wp.region;
    }

    await ctx.db.insert('messages', {
      channelId: args.channelId,
      senderClerkId: identity.subject,
      senderName: user.displayName,
      senderRole:
        user.accountType === 'wholesaler' ? 'Wholesaler Buyer' : 'Walnut Producer',
      senderRegion,
      text: cleanText,
      moderationStatus: 'approved',
      createdAtMs: Date.now(),
    });
    return { sent: true };
  },
});

export const getMarketPulseStats = query({
  args: {
    form: v.optional(FORM_VALIDATOR),
    currency: v.optional(CURRENCY_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db.query('marketPulseStats').collect();
    return rows.filter((r) => {
      if (args.form && r.form !== args.form) return false;
      if (args.currency && r.currency !== args.currency) return false;
      return r.activeListingCount > 0 || r.activeBuyRequestCount > 0;
    });
  },
});

export const recomputeMarketPulseStats = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query('marketPulseStats').collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const listings = await ctx.db.query('marketplaceListings').collect();
    const requests = await ctx.db.query('wholesalerBuyRequests').collect();
    const seen = new Set<string>();

    for (const l of listings) {
      const key = `${l.variety}:${l.form}:${l.currency}`;
      if (!seen.has(key)) {
        seen.add(key);
        await refreshPulseBucket(ctx, l.variety, l.form, l.currency);
      }
    }
    for (const r of requests) {
      const key = `${r.variety}:${r.form}:${r.currency}`;
      if (!seen.has(key)) {
        seen.add(key);
        await refreshPulseBucket(ctx, r.variety, r.form, r.currency);
      }
    }
    return { bucketsRebuilt: seen.size };
  },
});

// ============================================================================
// TRUST BADGES, DISPUTE MODERATION & GOOGLE PLAY UGC SAFETY
// ============================================================================

async function syncRecipientBadgeCount(ctx: MutationCtx, recipientUserId: string) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', recipientUserId))
    .first();
  if (!user) return;

  const received = await ctx.db
    .query('marketplaceTrustFeedback')
    .withIndex('by_recipient', (q) => q.eq('recipientUserId', recipientUserId))
    .collect();

  const sellerCount = received.filter(
    (f) => !f.hiddenFromPublication && f.badgeType === 'trusted_seller'
  ).length;
  const buyerCount = received.filter(
    (f) => !f.hiddenFromPublication && f.badgeType === 'trusted_buyer'
  ).length;

  await ctx.db.patch(user._id, {
    trustedSellerCount: sellerCount,
    trustedBuyerCount: buyerCount,
  });
}

export const awardTrustBadge = mutation({
  args: {
    threadId: v.id('marketplaceThreads'),
    recipientUserId: v.string(),
    badgeType: v.union(v.literal('trusted_seller'), v.literal('trusted_buyer')),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCompletedOnboarding(ctx);
    if (args.recipientUserId === identity.subject) {
      throw new Error('You cannot award a Trust Badge to yourself.');
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Valid B2B conversation thread required.');
    }
    const participants = [thread.producerUserId, thread.wholesalerUserId];
    if (
      !participants.includes(identity.subject) ||
      !participants.includes(args.recipientUserId)
    ) {
      throw new Error('Thread does not match you and the recipient.');
    }
    if (!thread.hasProducerReplied || !thread.hasWholesalerReplied) {
      throw new Error(
        'Both buyer and seller must reply in the B2B thread before awarding a Trust Badge.'
      );
    }

    const cleanComment = args.comment.trim();
    if (cleanComment.length < 4) {
      throw new Error('Please include a brief factual trade comment.');
    }

    const existing = await ctx.db
      .query('marketplaceTrustFeedback')
      .withIndex('by_author_recipient_type', (q) =>
        q
          .eq('authorUserId', identity.subject)
          .eq('recipientUserId', args.recipientUserId)
          .eq('badgeType', args.badgeType)
      )
      .first();

    if (existing) {
      if (existing.visibilityStatus !== 'published') {
        throw new Error(
          'This feedback record is under review or moderated and cannot be edited.'
        );
      }
      await ctx.db.patch(existing._id, {
        comment: cleanComment,
        threadId: thread._id,
      });
      await syncRecipientBadgeCount(ctx, args.recipientUserId);
      return { feedbackId: existing._id, updated: true };
    }

    const recipientRole =
      args.badgeType === 'trusted_seller' ? 'producer' : 'wholesaler';
    const authorRole = user.accountType ?? 'producer';

    const feedbackId = await ctx.db.insert('marketplaceTrustFeedback', {
      recipientUserId: args.recipientUserId,
      recipientRole,
      authorUserId: identity.subject,
      authorRole,
      badgeType: args.badgeType,
      threadId: thread._id,
      comment: cleanComment,
      visibilityStatus: 'published',
      hiddenFromPublication: false,
      createdAtMs: Date.now(),
    });
    await syncRecipientBadgeCount(ctx, args.recipientUserId);
    return { feedbackId, updated: false };
  },
});

export const listTrustFeedbackForUser = query({
  args: { targetUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db
      .query('marketplaceTrustFeedback')
      .withIndex('by_recipient', (q) => q.eq('recipientUserId', args.targetUserId))
      .order('desc')
      .take(40);

    return rows
      .filter((r) => r.visibilityStatus !== 'cleared_unfounded')
      .map((r) => {
        if (r.visibilityStatus === 'policy_removed' || r.hiddenFromPublication) {
          return {
            _id: r._id,
            badgeType: r.badgeType,
            visibilityStatus: 'policy_removed' as const,
            hiddenFromPublication: true,
            publicNotice: 'Trust Badge Removed',
            comment: null,
            canDispute: false,
            createdAtMs: r.createdAtMs,
          };
        }
        return {
          _id: r._id,
          badgeType: r.badgeType,
          visibilityStatus: r.visibilityStatus,
          hiddenFromPublication: false,
          publicNotice: null,
          comment: r.comment,
          canDispute:
            args.targetUserId === identity.subject &&
            !r.reDisputeLocked &&
            r.visibilityStatus === 'published',
          createdAtMs: r.createdAtMs,
        };
      });
  },
});

export const requestBadgeRemovalDispute = mutation({
  args: {
    feedbackId: v.id('marketplaceTrustFeedback'),
    disputeReason: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireSignedIn(ctx);
    const fb = await ctx.db.get(args.feedbackId);
    if (!fb) {
      throw new Error('Trust badge feedback not found.');
    }
    if (fb.recipientUserId !== identity.subject) {
      throw new Error('Only the recipient can dispute a Trust Badge.');
    }
    if (fb.reDisputeLocked) {
      throw new Error('This feedback item has already been reviewed by Admin.');
    }

    await ctx.db.patch(fb._id, {
      visibilityStatus: 'dispute_pending',
      disputeReason: args.disputeReason.trim() || 'Requested Admin review',
    });
    return { submitted: true };
  },
});

export const reportMarketplaceContent = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const { identity } = await requireSignedIn(ctx);
    const reportId = await ctx.db.insert('marketplaceReports', {
      reporterUserId: identity.subject,
      targetType: args.targetType,
      targetId: args.targetId,
      reportedUserId: args.reportedUserId,
      reason: args.reason.trim() || 'Inappropriate or misleading content',
      status: 'open',
      createdAtMs: Date.now(),
    });
    return { reportId };
  },
});

export const blockMarketplaceUser = mutation({
  args: { targetUserId: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireSignedIn(ctx);
    if (args.targetUserId === identity.subject) {
      throw new Error('Cannot block yourself.');
    }
    const existing = await ctx.db
      .query('userBlocks')
      .withIndex('by_blocker', (q) =>
        q
          .eq('blockerUserId', identity.subject)
          .eq('blockedUserId', args.targetUserId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert('userBlocks', {
        blockerUserId: identity.subject,
        blockedUserId: args.targetUserId,
        createdAtMs: Date.now(),
      });
    }
    return { blocked: true };
  },
});

export const listDisputesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminCaller(ctx))) {
      return { disputes: [], reports: [] };
    }

    const allFeedback = await ctx.db
      .query('marketplaceTrustFeedback')
      .order('desc')
      .take(50);
    const disputes = allFeedback.filter(
      (f) =>
        f.visibilityStatus === 'dispute_pending' ||
        f.visibilityStatus === 'policy_removed' ||
        f.visibilityStatus === 'cleared_unfounded'
    );

    const reports = await ctx.db
      .query('marketplaceReports')
      .order('desc')
      .take(40);

    return { disputes, reports };
  },
});

export const adminResolveTrustDispute = mutation({
  args: {
    feedbackId: v.id('marketplaceTrustFeedback'),
    decision: v.union(
      v.literal('keep_published'),
      v.literal('cleared_unfounded'),
      v.literal('policy_removed')
    ),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx);
    const fb = await ctx.db.get(args.feedbackId);
    if (!fb) {
      throw new Error('Disputed feedback record not found.');
    }

    const now = Date.now();
    if (args.decision === 'keep_published') {
      await ctx.db.patch(fb._id, {
        visibilityStatus: 'published',
        hiddenFromPublication: false,
        reDisputeLocked: true,
        resolvedByAdminId: identity.subject,
        resolvedAtMs: now,
      });
    } else if (args.decision === 'cleared_unfounded') {
      await ctx.db.patch(fb._id, {
        visibilityStatus: 'cleared_unfounded',
        hiddenFromPublication: true,
        reDisputeLocked: true,
        resolvedByAdminId: identity.subject,
        resolvedAtMs: now,
      });
    } else {
      await ctx.db.patch(fb._id, {
        visibilityStatus: 'policy_removed',
        hiddenFromPublication: true,
        reDisputeLocked: true,
        resolvedByAdminId: identity.subject,
        resolvedAtMs: now,
      });
    }

    if (fb.recipientUserId) {
      await syncRecipientBadgeCount(ctx, fb.recipientUserId);
    }
    return { resolved: true, decision: args.decision };
  },
});

export const adminModerateContent = mutation({
  args: {
    reportId: v.id('marketplaceReports'),
    action: v.union(v.literal('hide_target'), v.literal('dismiss')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error('Report not found.');
    }

    if (args.action === 'dismiss') {
      await ctx.db.patch(report._id, { status: 'dismissed' });
      return { actioned: false, status: 'dismissed' };
    }

    if (report.targetType === 'listing') {
      const target = await ctx.db.get(
        report.targetId as Id<'marketplaceListings'>
      );
      if (target) {
        await ctx.db.patch(target._id, { moderationStatus: 'hidden_by_admin' });
        await refreshPulseBucket(
          ctx,
          target.variety,
          target.form,
          target.currency
        );
      }
    } else if (report.targetType === 'wholesaler_profile') {
      const target = await ctx.db.get(
        report.targetId as Id<'wholesalerProfiles'>
      );
      if (target) {
        await ctx.db.patch(target._id, { moderationStatus: 'hidden_by_admin' });
      }
    } else if (report.targetType === 'buy_request') {
      const target = await ctx.db.get(
        report.targetId as Id<'wholesalerBuyRequests'>
      );
      if (target) {
        await ctx.db.patch(target._id, { moderationStatus: 'hidden_by_admin' });
        await refreshPulseBucket(
          ctx,
          target.variety,
          target.form,
          target.currency
        );
      }
    } else if (report.targetType === 'group_message') {
      const target = await ctx.db.get(report.targetId as Id<'messages'>);
      if (target) {
        await ctx.db.patch(target._id, { moderationStatus: 'hidden_by_admin' });
      }
    }

    await ctx.db.patch(report._id, { status: 'actioned' });
    return { actioned: true, status: 'actioned' };
  },
});
