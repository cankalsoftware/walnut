# Stage 5: Initial Zoom Out Report — `docs/phase-fix.md`

**Target Document**: `c:\Users\uyko7\Documents\VSCode\walnut\docs\phase-fix.md` (lines 1–54)  
**Semantic Split**: `FeatureRange = 1..54` | `DetailedRange = N/A` (no `## Detailed Implementation Plan` section found)  
**Scope Note**: `.pt` model files and YOLO AI detection options are intentionally excluded from this phase-fix scope.

---

## Overall Verdict

**Needs Revision** — The document defines clear phase-fix goals in Section 1, but several Section 2 implementations do not resolve their root causes (simulated Convex sync with active 14-day local purge, client-trusted Convex mutations, client-side admin email gate, and a React Rules-of-Hooks violation in the web app) or duplicate state/copy across modules.

---

## Findings

### 1. [Blocker] Simulated Convex Sync + Active 14-Day Purge Causes Silent Data Loss
- **Affected Scope**: Section 2B (`docs/phase-fix.md` lines 31–36), `src/providers/ConvexClerkProvider.tsx` (lines 330–371, 395–396), `convex/sync.ts` (lines 28–37), `src/services/sqliteCache.ts` (lines 157–185).
- **Issue**: `docs/phase-fix.md` states that `syncPendingToConvex` automatically pushes `PENDING_UPLOAD` SQLite records to Convex when signed in. In reality, `syncPendingToConvex` only calls a local pure function `buildSyncAcknowledgments` in `convex/sync.ts` and marks rows `SYNCED` via `markRecordsSyncedInSqlite`. Likewise, `addOfflineFieldRecord` marks new records `SYNCED` immediately when `isSignedIn` is true. Because `purgeExpiredSyncedInSqlite` deletes `SYNCED` rows older than 14 days, un-uploaded field records enter the 14-day deletion countdown without ever reaching Convex.
- **Proposed Resolution**: Invert the sync state transition to a true outbox pattern—always write `PENDING_UPLOAD` on capture and only mark `SYNCED` after an actual Convex mutation (`api.sync.syncOfflineBatch`) resolves with server acknowledgments. Until that mutation is wired, keep records in `PENDING_UPLOAD` (or disable the 14-day auto-purge) and state this clearly in `docs/phase-fix.md`.

### 2. [Blocker] Client-Trusted Convex Mutations & Client-Side Admin Gate
- **Affected Scope**: Section 2A (`docs/phase-fix.md` lines 27–28), Section 2C (`docs/phase-fix.md` lines 38–42), `convex/users.ts` (lines 10–112), `convex/schema.ts` (line 18), `web-app/src/App.tsx` (lines 17, 776–778, 867–937).
- **Issue**:
  - `deleteMyAccountData`, `syncCurrentUser`, and `getUserRole` in `convex/users.ts` accept client-supplied `clerkId` and `email` arguments instead of verifying `ctx.auth.getUserIdentity()` on the server. Any caller could pass another user's `clerkId` to delete their records across 7 tables.
  - `AdminRoleGate` in `web-app/src/App.tsx` checks `user?.primaryEmailAddress?.emailAddress` against the hardcoded `ADMIN_EMAIL = 'pinarlik99@gmail.com'` in React UI rather than enforcing a verified server-side role claim. When `!hasClerk` is true (`web-app/src/App.tsx` lines 776–778), the full admin workspace renders unauthenticated.
- **Proposed Resolution**: Derive user identity from `ctx.auth.getUserIdentity()` inside Convex queries/mutations, remove client-supplied `clerkId`/`email` trust, and enforce admin access via a single authoritative claim (Clerk JWT custom claim / `publicMetadata` or server-verified Convex user record) rather than duplicating a hardcoded email check in client and backend.

### 3. [Blocker] React Rules-of-Hooks Violation on Web Legal Routes
- **Affected Scope**: Section 2A (`docs/phase-fix.md` lines 21–23), `web-app/src/App.tsx` (lines 76–80, 92–150).
- **Issue**: `if (legalRoute) { return <LegalPages ... />; }` (lines 92–94) executes before the component's `useState` and `useEffect` calls (lines 95–150). Navigating between `/privacy` and `/` via `navigateLegal` changes the number of hooks executed across renders.
- **Proposed Resolution**: Move the `legalRoute` check into a top-level router/wrapper component or place it after all hook declarations in `App`.

