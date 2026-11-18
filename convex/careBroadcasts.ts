import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { isAdminCaller, requireAdmin } from './lib/auth';

const EXPERT_CARE_PRESETS = [
  {
    slug: 'spring-blight-copper-window',
    title: 'Spring Blight & Copper Spray Window',
    season: 'spring' as const,
    category: 'blight_pest',
    targetLevel: 'all' as const,
    summary:
      'Protect emerging catkins and young nutlets from Xanthomonas walnut blight during spring rains (54°F–63°F).',
    actionChecklist: [
      'Apply protective copper spray at 10%–20% bud break.',
      'Re-apply every 7–10 days if spring rain persists.',
      'Hang codling moth pheromone traps in the SE canopy quadrant at biofix.',
    ],
    defaultNotificationTitle: 'Blight Alert: Spring Copper Spray Window Open',
    defaultNotificationBody:
      'Bud break + spring moisture favor walnut blight. Apply protective copper coverage and check codling moth traps.',
  },
  {
    slug: 'spring-summer-nitrogen-feeding',
    title: 'Fertilizing Season: Split Nitrogen & Leaf Sampling',
    season: 'spring' as const,
    category: 'fertilizing',
    targetLevel: 'all' as const,
    summary:
      'Support rapid leaf-out and nut sizing with split nitrogen applications, guided by mid-summer leaf tissue targets (2.2%–2.5% N).',
    actionChecklist: [
      'Split nitrogen doses across spring through early summer to prevent leaching.',
      'Check zinc and boron levels if shoot growth or leaf size looks weak.',
      'Stop nitrogen applications before late summer/early fall.',
    ],
    defaultNotificationTitle: 'Fertilizing Season Reminder: Split Nitrogen Window',
    defaultNotificationBody:
      'Time for scheduled spring/early-summer nitrogen feeding. Split applications to maximize uptake and avoid root leaching.',
  },
  {
    slug: 'summer-swp-irrigation',
    title: 'Summer Heat & Stem Water Potential Irrigation',
    season: 'summer' as const,
    category: 'irrigation',
    targetLevel: 'experienced' as const,
    summary:
      'Balance peak summer ET demand (June–August) using midday stem water potential (2–3 bars below baseline) and weed-free strips.',
    actionChecklist: [
      'Avoid over-watering in heavy spring soils so roots stay oxygenated.',
      'Track soil moisture or pressure-chamber SWP during peak summer heat.',
      'Keep under-canopy strips weed-free to prevent water/nutrient competition.',
    ],
    defaultNotificationTitle: 'Summer Irrigation Check: Heat & Soil Moisture',
    defaultNotificationBody:
      'Peak ET demand is here. Verify root-zone moisture (target ~65%) and avoid water stress during nut sizing.',
  },
  {
    slug: 'fall-hull-split-harvest-drying',
    title: 'Hull Split, Harvest Timing & Rapid 8–10% Drying',
    season: 'fall' as const,
    category: 'harvest',
    targetLevel: 'all' as const,
    summary:
      'Protect kernel pellicle color and prevent mold by monitoring Packing Tissue Brown (PTB), shaking at hull split, and drying promptly.',
    actionChecklist: [
      'Inspect Packing Tissue Brown (PTB) maturity before shaking.',
      'Avoid cutting off irrigation too early (causes shriveled kernels) or over-watering late.',
      'Pick up, hull, and dry nuts down to 8%–10% internal moisture immediately.',
    ],
    defaultNotificationTitle: 'Harvest Readiness: Hull Split & Rapid Drying',
    defaultNotificationBody:
      'Check Packing Tissue Brown and hull split %. Shake, pick up, and dry to 8%–10% moisture quickly to protect kernel color.',
  },
  {
    slug: 'post-harvest-dry-pruning-sanitation',
    title: 'Post-Harvest Sanitation & Dry-Weather Pruning',
    season: 'winter' as const,
    category: 'pruning',
    targetLevel: 'beginner' as const,
    summary:
      'Remove deadwood and Botryosphaeria-blighted branches while leaves help identify dead limbs, and prune during dry weather forecasts.',
    actionChecklist: [
      'Cut out blighted/dead branches while remaining leaves show contrast.',
      'Thin overcrowded interior branches so sunlight reaches fruiting spurs.',
      'Prune only during dry weather so spores do not enter fresh cuts.',
    ],
    defaultNotificationTitle: 'Pruning & Sanitation: Pick a Dry Weather Window',
    defaultNotificationBody:
      'Remove dead or blighted wood during dry weather to protect pruning wounds and open the canopy for next season.',
  },
  {
    slug: 'winter-dormant-oil-freeze-prep',
    title: 'Winter Hardening Off, Chill Hours & Dormant Oil',
    season: 'winter' as const,
    category: 'maintenance',
    targetLevel: 'expert' as const,
    summary:
      'Ensure adequate baseline soil moisture before hard freezes, track winter chill accumulation, and time dormant oils safely.',
    actionChecklist: [
      'Let young trees harden off before frost, then maintain baseline winter soil moisture.',
      'Track winter chill hours toward your orchard target (e.g. 800 hrs).',
      'Apply dormant oil at bud-swell only when soils are not overly dry.',
    ],
    defaultNotificationTitle: 'Winter Care: Freeze Moisture & Dormant Prep',
    defaultNotificationBody:
      'Ensure baseline soil moisture before hard freezes and review winter chill hour progress in WalnutIQ Analytics.',
  },
];

