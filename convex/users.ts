import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const ADMIN_EMAIL = 'pinarlik99@gmail.com';

/**
 * Upserts the authenticated Clerk user into Convex `users` using verified
 * server-side JWT identity (`ctx.auth.getUserIdentity()`).
 * Assigns `admin` role only when the verified token email matches `ADMIN_EMAIL`.
 */
export const syncCurrentUser = mutation({
  args: {
    displayName: v.string(),
    authProvider: v.union(v.literal('google'), v.literal('email')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: valid Clerk session required');
    }

    const clerkId = identity.subject;
    const normalizedEmail = (identity.email ?? '').trim().toLowerCase();
    const assignedRole: 'admin' | 'grower' =
      normalizedEmail === ADMIN_EMAIL ? 'admin' : 'grower';

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: normalizedEmail || existing.email,
        displayName: args.displayName,
        role: assignedRole,
        authProvider: args.authProvider,
      });
      return { id: existing._id, role: assignedRole };
    }

    const id = await ctx.db.insert('users', {
      clerkId,
      email: normalizedEmail,
      displayName: args.displayName,
      role: assignedRole,
      authProvider: args.authProvider,
      createdAtMs: Date.now(),
    });
    return { id, role: assignedRole };
  },
});

export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { role: 'grower' as const, isAdmin: false };
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    const normalizedEmail = (identity.email ?? existing?.email ?? '')
      .trim()
      .toLowerCase();
    const isAdmin =
      normalizedEmail === ADMIN_EMAIL || existing?.role === 'admin';
    return {
      role: isAdmin ? ('admin' as const) : ('grower' as const),
      isAdmin,
    };
  },
});

/**
 * Google Play Store & GDPR compliance: deletes all Convex data owned by the
 * authenticated user (`identity.subject`), including community messages.
 */
export const deleteMyAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: sign in required to delete account data');
    }
    const clerkId = identity.subject;

    const userTables = [
      'trees',
      'yoloScans',
      'careLogs',
      'tuyaSensorSnapshots',
      'orchardOverrides',
      'shopOrders',
    ] as const;

    let deletedCount = 0;

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

    const messageRows = await ctx.db
      .query('messages')
      .withIndex('by_sender', (q) => q.eq('senderClerkId', clerkId))
      .collect();
    for (const row of messageRows) {
      await ctx.db.delete(row._id);
      deletedCount++;
    }

    const userRows = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .collect();
    for (const row of userRows) {
      await ctx.db.delete(row._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});
