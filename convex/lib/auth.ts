import { MutationCtx, QueryCtx } from '../_generated/server';
import { Doc } from '../_generated/dataModel';

export const ADMIN_EMAIL = 'pinarlik99@gmail.com';
const GRID_STEP_DEG = 0.04;

export type ConvexAuthCtx = QueryCtx | MutationCtx;

/**
 * Normalizes a phone input string to E.164 (`+<digits>`) and validates length (8–15 digits).
 */
export function normalizeE164Phone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(
      'Enter a valid mobile phone number with country code (8–15 digits).'
    );
  }
  return `+${digits}`;
}

/**
 * Deterministically snaps coordinates to a ~4 km public spatial grid centroid
 * to support buyer distance sorting without exposing exact orchard locations.
 */
export function snapApproxCoords(
  lat?: number,
  lng?: number
): { approxLat?: number; approxLng?: number } {
  if (
    lat === undefined ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return {};
  }
  const snap = (val: number) =>
    Number((Math.round(val / GRID_STEP_DEG) * GRID_STEP_DEG).toFixed(4));
  return {
    approxLat: snap(lat),
    approxLng: snap(lng),
  };
}

/**
 * Computes a lowercase hex SHA-256 digest using Web Crypto (available in Convex runtime).
 */
export async function hashStringSha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies Clerk JWT identity and ensures the caller's account is not banned.
 */
export async function requireSignedIn(ctx: ConvexAuthCtx): Promise<{
  identity: NonNullable<Awaited<ReturnType<ConvexAuthCtx['auth']['getUserIdentity']>>>;
  user: Doc<'users'> | null;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Unauthorized: Clerk authentication required');
  }
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

  if (user?.accountStatus === 'banned') {
    throw new Error('Forbidden: this account has been suspended by moderation.');
  }
  return { identity, user };
}

/**
 * Non-throwing admin verification for read queries that return `[]` to non-admins.
 */
export async function isAdminCaller(ctx: ConvexAuthCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

  if (user?.role === 'admin') {
    return true;
  }
  const normalizedEmail = (identity.email ?? '').trim().toLowerCase();
  const isEmailVerified = identity.emailVerified !== false;
  return normalizedEmail === ADMIN_EMAIL && isEmailVerified;
}

/**
 * Strictly enforces administrator privileges on server queries and mutations.
 */
export async function requireAdmin(ctx: ConvexAuthCtx) {
  const { identity, user } = await requireSignedIn(ctx);
  const normalizedEmail = (identity.email ?? '').trim().toLowerCase();
  const isEmailVerified = identity.emailVerified !== false;

  if (
    !(
      (normalizedEmail === ADMIN_EMAIL && isEmailVerified) ||
      user?.role === 'admin'
    )
  ) {
    throw new Error('Forbidden: administrator permissions required');
  }
  return { identity, user };
}

/**
 * Ensures the caller has completed Marketplace onboarding (compulsory phone + accountType).
 */
export async function requireCompletedOnboarding(ctx: ConvexAuthCtx): Promise<{
  identity: NonNullable<Awaited<ReturnType<ConvexAuthCtx['auth']['getUserIdentity']>>>;
  user: Doc<'users'>;
}> {
  const { identity, user } = await requireSignedIn(ctx);
  if (!user || !user.phone || !user.accountType) {
    throw new Error(
      'Complete your mobile number and Producer/Wholesaler role setup in Account first.'
    );
  }
  if (user.accountStatus === 'suspended') {
    throw new Error('Account temporarily suspended by moderation.');
  }
  return { identity, user };
}

/**
 * Ensures a Wholesaler caller has completed their public buyer profile before contacting sellers.
 */
export async function requireCompletedWholesalerProfile(ctx: ConvexAuthCtx) {
  const { identity, user } = await requireCompletedOnboarding(ctx);
  const profile = await ctx.db
    .query('wholesalerProfiles')
    .withIndex('by_user', (q) => q.eq('userId', identity.subject))
    .first();

  if (!profile || !profile.isProfileComplete) {
    throw new Error(
      'Complete your Wholesaler Buyer Profile (company, phone, region, bio, and how you work) before contacting producers.'
    );
  }
  return { identity, user, profile };
}
