# Stage 7 Hostile Design Critic Report: `docs/phase-fix.md`

**Target Document**: `c:\Users\uyko7\Documents\VSCode\walnut\docs\phase-fix.md` (lines 1–54)  
**Verdict**: **REJECT / BLOCKERS PRESENT** — Several core security, data-integrity, and compliance claims in `phase-fix.md` are contradicted by the actual implementation.

---

### 1. [Blocker] Complete Server-Side Auth & Role Bypass in Convex (`convex/users.ts`, `convex/shop.ts`)
* **Affected Scope**: `convex/users.ts:10-112`, `convex/shop.ts:8-120`, `web-app/src/App.tsx:776-778,867-937` vs `docs/phase-fix.md:28,38-42`.
* **Finding**:
  * **No `ctx.auth.getUserIdentity()` checks**: None of the Convex mutations or queries validate the caller's Clerk JWT identity.
  * **Arbitrary Account Deletion (IDOR)**: `users.deleteMyAccountData` (`convex/users.ts:76-112`) accepts `clerkId: v.string()` directly from the client and deletes all rows across 7 tables for that `clerkId` without verifying `identity.subject === args.clerkId`. Any client can wipe any other user's orchard data.
  * **Trivial Admin Role Escalation**: `users.syncCurrentUser` (`convex/users.ts:10-47`) trusts client-supplied `email` and `clerkId`, allowing any caller to pass `email: "pinarlik99@gmail.com"` and obtain `role: 'admin'`.
  * **Unprotected Admin Shop Mutations**: `shop.generateUploadUrl`, `shop.upsertProduct`, `shop.updateProductImage`, `shop.toggleStock`, and `shop.updatePrice` (`convex/shop.ts:8-120`) perform zero auth or `role === 'admin'` checks—any grower or unauthenticated client can alter prices or inventory.
  * **Client-Only Web Gate**: `AdminRoleGate` (`web-app/src/App.tsx:867-937`) is purely UI-side, and when `!hasClerk` (`web-app/src/App.tsx:776-778`), `renderAdminWorkspace()` renders with no authentication at all.
* **Recommendation**:
  1. Require `const identity = await ctx.auth.getUserIdentity(); if (!identity) throw new Error('Unauthorized');` in all Convex mutations/queries.
  2. Derive `clerkId` and `email` exclusively from `identity.subject` and `identity.email` on the server (never from client args).
  3. Add a `requireAdmin(ctx)` helper checking verified `identity.email === 'pinarlik99@gmail.com'` / `role === 'admin'` on all admin mutations (`convex/shop.ts`, future `careDefaults` mutations).
  4. Remove the unauthenticated `!hasClerk` fallback in `web-app/src/App.tsx:776-778` in production builds.

---

### 2. [Blocker] `syncPendingToConvex` Is a Local No-Op — Guaranteed 14-Day Data Loss
* **Affected Scope**: `src/providers/ConvexClerkProvider.tsx:330-371,384-405`, `convex/sync.ts:1-38` vs `docs/phase-fix.md:30-37`.
* **Finding**:
  * `phase-fix.md` states `syncMode: 'auto'` *"automatically pushes `PENDING_UPLOAD` SQLite records to Convex when signed in"* and starts the 14-day retention timer.
  * In reality, `syncPendingToConvex` (`src/providers/ConvexClerkProvider.tsx:330-371`) **never calls any Convex mutation**. It only calls `buildSyncAcknowledgments(...)` (`convex/sync.ts:28-37`), a pure local helper that returns `{ localRecordId, syncStatus: 'SYNCED', syncedAtMs }` in memory.
  * Likewise, `addOfflineFieldRecord` (`src/providers/ConvexClerkProvider.tsx:395-396`) sets `syncStatus: isSignedIn ? 'SYNCED' : 'PENDING_UPLOAD'` immediately without uploading anything to Convex.
  * Because `markRecordsSyncedInSqlite` marks these un-uploaded rows `'SYNCED'`, `purgeExpiredSyncedInSqlite` (`src/services/sqliteCache.ts:157-185`) will permanently delete them after 14 days despite them never existing in Convex Cloud.
* **Recommendation**:
  1. Implement actual Convex `mutation` handlers in `convex/sync.ts` (using `mutation` from `./_generated/server`) that authenticate via `ctx.auth.getUserIdentity()`, idempotently upsert by `localRecordId` into `yoloScans` / `careLogs` / `tuyaSensorSnapshots`, and return server-generated `syncedAtMs`.
  2. Update `syncPendingToConvex` and `addOfflineFieldRecord` to `await` those Convex mutations before calling `markRecordsSyncedInSqlite`.

---

### 3. [Blocker] Broken Account Deletion Ordering & Incomplete GDPR Erasure
* **Affected Scope**: `src/providers/ConvexClerkProvider.tsx:309-328`, `convex/users.ts:76-112`, `convex/schema.ts:155-180` vs `docs/phase-fix.md:28`.
* **Finding**:
  * `deleteAccountAndData` (`src/providers/ConvexClerkProvider.tsx:309-328`) deletes Convex data (`L312`) and clears SQLite (`L313`) **before** calling `await user.delete()` (`L315`). If Clerk rejects `user.delete()` (e.g., due to `session_reverification_required` on older sessions), the user's data is destroyed while their Clerk account remains active—and `useEffect` (`L192-201`) will re-create their `users` row on next load.
  * `users.deleteMyAccountData` (`convex/users.ts:79-86`) omits the `messages` table (`convex/schema.ts:155-180`), leaving `senderClerkId` and `senderName` PII in community chat after "full" deletion.
