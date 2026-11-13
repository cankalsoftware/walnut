import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Generates a short-lived Convex upload URL so the Web Admin Portal
 * can upload product images directly as Convex Storage Blobs.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Lists all orchard shop products and resolves their Convex Blob image URLs.
 */
export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('shopProducts').collect();
    return await Promise.all(
      products.map(async (product) => {
        const resolvedUrl = product.imageStorageId
          ? await ctx.storage.getUrl(product.imageStorageId)
          : product.imageUrl ?? null;
        return {
          ...product,
          imageUrl: resolvedUrl,
        };
      })
    );
  },
});

/**
 * Creates or updates a sensor/switch/kit in `shopProducts` with an optional Convex Blob `imageStorageId`.
 */
export const upsertProduct = mutation({
  args: {
    sku: v.string(),
    name: v.string(),
    category: v.union(v.literal('sensor'), v.literal('switch'), v.literal('kit')),
    priceUsd: v.number(),
    description: v.string(),
    inStock: v.boolean(),
    featured: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('shopProducts')
      .withIndex('by_sku', (q) => q.eq('sku', args.sku))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        category: args.category,
        priceUsd: args.priceUsd,
        description: args.description,
        inStock: args.inStock,
        featured: args.featured ?? existing.featured,
        imageStorageId: args.imageStorageId ?? existing.imageStorageId,
        updatedAtMs: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('shopProducts', {
      sku: args.sku,
      name: args.name,
      category: args.category,
      priceUsd: args.priceUsd,
      description: args.description,
      imageStorageId: args.imageStorageId,
      inStock: args.inStock,
      featured: args.featured ?? false,
      updatedAtMs: now,
    });
  },
});

/**
 * Attaches or replaces a Convex Blob image on an existing product.
 */
export const updateProductImage = mutation({
  args: {
    id: v.id('shopProducts'),
    imageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      imageStorageId: args.imageStorageId,
      updatedAtMs: Date.now(),
    });
  },
});

export const toggleStock = mutation({
  args: { id: v.id('shopProducts') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, {
      inStock: !existing.inStock,
      updatedAtMs: Date.now(),
    });
  },
});

export const updatePrice = mutation({
  args: { id: v.id('shopProducts'), priceUsd: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      priceUsd: Math.max(1, args.priceUsd),
      updatedAtMs: Date.now(),
    });
  },
});