### 4. [Major] Duplicated SQLite/Memory Purge Logic & Demo Data Seeding
- **Affected Scope**: Section 2B (`docs/phase-fix.md` lines 31–36), `src/providers/ConvexClerkProvider.tsx` (lines 373–382), `src/services/sqliteCache.ts` (lines 72–90, 157–185), `src/services/offlineSyncService.ts` (lines 30–100).
- **Issue**:
  - `runFourteenDayAutoPurge` runs both `purgeExpiredSyncedInSqlite` and `purgeExpiredSyncedCache` instead of treating SQLite as the single source of truth.
  - `loadOfflineCacheFromSqlite` seeds `INITIAL_LOCAL_CACHE` (including a fake `PENDING_UPLOAD` record `cache-5`) whenever the `offline_cache` table is empty, which injects demo records into real user databases and re-seeds them on the next launch after `clearAllSqliteCache()`.
- **Proposed Resolution**: Use SQLite as the single source of truth and remove the duplicate in-memory filter. Restrict `INITIAL_LOCAL_CACHE` seeding to explicit demo/dev mode so empty user databases stay empty (especially after account deletion).

### 5. [Major] Offline-First vs. Tab-Locking Contradiction & Duplicated Provider State
- **Affected Scope**: Section 2D (`docs/phase-fix.md` lines 44–49), Section 3 (`docs/phase-fix.md` line 52), `src/providers/ConvexClerkProvider.tsx` (lines 150–566), `app/auth.tsx` (lines 225–237), `app/(tabs)/analytics.tsx` (lines 37–92).
- **Issue**:
  - Logging out (`signOutToOfflineMode`, labeled `Log Out (Lock Orchard Menus)`) locks 4 core tabs including local `Setup & Data` and `Camera AI`, contradicting the offline-first goal of working in the field without connectivity/sign-in.
  - `LiveClerkConvexStateProvider` still holds `trees` and `careSetup` in local React state despite `convex/schema.ts` defining those tables, and `ConvexClerkProvider.tsx` duplicates ~130 lines of state/SQLite wiring across `LiveClerkConvexStateProvider` and `FallbackLocalStateProvider`.
- **Proposed Resolution**: Segment *Cloud Sync & Community* (requires Clerk session) from *Local Orchard Capabilities* (works against SQLite offline), and extract shared local state + SQLite wiring into a single `useLocalOrchardState` hook.

### 6. [Major] Non-Atomic Account Deletion Order
- **Affected Scope**: Section 2A (`docs/phase-fix.md` lines 27–28), `src/providers/ConvexClerkProvider.tsx` (lines 309–328).
- **Issue**: `deleteAccountAndData` purges Convex data and clears SQLite *before* calling `await user.delete()` on Clerk. If Clerk rejects deletion (e.g., stale session requiring re-authentication), the user's orchard data is erased while their Clerk account remains active.
- **Proposed Resolution**: Verify/delete the Clerk user first (or execute deletion server-side via a Convex action using Clerk's Backend API) before wiping Convex and SQLite records.

### 7. [Nit] Doc Drift, Duplicated Legal Copy & Unwired Analytics Toggle
- **Affected Scope**: Section 2A (`docs/phase-fix.md` line 26), Section 2D (`docs/phase-fix.md` line 46), `web-app/src/components/LegalPages.tsx` (lines 1–292), `app/legal.tsx` (lines 1–282).
- **Issue**:
  - `docs/phase-fix.md` line 46 cites `@clerk/clerk-expo`, whereas `src/providers/ConvexClerkProvider.tsx` imports `@clerk/expo`.
  - Legal/GDPR copy is duplicated across two ~285-line files (`LegalPages.tsx` and `app/legal.tsx`), risking policy drift.
  - `docs/phase-fix.md` line 26 and `app/legal.tsx` (lines 118–122) describe Google Analytics telemetry and an option to withdraw consent, but no analytics SDK or opt-out toggle exists in the referenced files.
- **Proposed Resolution**: Update the package name to `@clerk/expo`, share a single structured legal content source (or canonical link + concise offline summary), and align analytics disclosure with actual telemetry/controls.
