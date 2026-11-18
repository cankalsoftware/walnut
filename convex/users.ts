import { action, mutation, query } from './_generated/server';
import { anyApi } from 'convex/server';
import { v } from 'convex/values';
import {
  ADMIN_EMAIL,
  hashStringSha256,
  isAdminCaller,
  normalizeE164Phone,
  requireCompletedOnboarding,
  requireSignedIn,
} from './lib/auth';

declare const process: { env: Record<string, string | undefined> };

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function sanitizeEmail(raw?: string | null): string | undefined {
  const cleaned = (raw ?? '').trim().toLowerCase();
  if (!cleaned || cleaned.endsWith('@phone.walnutiq.app')) {
    return undefined;
  }
  return cleaned;
}

/**
 * Upserts the authenticated Clerk user into Convex `users` using verified
 * server-side JWT identity (`ctx.auth.getUserIdentity()`).
 * Preserves backward compatibility with Web Admin (`ConvexSyncAdminRole`) and mobile OAuth.
 */
export const syncCurrentUser = mutation({
  args: {
    displayName: v.string(),
    authProvider: v.union(
      v.literal('google'),
      v.literal('email'),
      v.literal('phone')
    ),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    accountType: v.optional(
      v.union(v.literal('producer'), v.literal('wholesaler'))
    ),
    enableOrchardTools: v.optional(v.boolean()),
    recoveryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: valid Clerk session required');
    }

    const clerkId = identity.subject;
    const normalizedEmail = sanitizeEmail(args.email ?? identity.email);
    const isEmailVerified = identity.emailVerified !== false;
    const normalizedPhone = args.phone
      ? normalizeE164Phone(args.phone)
      : undefined;
    const assignedRole: 'admin' | 'grower' =
      normalizedEmail === ADMIN_EMAIL && isEmailVerified ? 'admin' : 'grower';

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .first();

    if (normalizedPhone) {
      const phoneOwner = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', normalizedPhone))
        .first();
      if (phoneOwner && phoneOwner.clerkId !== clerkId) {
        throw new Error(
          'This mobile number is already registered to another WalnutIQ account.'
        );
      }
    }

    const recoveryCodeHash = args.recoveryCode
      ? await hashStringSha256(args.recoveryCode.trim().toUpperCase())
      : undefined;

    if (existing) {
      const nextPhone = normalizedPhone ?? existing.phone;
      // Write-once accountType: once assigned, never allow self-service switching
      const nextAccountType = existing.accountType ?? args.accountType;
      const nextRole =
        existing.role === 'admin' || assignedRole === 'admin'
          ? 'admin'
          : 'grower';

      await ctx.db.patch(existing._id, {
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(args.displayName.trim()
          ? { displayName: args.displayName.trim() }
          : {}),
        role: nextRole,
        authProvider: args.authProvider,
        ...(nextPhone ? { phone: nextPhone } : {}),
        ...(nextAccountType ? { accountType: nextAccountType } : {}),
        ...(args.enableOrchardTools !== undefined
          ? { enableOrchardTools: args.enableOrchardTools }
          : {}),
        ...(recoveryCodeHash ? { recoveryCodeHash } : {}),
        ...(nextPhone && nextAccountType
          ? { marketplaceOnboardingComplete: true }
          : {}),
      });
      return {
        id: existing._id,
        role: nextRole,
        accountType: nextAccountType ?? null,
      };
    }

    const id = await ctx.db.insert('users', {
      clerkId,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      displayName: args.displayName.trim() || 'Walnut Grower',
      role: assignedRole,
      authProvider: args.authProvider,
      ...(normalizedPhone
        ? { phone: normalizedPhone, phoneVerified: false }
        : {}),
      ...(args.accountType ? { accountType: args.accountType } : {}),
      ...(args.enableOrchardTools !== undefined
        ? { enableOrchardTools: args.enableOrchardTools }
        : {}),
      ...(recoveryCodeHash ? { recoveryCodeHash } : {}),
      marketplaceOnboardingComplete: Boolean(normalizedPhone && args.accountType),
      accountStatus: 'active',
      createdAtMs: Date.now(),
    });
    return {
      id,
      role: assignedRole,
      accountType: args.accountType ?? null,
    };
  },
});