export const getCareDefaults = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query('careDefaults')
      .withIndex('by_key', (q) => q.eq('key', 'global_walnut_defaults'))
      .first();
    return doc ?? null;
  },
});

export const publishCareDefaults = mutation({
  args: {
    irrigationIntervalDays: v.number(),
    targetSoilMoisturePct: v.number(),
    chillHoursTarget: v.number(),
    nitrogenCutoffMonthDay: v.string(),
    harvestHullSplitPct: v.number(),
    dailyGuidanceNote: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query('careDefaults')
      .withIndex('by_key', (q) => q.eq('key', 'global_walnut_defaults'))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        irrigationIntervalDays: args.irrigationIntervalDays,
        targetSoilMoisturePct: args.targetSoilMoisturePct,
        chillHoursTarget: args.chillHoursTarget,
        nitrogenCutoffMonthDay: args.nitrogenCutoffMonthDay,
        harvestHullSplitPct: args.harvestHullSplitPct,
        dailyGuidanceNote: args.dailyGuidanceNote,
        updatedByAdminAtMs: now,
      });
    } else {
      await ctx.db.insert('careDefaults', {
        key: 'global_walnut_defaults',
        irrigationIntervalDays: args.irrigationIntervalDays,
        targetSoilMoisturePct: args.targetSoilMoisturePct,
        chillHoursTarget: args.chillHoursTarget,
        nitrogenCutoffMonthDay: args.nitrogenCutoffMonthDay,
        harvestHullSplitPct: args.harvestHullSplitPct,
        dailyGuidanceNote: args.dailyGuidanceNote,
        updatedByAdminAtMs: now,
      });
    }

    const note = args.dailyGuidanceNote.trim();
    if (note) {
      await ctx.db.insert('careNotifications', {
        title: 'Daily Orchard Guidance Banner',
        body: note,
        category: 'maintenance',
        targetAudience: 'all',
        status: 'sent',
        sentAtMs: now,
        createdAtMs: now,
      });
    }

    return { published: true, pushedBannerNotification: Boolean(note) };
  },
});

export const listCareCards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const cards = await ctx.db.query('careCards').collect();
    return cards.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  },
});

export const seedExpertCareCards = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    let inserted = 0;

    for (const preset of EXPERT_CARE_PRESETS) {
      const existing = await ctx.db
        .query('careCards')
        .withIndex('by_slug', (q) => q.eq('slug', preset.slug))
        .first();
      if (!existing) {
        await ctx.db.insert('careCards', {
          ...preset,
          createdAtMs: now,
          updatedAtMs: now,
        });
        inserted += 1;
      }
    }
    return { inserted, totalPresets: EXPERT_CARE_PRESETS.length };
  },
});

