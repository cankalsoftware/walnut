# Stage 8: Intermediate Zoom Out Report — `docs/phase-fix.md`

**Target Document**: `c:\Users\uyko7\Documents\VSCode\walnut\docs\phase-fix.md` (lines 1–54)  
**Reviewers**: `egm-structural` & `egm-style`  
**Scope Note**: `.pt` model files and YOLO AI detection options are intentionally excluded from this phase-fix scope.

---

## Summary

The heading hierarchy (`#` -> `##` -> `###`) is valid and Section 1's four gaps map 1:1 to Section 2's subsections (`A`–`D`). However, the document has framing/tense contradictions between "Plan" and "Implemented", is missing verification/acceptance criteria sections, and attributes client-side SQLite clearing to a Convex mutation.

---

## Findings

### 1. [Major] Missing Verification, Test Status & Acceptance Criteria Sections
- **Affected Scope**: Document-wide (missing section after Line 48).
- **Rationale**: Section 2 ("Implemented & Extended Architecture") describes completed changes, and Section 3 jumps directly to future extension points without documenting how any of the four fixes (legal routes/deletion, SQLite persistence/auto-purge, admin role gate, live Clerk auth/tab locking) were tested, verified, or accepted.
- **Recommendation**: Add a **Verification & Acceptance Criteria** section recording concrete build/typecheck/runtime checks for each fix.

### 2. [Major] Document Framing & Tense Inconsistency (Plan vs. Implementation Record)
- **Affected Scope**: Lines 1, 4, 18, 22–47, 51.
- **Rationale**: Line 1 titles the document a "Phase-Fix Plan," while Section 2 ("Implemented & Extended Architecture", line 18) and Section 3 ("Next Phase Extension Points (Post-Phase-Fix)", line 51) present it as an implemented record. Within Section 2, verb tense alternates between past ("Exposed", "Added") and present ("purges", "Uses", "verifies"). Scope boundaries are also buried in a parenthetical on line 4 rather than in a dedicated **Scope / Out of Scope** section.
- **Recommendation**: Standardize the title and tense (e.g., "WalnutIQ Phase-Fix Implementation Record" with consistent present tense for system behavior), and promote out-of-scope items into a dedicated section.

### 3. [Major] Imprecise Attribution of Client vs. Server Responsibilities
- **Affected Scope**: Line 28.
- **Rationale**: The sentence states that `users.deleteMyAccountData` "purges [Convex tables], clears local SQLite, and deletes the Clerk user." A Convex mutation cannot clear device-local SQLite directly; combining `convex/users.ts` and `app/auth.tsx` in the bullet header blurs which layer executes which step.
- **Recommendation**: Attribute each layer explicitly (e.g., `app/auth.tsx` invokes `users.deleteMyAccountData` to purge Convex tables, clears local SQLite, and triggers Clerk user deletion).

### 4. [Nit] Internal Process Jargon ("Elephant review")
- **Affected Scope**: Line 4.
- **Rationale**: "gaps identified in Elephant review" relies on internal agent-workflow jargon opaque to a fresh engineering reader.
- **Recommendation**: Replace with a neutral reference (e.g., "pre-release architecture and compliance review").

### 5. [Nit] Vague Outcome Phrasing & Subjective Qualifiers
- **Affected Scope**: Lines 23, 24, 38, 40, 45.
- **Rationale**:
  - Line 23: "load cleanly" -> state concrete behavior ("resolve to the SPA entry point without returning HTTP 404").
  - Line 24: "Detailed Mobile In-App Legal Screen" -> drop subjective "Detailed".
  - Lines 38, 40: "Strict" / "strictly" -> drop filler emphasis ("Admin Role Gate", "assigns `'admin'` only to...").
  - Line 45: "Real Clerk Hooks" -> use "Live Clerk Hooks" or "Clerk Auth Hooks."

### 6. [Nit] Minor Formatting & Naming Asymmetries
- **Affected Scope**: Lines 38, 51, 53.
- **Rationale**:
  - Line 38 embeds an email literal (`pinarlik99@gmail.com`) in the `### C.` heading unlike `A`, `B`, and `D`.
  - Line 51 (`## 3.`) lacks the blank line after the heading that `## 1.` and `## 2.` have.
  - Line 53 writes `convex/shopOrders` without `.ts` or distinguishing table vs. module name.