export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        role: 'grower' as const,
        isAdmin: false,
        accountType: null as 'producer' | 'wholesaler' | null,
        phone: null as string | null,
        whatsapp: null as string | null,
        email: null as string | null,
        displayName: null as string | null,
        enableOrchardTools: false,
        marketplaceOnboardingComplete: false,
        trustedSellerCount: 0,
        trustedBuyerCount: 0,
        isWholesalerProfileComplete: false,
      };
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    const normalizedEmail = sanitizeEmail(identity.email ?? existing?.email);
    const isAdmin =
      (normalizedEmail === ADMIN_EMAIL && identity.emailVerified !== false) ||
      existing?.role === 'admin';

    const wholesalerProfile = existing
      ? await ctx.db
          .query('wholesalerProfiles')
          .withIndex('by_user', (q) => q.eq('userId', identity.subject))
          .first()
      : null;

    return {
      role: isAdmin ? ('admin' as const) : ('grower' as const),
      isAdmin,
      accountType:
        existing?.accountType ??
        (existing?.role === 'grower' ? ('producer' as const) : null),
      phone: existing?.phone ?? null,
      whatsapp: existing?.whatsapp ?? null,
      email: existing?.email ?? normalizedEmail ?? null,
      displayName: existing?.displayName ?? null,
      enableOrchardTools: existing?.enableOrchardTools ?? false,
      marketplaceOnboardingComplete: Boolean(
        existing?.marketplaceOnboardingComplete ||
          (existing?.phone && existing?.accountType)
      ),
      trustedSellerCount: existing?.trustedSellerCount ?? 0,
      trustedBuyerCount: existing?.trustedBuyerCount ?? 0,
      isWholesalerProfileComplete: Boolean(wholesalerProfile?.isProfileComplete),
    };
  },
});

/**
 * Completes compulsory mobile number & write-once Marketplace accountType onboarding.
 */
export const completeMarketplaceOnboarding = mutation({
  args: {
    displayName: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    accountType: v.union(v.literal('producer'), v.literal('wholesaler')),
    enableOrchardTools: v.optional(v.boolean()),
    recoveryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireSignedIn(ctx);
    const normalizedPhone = normalizeE164Phone(args.phone);
    const normalizedWhatsapp = args.whatsapp?.trim()
      ? normalizeE164Phone(args.whatsapp)
      : undefined;
    const normalizedEmail = sanitizeEmail(args.email ?? identity.email);
    const cleanName = args.displayName.trim();
    if (cleanName.length < 2) {
      throw new Error('Display name must be at least 2 characters.');
    }

    const phoneOwner = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', normalizedPhone))
      .first();
    if (phoneOwner && phoneOwner.clerkId !== identity.subject) {
      throw new Error(
        'This mobile number is already linked to another WalnutIQ account.'
      );
    }

    const recoveryCodeHash = args.recoveryCode
      ? await hashStringSha256(args.recoveryCode.trim().toUpperCase())
      : undefined;

    if (user) {
      if (user.accountType && user.accountType !== args.accountType) {
        throw new Error(
          `Account role is locked to ${user.accountType}. You can toggle Grower / Orchard Mode instead.`
        );
      }
      await ctx.db.patch(user._id, {
        displayName: cleanName,
        phone: normalizedPhone,
        phoneVerified: user.phoneVerified ?? false,
        ...(normalizedWhatsapp ? { whatsapp: normalizedWhatsapp } : {}),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        accountType: user.accountType ?? args.accountType,
        ...(args.enableOrchardTools !== undefined
          ? { enableOrchardTools: args.enableOrchardTools }
          : {}),
        ...(recoveryCodeHash ? { recoveryCodeHash } : {}),
        marketplaceOnboardingComplete: true,
      });
      return {
        updated: true,
        accountType: user.accountType ?? args.accountType,
        phone: normalizedPhone,
      };
    }

    const assignedRole: 'admin' | 'grower' =
      normalizedEmail === ADMIN_EMAIL && identity.emailVerified !== false
        ? 'admin'
        : 'grower';

    await ctx.db.insert('users', {
      clerkId: identity.subject,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      displayName: cleanName,
      role: assignedRole,
      authProvider: 'phone',
      accountType: args.accountType,
      phone: normalizedPhone,
      phoneVerified: false,
      ...(normalizedWhatsapp ? { whatsapp: normalizedWhatsapp } : {}),
      enableOrchardTools: args.enableOrchardTools ?? false,
      marketplaceOnboardingComplete: true,
      ...(recoveryCodeHash ? { recoveryCodeHash } : {}),
      accountStatus: 'active',
      createdAtMs: Date.now(),
    });

    return {
      updated: false,
      accountType: args.accountType,
      phone: normalizedPhone,
    };
  },
});