export const upsertCareCard = mutation({
  args: {
    id: v.optional(v.id('careCards')),
    slug: v.string(),
    title: v.string(),
    season: v.union(
      v.literal('spring'),
      v.literal('summer'),
      v.literal('fall'),
      v.literal('winter'),
      v.literal('all')
    ),
    category: v.string(),
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();

    if (args.id) {
      await ctx.db.patch(args.id, {
        slug: args.slug,
        title: args.title,
        season: args.season,
        category: args.category,
        targetLevel: args.targetLevel,
        summary: args.summary,
        actionChecklist: args.actionChecklist,
        defaultNotificationTitle: args.defaultNotificationTitle,
        defaultNotificationBody: args.defaultNotificationBody,
        updatedAtMs: now,
      });
      return { id: args.id, updated: true };
    }

    const id = await ctx.db.insert('careCards', {
      slug: args.slug,
      title: args.title,
      season: args.season,
      category: args.category,
      targetLevel: args.targetLevel,
      summary: args.summary,
      actionChecklist: args.actionChecklist,
      defaultNotificationTitle: args.defaultNotificationTitle,
      defaultNotificationBody: args.defaultNotificationBody,
      createdAtMs: now,
      updatedAtMs: now,
    });
    return { id, updated: false };
  },
});

export const deleteCareCard = mutation({
  args: { id: v.id('careCards') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});

export const sendOrScheduleNotification = mutation({
  args: {
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
    scheduledForMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const isScheduled =
      typeof args.scheduledForMs === 'number' && args.scheduledForMs > now;

    const id = await ctx.db.insert('careNotifications', {
      title: args.title.trim(),
      body: args.body.trim(),
      category: args.category,
      targetAudience: args.targetAudience,
      targetLevel:
        args.targetAudience === 'level' ? args.targetLevel : undefined,
      targetUserIds:
        args.targetAudience === 'selected_users'
          ? args.targetUserIds ?? []
          : undefined,
      status: isScheduled ? 'scheduled' : 'sent',
      scheduledForMs: isScheduled ? args.scheduledForMs : undefined,
      sentAtMs: isScheduled ? undefined : now,
      createdAtMs: now,
    });

    return {
      id,
      status: isScheduled ? ('scheduled' as const) : ('sent' as const),
    };
  },
});

export const cancelScheduledNotification = mutation({
  args: { id: v.id('careNotifications') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: 'cancelled' });
    return { cancelled: true };
  },
});

export const listNotificationsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminCaller(ctx))) {
      return [];
    }
    const items = await ctx.db
      .query('careNotifications')
      .withIndex('by_created')
      .order('desc')
      .take(40);
    return items;
  },
});

export const listMyCareFeed = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const now = Date.now();
    let userLevel: 'beginner' | 'experienced' | 'expert' = 'experienced';
    let userTopics: string[] | null = null;
    let pushEnabled = true;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .first();
      if (user) {
        userLevel = user.experienceLevel ?? 'experienced';
        userTopics = user.notificationTopics ?? null;
        pushEnabled = user.pushNotificationsEnabled ?? true;
      }
    }

    if (!pushEnabled) {
      return [];
    }

    const recent = await ctx.db
      .query('careNotifications')
      .withIndex('by_created')
      .order('desc')
      .take(40);

    return recent.filter((item) => {
      if (item.status === 'cancelled') return false;
      if (
        item.status === 'scheduled' &&
        (item.scheduledForMs ?? Number.MAX_SAFE_INTEGER) > now
      ) {
        return false;
      }
      if (
        item.targetAudience === 'level' &&
        item.targetLevel &&
        item.targetLevel !== userLevel
      ) {
        return false;
      }
      if (
        item.targetAudience === 'selected_users' &&
        (!identity || !(item.targetUserIds ?? []).includes(identity.subject))
      ) {
        return false;
      }
      if (userTopics && !userTopics.includes(item.category)) {
        return false;
      }
      return true;
    });
  },
});
