import { mutation, MutationCtx, query } from './_generated/server';
import { v } from 'convex/values';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_EMAIL = 'pinarlik99@gmail.com';

async function requireAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Unauthorized: admin sign-in required');
  }
  const email = (identity.email ?? '').trim().toLowerCase();
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();
  if (email !== ADMIN_EMAIL && user?.role !== 'admin') {
    throw new Error('Forbidden: administrator permissions required');
  }
  return identity;
}

/**
 * Saves a categorized pipeline job log (scrape | clip | labeling | import | training)
 * with a 30-day retention window and purges any expired logs.
 */
export const savePipelineLog = mutation({
  args: {
    category: v.string(),
    jobName: v.string(),
    status: v.string(),
    target: v.optional(v.string()),
    engines: v.optional(v.array(v.string())),
    logs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const expired = await ctx.db
      .query('pipelineLogs')
      .withIndex('by_expires', (q) => q.lt('expiresAtMs', now))
      .collect();
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }

    const id = await ctx.db.insert('pipelineLogs', {
      category: args.category,
      jobName: args.jobName,
      status: args.status,
      target: args.target,
      engines: args.engines,
      logs: args.logs.slice(-2000),
      createdAtMs: now,
      expiresAtMs: now + THIRTY_DAYS_MS,
    });

    return { id, purgedCount: expired.length };
  },
});

export const purgeExpiredLogs = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const expired = await ctx.db
      .query('pipelineLogs')
      .withIndex('by_expires', (q) => q.lt('expiresAtMs', now))
      .collect();
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }
    return { purgedCount: expired.length };
  },
});

export const listPipelineLogs = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = args.category
      ? await ctx.db
          .query('pipelineLogs')
          .withIndex('by_category', (q) => q.eq('category', args.category!))
          .order('desc')
          .take(25)
      : await ctx.db.query('pipelineLogs').order('desc').take(25);
    return rows.filter((r) => r.expiresAtMs >= now);
  },
});