export const updateDualRolePreference = mutation({
  args: {
    enableOrchardTools: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCompletedOnboarding(ctx);
    await ctx.db.patch(user._id, {
      enableOrchardTools: args.enableOrchardTools,
    });
    return { enableOrchardTools: args.enableOrchardTools };
  },
});

export const updateGrowerCarePreferences = mutation({
  args: {
    experienceLevel: v.union(
      v.literal('beginner'),
      v.literal('experienced'),
      v.literal('expert')
    ),
    notificationTopics: v.array(v.string()),
    pushNotificationsEnabled: v.boolean(),
    region: v.optional(v.string()),
    orchardName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: valid Clerk session required');
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!existing) {
      const normalizedEmail = sanitizeEmail(identity.email);
      const id = await ctx.db.insert('users', {
        clerkId: identity.subject,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        displayName: identity.name ?? 'Walnut Grower',
        role:
          normalizedEmail === ADMIN_EMAIL && identity.emailVerified !== false
            ? 'admin'
            : 'grower',
        authProvider: 'email',
        region: args.region,
        orchardName: args.orchardName,
        experienceLevel: args.experienceLevel,
        notificationTopics: args.notificationTopics,
        pushNotificationsEnabled: args.pushNotificationsEnabled,
        accountStatus: 'active',
        createdAtMs: Date.now(),
      });
      return { id, updated: true };
    }

    await ctx.db.patch(existing._id, {
      experienceLevel: args.experienceLevel,
      notificationTopics: args.notificationTopics,
      pushNotificationsEnabled: args.pushNotificationsEnabled,
      ...(args.region !== undefined ? { region: args.region } : {}),
      ...(args.orchardName !== undefined
        ? { orchardName: args.orchardName }
        : {}),
    });
    return { id: existing._id, updated: true };
  },
});

export const listGrowersForAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminCaller(ctx))) {
      return [];
    }

    const allUsers = await ctx.db.query('users').collect();
    return allUsers.map((u) => ({
      clerkId: u.clerkId,
      displayName: u.displayName,
      email: u.email ?? '',
      phone: u.phone ?? '',
      accountType: u.accountType ?? 'producer',
      experienceLevel: u.experienceLevel ?? 'experienced',
      notificationTopics: u.notificationTopics ?? [
        'weather',
        'fertilizing',
        'blight_pest',
        'seminars_expo',
        'maintenance',
        'news',
      ],
      pushNotificationsEnabled: u.pushNotificationsEnabled ?? true,
      region: u.region ?? '',
    }));
  },
});

