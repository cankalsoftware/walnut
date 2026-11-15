## What this proposes

This document outlines a set of targeted fixes (and three follow-on extension points) across the WalnutIQ mobile app, web admin portal, and Convex Cloud backend. Specifically, it covers adding public legal/policy pages and in-app account deletion for Google Play and GDPR/UK-GDPR compliance, persisting offline orchard records in a local SQLite cache with a 14-day post-sync retention window and an auto/manual sync toggle, restricting the web admin portal to a single hardcoded email (`pinarlik99@gmail.com`) via a Convex user role and frontend gate, and replacing mocked mobile sign-in state with live Clerk authentication and a logout action that locks four bottom navigation tabs.

## How the existing system works, per this document

Per this document, the system consists of a mobile app (`app/`, `src/`), a web admin portal (`web-app/`) hosted on `walnut.pinarlik.com` (deployed with `vercel.json`), and a Convex Cloud backend (`convex/`), all sharing a Clerk authentication system. Previously, offline orchard records were stored only in React state memory (erased on device restart), mobile sign-in only toggled local state without live Clerk sessions or tab-locking logout, `walnut.pinarlik.com` allowed any signed-in grower to view the admin dashboard, and public legal/account-deletion URLs and in-app deletion were missing. Even after these fixes, some `trees` and `careSetup` state still lives in local React state inside `ConvexClerkProvider.tsx` rather than Convex, and shop checkout and YOLO model weights are not yet wired up.

---

### Findings

1. **Severity**: Major
   **Affected Scope**: Document Title (Line 1), Section 2 Heading (Line 18), and tense throughout Sections 1–2
   **Discrepancy Description & Rationale**: It is unclear whether this document is a *plan* for future work or a *record* of already-implemented changes. The title calls it a "Phase-Fix Plan", but Section 2 is titled "Implemented & Extended Architecture" and uses past-tense verbs ("Exposed", "Added"). A fresh reader cannot tell what is already in the codebase versus what is still proposed.

2. **Severity**: Major
   **Affected Scope**: Section 2.B (Lines 30–36) vs. Section 3.1 (Line 52)
   **Discrepancy Description & Rationale**: Section 2.B states that `sqliteCache.ts` persists offline orchard records (`PENDING_UPLOAD` and `SYNCED`) and pushes `PENDING_UPLOAD` records to Convex. However, Section 3.1 states that `trees` and `careSetup` are still held in local React state in `ConvexClerkProvider.tsx` and are not yet wired to Convex mutations (`api.trees.*`, `api.orchardOverrides.*`). The document never explains *which* record types are actually stored in `offline_cache` and synced to Convex today, leaving a logical contradiction/gap about what the SQLite cache currently persists.

3. **Severity**: Major
   **Affected Scope**: Section 2.A — In-App Account & Data Deletion (Lines 27–28)
   **Discrepancy Description & Rationale**: The document states that `users.deleteMyAccountData` (in `convex/users.ts`) purges several Convex tables, "clears local SQLite, and deletes the Clerk user." It does not explain how a Convex backend function clears local SQLite on the mobile device or how it deletes a user from Clerk (an external auth service), nor what happens if one of these cross-system steps fails.

4. **Severity**: Major
   **Affected Scope**: Section 2.C — Strict Admin Role Gate (Lines 38–42)
   **Discrepancy Description & Rationale**: The document describes assigning `role: 'admin'` in Convex (`syncCurrentUser`) and gating the web UI via `AdminRoleGate` in `web-app/src/App.tsx` by checking the Clerk email against `pinarlik99@gmail.com`. It does not explain whether Convex backend queries/mutations used by the admin portal actually enforce `role === 'admin'`, or if the restriction is purely a frontend UI check.

5. **Severity**: Nit
   **Affected Scope**: Header Scope note (Line 4) — "Elephant review"
   **Discrepancy Description & Rationale**: "Elephant review" is a project/workflow-specific term that is neither defined inline nor linked, so a naive reader has no context on what this review is or where its findings live.

6. **Severity**: Nit
   **Affected Scope**: Section 2.A (Line 28) & Section 3.1 (Line 52) — `tuyaSensorSnapshots`, `orchardOverrides`, `careSetup`
   **Discrepancy Description & Rationale**: These project-specific table and state names are referenced without brief definitions. A new team member does not know what Tuya sensors are used for, what an "orchard override" overrides, or what `careSetup` contains.

7. **Severity**: Nit
   **Affected Scope**: Section 2.D — Live Clerk Mobile Auth & Tab Locking (Lines 45–47)
   **Discrepancy Description & Rationale**: `LiveClerkConvexStateProvider` is named without explaining its role or how it differs from `ConvexClerkProvider.tsx`. Additionally, "locks the 4 bottom tabs" does not specify the UX behavior (whether tabs are hidden, disabled, or redirect to `app/auth.tsx`) or which tabs remain accessible when logged out.

8. **Severity**: Nit
   **Affected Scope**: Section 2.B (Lines 35–36) — `app/(tabs)/analytics.tsx` vs. "Setup & Data"
   **Discrepancy Description & Rationale**: The document pairs the file `app/(tabs)/analytics.tsx` with the UI label **Setup & Data** without noting why an analytics file hosts setup and data sync controls, which is slightly confusing to a reader orienting themselves in the codebase.
