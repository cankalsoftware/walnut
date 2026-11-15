# WalnutIQ Phase-Fix Implementation Record: Compliance, Persistence, Admin Security & Live Auth

> **Status**: Implemented & Verified  
> **Target Systems**: Mobile App (`app/`, `src/`), Web Admin Portal (`web-app/` at `walnut.pinarlik.com`), Convex Cloud (`convex/`)

## 1. Scope & Out of Scope

- **In Scope**: Google Play Store & GDPR/UK-GDPR legal disclosures, in-app account/data deletion and JSON export, persistent local SQLite offline queue with Convex batch sync and 14-day post-sync retention, server-verified admin role gating, and live Clerk mobile authentication with screen-level tab locking.
- **Out of Scope (Deferred to Next Phase)**: Phase 3 YOLO model training and `.pt` weight generation, full Convex `trees`/`orchardOverrides` synchronization, and live Stripe shop checkout.

## 2. Gaps Addressed

1. **Google Play Store & GDPR/UK-GDPR Compliance**: Public legal pages (`/privacy`, `/cookies`, `/terms`, `/account-deletion`) on `walnut.pinarlik.com`, in-app legal disclosures, GDPR JSON data export, and full account + data deletion across Convex, SQLite, and Clerk.
2. **Persistent Local SQLite Storage + Auto/Manual Sync**: `expo-sqlite` persists offline field records (`PENDING_UPLOAD` / `SYNCED`) across device restarts with an `auto` (default) or `manual` Convex sync toggle and 14-day post-sync local auto-purge.
3. **Admin Role Gate**: Restricts `walnut.pinarlik.com` admin workspace and Convex admin mutations to the verified administrator account (`pinarlik99@gmail.com`).
4. **Live Clerk Mobile Auth & Tab Locking**: Replaces mocked mobile sign-in with live `@clerk/expo` Google OAuth + Email/Password hooks and locks protected orchard tabs on both tab press and screen render when signed out.

## 3. Implemented Architecture

### A. Legal, GDPR & Google Play Compliance
- **Public Web Legal Routes**: [LegalPages.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/web-app/src/components/LegalPages.tsx) and [vercel.json](file:///c:/Users/uyko7/Documents/VSCode/walnut/web-app/vercel.json) expose `/privacy`, `/cookies`, `/terms`, and `/account-deletion` with SPA rewrites so direct Google Play Console links resolve to the SPA entry point without HTTP 404.
- **Mobile In-App Legal Screen**: [legal.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/legal.tsx) details SQLite 14-day retention, GDPR/UK-GDPR rights, field location usage for weather/frost calibration, and essential Clerk session storage. Accessible from the Orchard Home header ([index.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/(tabs)/index.tsx)) and Account screen ([auth.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/auth.tsx)).
- **Account Deletion & GDPR Export**: In [auth.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/auth.tsx) and [ConvexClerkProvider.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/src/providers/ConvexClerkProvider.tsx), **Export My Orchard Data (GDPR JSON)** shares a JSON snapshot of local orchard data, and **Delete Account & Data** invokes `users.deleteMyAccountData` in [users.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/convex/users.ts) (authenticated via `ctx.auth.getUserIdentity()`) to purge `trees`, `yoloScans`, `careLogs`, `tuyaSensorSnapshots`, `orchardOverrides`, `shopOrders`, `messages`, and `users`, clears local SQLite via `clearAllSqliteCache()`, and deletes the Clerk user.

### B. Persistent SQLite Cache & Auto/Manual Sync
- **SQLite Persistence**: [sqliteCache.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/src/services/sqliteCache.ts) stores `offline_cache` and `sqlite_meta` in `expo-sqlite` (`walnutiq_cache.db`, with `localStorage` fallback on Expo Web) so cleared databases do not re-seed demo records on restart.
- **Convex Batch Sync & 14-Day Auto-Purge**: New field records are written as `PENDING_UPLOAD` in SQLite. When signed in with `syncMode: 'auto'` (default, configurable in [analytics.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/(tabs)/analytics.tsx)), `syncPendingToConvex` invokes `api.sync.syncOfflineBatch` in [sync.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/convex/sync.ts) and marks rows `SYNCED` only after server acknowledgment. `purgeExpiredSyncedInSqlite` runs automatically on app startup to remove `SYNCED` rows older than 14 days while keeping `PENDING_UPLOAD` rows safe.

### C. Admin Role Gate
- **Server-Verified Convex Roles & Mutations**: [schema.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/convex/schema.ts) defines `role: 'admin' | 'grower'` on `users`. [users.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/convex/users.ts) and [shop.ts](file:///c:/Users/uyko7/Documents/VSCode/walnut/convex/shop.ts) verify `ctx.auth.getUserIdentity()` on every mutation/query, deriving `clerkId` and `email` from the Clerk JWT rather than client arguments.
- **Web Admin Portal Gate**: [App.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/web-app/src/App.tsx) separates legal routes from `AdminPortalApp` (preventing conditional hook execution), blocks unauthenticated `!hasClerk` rendering in production builds, and enforces `AdminRoleGate` without exposing the admin email in restriction messages.

### D. Live Clerk Mobile Auth & Tab Locking
- **Live Clerk Hooks**: [ConvexClerkProvider.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/src/providers/ConvexClerkProvider.tsx) uses `@clerk/expo` (`useAuth`, `useUser`, `useOAuth`, `useSignIn`) with `expo-secure-store`, `expo-auth-session`, and `expo-web-browser`.
- **Tab & Screen Locking**: Signed-out users cannot enter `Care Calendar`, `Camera AI`, `Community`, or `Setup & Data` via either tab press ([_layout.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/(tabs)/_layout.tsx)) or direct route navigation ([LockedTabNotice.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/src/components/LockedTabNotice.tsx)). [auth.tsx](file:///c:/Users/uyko7/Documents/VSCode/walnut/app/auth.tsx) hides sign-in forms while signed in and provides **Log Out (Lock Orchard Menus)**.

## 4. Verification & Acceptance Criteria

- **Mobile TypeScript Check**: `npm run typecheck` — passes with exit code `0`.
- **Convex TypeScript Check**: `npx tsc -p convex/tsconfig.json --noEmit` — passes with exit code `0`.
- **Web Admin Production Build**: `pnpm --dir web-app run build` — passes with exit code `0`.

## 5. Next Phase Extension Points (Post-Phase-Fix)

1. Wire `trees` and `careSetup` state in `ConvexClerkProvider.tsx` to live Convex `trees` and `orchardOverrides` queries/mutations (`api.trees.*`, `api.orchardOverrides.*`), and connect `web-app/src/App.tsx` `careDefaults` to Convex.
2. Connect live Stripe checkout to `convex/shopOrders.ts` (if/when checkout module is added).
3. Wire Phase 3 trained `.pt` weights into `backend/yolo` and mobile camera inference.
