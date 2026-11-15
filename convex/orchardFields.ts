import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const quadrantValidator = v.object({
  quadrantId: v.string(),
  allocatedTrees: v.optional(v.number()),
  sampledTreeLabel: v.string(),
  scannedNutsPerTree: v.number(),
  estimatedWeightKgPerTree: v.number(),
  note: v.string(),
  evidenceStorageIds: v.optional(v.array(v.id('_storage'))),
  updatedAtMs: v.number(),
});

export const listMyOrchardFields = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query('orchardFields')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();
  },
});

export const upsertOrchardField = mutation({
  args: {
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
    quadrants: v.array(quadrantValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: Clerk authentication required');
    }

    const existing = await ctx.db
      .query('orchardFields')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', identity.subject).eq('localFieldId', args.localFieldId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAtMs: now,
      });
      return { id: existing._id, updated: true };
    }

    const id = await ctx.db.insert('orchardFields', {
      userId: identity.subject,
      ...args,
      updatedAtMs: now,
    });
    return { id, updated: false };
  },
});

export const generateEvidenceUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: Clerk authentication required');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachQuadrantEvidence = mutation({
  args: {
    localFieldId: v.string(),
    quadrantId: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: Clerk authentication required');
    }

    const existing = await ctx.db
      .query('orchardFields')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', identity.subject).eq('localFieldId', args.localFieldId)
      )
      .first();

    if (!existing) {
      throw new Error('Field record not found');
    }

    const nextQuadrants = existing.quadrants.map((q) =>
      q.quadrantId === args.quadrantId
        ? {
            ...q,
            evidenceStorageIds: [...(q.evidenceStorageIds ?? []), args.storageId],
            updatedAtMs: Date.now(),
          }
        : q
    );

    await ctx.db.patch(existing._id, {
      quadrants: nextQuadrants,
      updatedAtMs: Date.now(),
    });

    return { attached: true, storageId: args.storageId };
  },
});