* **Recommendation**:
  1. Perform Clerk user deletion via a server-side Convex `action` (using Clerk Backend API) *or* require Clerk re-verification before deleting Convex/SQLite data, ensuring atomic/recoverable ordering.
  2. Add `.index('by_sender', ['senderClerkId'])` to `messages` in `convex/schema.ts` and purge or anonymize user messages inside `deleteMyAccountData`.

---

### 4. [Major] 14-Day Auto-Purge Never Runs Automatically & `clearAllSqliteCache` Re-Seeds Demo Data
* **Affected Scope**: `src/providers/ConvexClerkProvider.tsx:373-382`, `src/services/sqliteCache.ts:72-90,157-185` vs `docs/phase-fix.md:26,34`.
* **Finding**:
  * `purgeExpiredSyncedInSqlite` (`src/services/sqliteCache.ts:157-185`) is only called inside `runFourteenDayAutoPurge()` (`ConvexClerkProvider.tsx:373-382`), which is never scheduled on app startup or after sync—so the 14-day auto-purge never runs automatically.
  * `loadOfflineCacheFromSqlite` (`src/services/sqliteCache.ts:72-90`) re-inserts `INITIAL_LOCAL_CACHE` whenever `offline_cache` has `0` rows. After `deleteAccountAndData()` runs `clearAllSqliteCache()`, restarting the app will resurrect demo records in SQLite.
* **Recommendation**: Trigger `purgeExpiredSyncedInSqlite()` in a startup `useEffect`, and store an initialization flag so `clearAllSqliteCache()` does not re-seed `INITIAL_LOCAL_CACHE` on next launch.

---

### 5. [Major] Web Admin Care Defaults & Analytics Are Local-Only / Hardcoded
* **Affected Scope**: `web-app/src/App.tsx:181-186,637-679`, `convex/schema.ts:100-108`, `src/providers/ConvexClerkProvider.tsx:163-170`.
* **Finding**:
  * `saveCareDefaults` (`web-app/src/App.tsx:181-186`) claims mobile growers receive the updated baseline values, but it only writes to `localStorage` (`STORAGE_CARE_KEY`) and never mutates the `careDefaults` Convex table (`convex/schema.ts:100-108`).
  * Admin Tab 3 (`analytics`, `web-app/src/App.tsx:637-679`) renders hardcoded static metrics (`1,133`, `14.2 kg`, `Tree #01..03`) rather than querying Convex.
  * `trees` and `careSetup` in `ConvexClerkProvider.tsx:163-170` are React `useState` only—they are lost on every app restart (not even cached in SQLite).
* **Recommendation**: Connect `saveCareDefaults` and mobile `careSetup` defaults to Convex `careDefaults`, replace hardcoded analytics with Convex queries, and persist `trees` / `careSetup` in SQLite until full Convex orchard sync (Section 3.1) lands.

---

### 6. [Major] Unimplemented GDPR & Analytics Opt-Out Controls Promised in Legal Pages
* **Affected Scope**: `web-app/src/components/LegalPages.tsx:137-140`, `app/legal.tsx:118-122,157-158`.
* **Finding**:
  * Both legal views state *"You may opt out or withdraw [Google Analytics] consent at any time"* and `app/legal.tsx:157-158` advertises GDPR Art. 15 & 20 data export (*"View or export your synced orchard records"*), but no analytics opt-out toggle, web cookie consent banner, or data export action exists in the codebase.
* **Recommendation**: Either remove Google Analytics references if GA is not used, or implement an explicit consent/opt-out toggle in `app/(tabs)/analytics.tsx` + web banner, and add a JSON/CSV orchard export button in `app/auth.tsx` or `app/(tabs)/analytics.tsx`.

---

### 7. [Major] Tab-Press-Only Locking & Missing Email Sign-Up Flow
* **Affected Scope**: `app/(tabs)/_layout.tsx:12-19`, `app/auth.tsx:161-200`, `src/providers/ConvexClerkProvider.tsx:255-294`.
* **Finding**:
  * `app/(tabs)/_layout.tsx:12-19` only blocks `tabPress` events; deep links or `router.push` to `/(tabs)/calendar`, `/(tabs)/scanner`, or `/(tabs)/community` bypass the lock unless each screen checks `!isSignedIn` (only `analytics.tsx:37-92` does).
  * `app/auth.tsx:161-200` only calls `signIn.password(...)` (`ConvexClerkProvider.tsx:269`), leaving new email users with no Sign-Up (`useSignUp`) path, and `signInWithEmail` (`ConvexClerkProvider.tsx:255-258`) silently drops the `nameInput` 3rd argument passed at `app/auth.tsx:195`.
* **Recommendation**: Add `!isSignedIn` guards inside `calendar.tsx`, `scanner.tsx`, and `community.tsx` (or redirect in `_layout.tsx`), and add a Sign-Up / Email Verification mode in `app/auth.tsx`.

---

### 8. [Nit] Silent Error Swallowing, Untyped `anyApi`, & Localhost/LocalStorage Artifacts
* **Affected Scope**: `src/providers/ConvexClerkProvider.tsx:199`, `web-app/src/App.tsx:101-103,129-131,862`, `src/services/sqliteCache.ts:124-126,152-154,182-184,195-197`.
* **Finding**:
  * Empty `catch {}` / `.catch(() => {})` blocks hide Convex sync and SQLite failures.
  * `anyApi` bypasses Convex's generated `api` type-safety.
  * `web-app/src/App.tsx:130` hardcodes `'C:/Users/uyko7/Downloads/WalnutData'` and `L102,190` stores `x-admin-token` in `localStorage` (XSS-exposed).
* **Recommendation**: Surface/log errors in dev/telemetry, switch to generated `api` imports, and remove the hardcoded local Windows path.