/**
 * Google Play Store & GDPR Art. 17 compliance:
 * - Hard-deletes single-owner tables (`trees`, `yoloScans`, `careLogs`, `tuyaSensorSnapshots`,
 *   `orchardOverrides`, `orchardFields` + `_storage` blobs, `shopOrders`, `marketplaceListings` +
 *   `_storage` blobs, `wholesalerProfiles`, `wholesalerBuyRequests`, `userBlocks`, `messages`, `users`).
 * - Tombstones 2-party `marketplaceThreads` / `marketplaceMessages` for surviving counterparty while
 *   scrubbing PII and `exact_gps_pin` coordinates and deleting sender attachments.
 * - Hard-deletes normal trust feedback; scrubs PII on `policy_removed` dispute rows with 90-day TTL.
 */
export const deleteMyAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: sign in required to delete account data');
    }
    const clerkId = identity.subject;
    const now = Date.now();
    let deletedCount = 0;

    const userTables = [
      'trees',
      'yoloScans',
      'careLogs',
      'tuyaSensorSnapshots',
      'orchardOverrides',
      'shopOrders',
      'wholesalerProfiles',
      'wholesalerBuyRequests',
    ] as const;

    for (const table of userTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_user', (q) => q.eq('userId', clerkId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deletedCount++;
      }
    }

    // Delete orchardFields & their evidence _storage blobs
    const fieldRows = await ctx.db
      .query('orchardFields')
      .withIndex('by_user', (q) => q.eq('userId', clerkId))
      .collect();
    for (const field of fieldRows) {
      for (const q of field.quadrants) {
        for (const sid of q.evidenceStorageIds ?? []) {
          try {
            await ctx.storage.delete(sid);
          } catch {
            // Blob already absent
          }
        }
      }
      await ctx.db.delete(field._id);
      deletedCount++;
    }

    // Delete marketplaceListings & their 5-slot _storage blobs
    const listingRows = await ctx.db
      .query('marketplaceListings')
      .withIndex('by_user', (q) => q.eq('userId', clerkId))
      .collect();
    for (const listing of listingRows) {
      for (const slot of listing.photoSlots) {
        try {
          await ctx.storage.delete(slot.storageId);
        } catch {
          // Blob already absent
        }
      }
      await ctx.db.delete(listing._id);
      deletedCount++;
    }

    // Delete userBlocks created by caller
    const blockRows = await ctx.db
      .query('userBlocks')
      .withIndex('by_blocker', (q) => q.eq('blockerUserId', clerkId))
      .collect();
    for (const row of blockRows) {
      await ctx.db.delete(row._id);
      deletedCount++;
    }

    // Delete group/community messages authored by caller
    const messageRows = await ctx.db
      .query('messages')
      .withIndex('by_sender', (q) => q.eq('senderClerkId', clerkId))
      .collect();
    for (const row of messageRows) {
      await ctx.db.delete(row._id);
      deletedCount++;
    }

    // Tombstone two-party B2B threads while scrubbing caller PII & exact_gps_pin
    const producerThreads = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_producer', (q) => q.eq('producerUserId', clerkId))
      .collect();
    const wholesalerThreads = await ctx.db
      .query('marketplaceThreads')
      .withIndex('by_wholesaler', (q) => q.eq('wholesalerUserId', clerkId))
      .collect();

    const affectedThreads = new Map<string, (typeof producerThreads)[number]>();
    for (const t of [...producerThreads, ...wholesalerThreads]) {
      affectedThreads.set(String(t._id), t);
    }

    for (const thread of affectedThreads.values()) {
      const nextProducer =
        thread.producerUserId === clerkId
          ? '[deleted-user]'
          : thread.producerUserId;
      const nextWholesaler =
        thread.wholesalerUserId === clerkId
          ? '[deleted-user]'
          : thread.wholesalerUserId;

      const threadMsgs = await ctx.db
        .query('marketplaceMessages')
        .withIndex('by_thread_created', (q) => q.eq('threadId', thread._id))
        .collect();

      if (
        nextProducer === '[deleted-user]' &&
        nextWholesaler === '[deleted-user]'
      ) {
        for (const msg of threadMsgs) {
          if (msg.attachmentStorageId) {
            try {
              await ctx.storage.delete(msg.attachmentStorageId);
            } catch {
              // Blob already absent
            }
          }
          await ctx.db.delete(msg._id);
          deletedCount++;
        }
        await ctx.db.delete(thread._id);
        deletedCount++;
      } else {
        for (const msg of threadMsgs) {
          if (msg.senderUserId === clerkId) {
            if (msg.attachmentStorageId) {
              try {
                await ctx.storage.delete(msg.attachmentStorageId);
              } catch {
                // Blob already absent
              }
            }
            await ctx.db.patch(msg._id, {
              senderUserId: '[deleted-user]',
              attachmentStorageId: undefined,
              scrubbedOnDeletion: true,
              ...(msg.messageType === 'exact_gps_pin'
                ? {
                    body: '[Location removed with deleted account]',
                    structuredPayload: undefined,
                  }
                : {}),
            });
          }
        }
        await ctx.db.patch(thread._id, {
          producerUserId: nextProducer,
          wholesalerUserId: nextWholesaler,
        });
      }
    }

    // Fetch caller phone before deleting user record for anonymized fraud-prevention hash
    const userRows = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .collect();
    const callerPhone = userRows[0]?.phone;
    const phoneHash = callerPhone
      ? await hashStringSha256(`walnutiq-trust:${callerPhone}`)
      : undefined;

    // Delete or anonymize trust feedback records
    const authoredFeedback = await ctx.db
      .query('marketplaceTrustFeedback')
      .withIndex('by_author_recipient_type', (q) =>
        q.eq('authorUserId', clerkId)
      )
      .collect();
    const receivedFeedback = await ctx.db
      .query('marketplaceTrustFeedback')
      .withIndex('by_recipient', (q) => q.eq('recipientUserId', clerkId))
      .collect();

    const feedbackMap = new Map<string, (typeof authoredFeedback)[number]>();
    for (const fb of [...authoredFeedback, ...receivedFeedback]) {
      feedbackMap.set(String(fb._id), fb);
    }

    for (const fb of feedbackMap.values()) {
      if (fb.visibilityStatus === 'policy_removed') {
        await ctx.db.patch(fb._id, {
          authorUserId:
            fb.authorUserId === clerkId ? undefined : fb.authorUserId,
          recipientUserId:
            fb.recipientUserId === clerkId ? undefined : fb.recipientUserId,
          comment: '[scrubbed]',
          disputeReason: undefined,
          anonymizedPhoneHash: fb.anonymizedPhoneHash ?? phoneHash,
          expiresAtMs: fb.expiresAtMs ?? now + NINETY_DAYS_MS,
        });
      } else {
        await ctx.db.delete(fb._id);
        deletedCount++;
      }
    }

    for (const row of userRows) {
      await ctx.db.delete(row._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Atomic Clerk + Convex deletion action:
 * If `CLERK_SECRET_KEY` is configured on Convex, deletes the Clerk user server-side
 * before erasing Convex data. Otherwise instructs client to complete Clerk deletion safely.
 */
export const deleteClerkAndConvexAccount = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ clerkDeletedServerSide: boolean; deletedCount: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: sign in required to delete account');
    }

    const clerkSecret = process.env.CLERK_SECRET_KEY?.trim();
    if (!clerkSecret) {
      return { clerkDeletedServerSide: false, deletedCount: 0 };
    }

    const resp = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${clerkSecret}`,
        },
      }
    );

    if (!resp.ok && resp.status !== 404) {
      throw new Error(`Clerk account deletion failed (${resp.status}).`);
    }

    const result = await ctx.runMutation(
      anyApi.users.deleteMyAccountData as any,
      {}
    );
    return {
      clerkDeletedServerSide: true,
      deletedCount: Number(result?.deletedCount ?? 0),
    };
  },
});
