# pyright: reportUndefinedVariable=false, reportGeneralTypeIssues=false
# flake8: noqa
import json
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    def phase(name: str) -> None: ...
    def log(*args: Any) -> None: ...
    def agent(*args: Any, **kwargs: Any) -> Any: ...
    async def parallel(items: Any, fn: Any) -> Any: ...

phase("Parallel Auth, Tenant Isolation & Admin Role Audit")

targets = [
    {
        "name": "Convex Auth, Users & Schema",
        "files": [
            "convex/auth.config.ts",
            "convex/users.ts",
            "convex/schema.ts",
        ],
    },
    {
        "name": "Convex Telemetry, Sync, Orchard Fields & Logs",
        "files": [
            "convex/sync.ts",
            "convex/orchardFields.ts",
            "convex/logs.ts",
        ],
    },
    {
        "name": "Convex Care Broadcasts & Shop Admin Endpoints",
        "files": [
            "convex/careBroadcasts.ts",
            "convex/shop.ts",
        ],
    },
    {
        "name": "Python FastAPI Admin & Scraper Backend",
        "files": [
            "backend/server.py",
        ],
    },
    {
        "name": "Mobile App Auth Provider, Offline Sync & Tab Access Controls",
        "files": [
            "src/providers/ConvexClerkProvider.tsx",
            "src/services/offlineSyncService.ts",
            "src/services/sqliteCache.ts",
            "src/components/LockedTabNotice.tsx",
            "src/components/OrchardFieldsSection.tsx",
            "app/_layout.tsx",
            "app/auth.tsx",
            "app/(tabs)/_layout.tsx",
            "app/(tabs)/index.tsx",
            "app/(tabs)/analytics.tsx",
            "app/(tabs)/calendar.tsx",
            "app/(tabs)/community.tsx",
            "app/(tabs)/scanner.tsx",
            "app/shop.tsx",
        ],
    },
    {
        "name": "Admin Web App & Broadcast/Shop UI",
        "files": [
            "web-app/src/App.tsx",
            "web-app/src/components/MobileCareBroadcasts.tsx",
            "web-app/src/components/ShopAdminTab.tsx",
        ],
    },
]

schema = {
    "type": "object",
    "properties": {
        "slice": {"type": "string"},
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "file": {"type": "string"},
                    "line": {"type": "integer"},
                    "function_or_endpoint": {"type": "string"},
                    "boundary_violated": {
                        "type": "string",
                        "enum": [
                            "Boundary 1: Unauthenticated Read/Write",
                            "Boundary 2: Cross-User Data Access",
                            "Boundary 3: Missing Admin Role Enforcement",
                            "General Auth / Role Weakness",
                        ],
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
                    },
                    "description": {"type": "string"},
                    "remediation": {"type": "string"},
                },
                "required": [
                    "file",
                    "line",
                    "function_or_endpoint",
                    "boundary_violated",
                    "severity",
                    "description",
                    "remediation",
                ],
            },
        },
        "verified_safe": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["slice", "findings", "verified_safe"],
}


def make_auditor(item):
    slice_name = item["name"]
    file_list = ", ".join(item["files"])
    prompt = f"""Slice: {slice_name}
Audit the following files in the workspace: {file_list}

Read every listed file completely using read_file and verify these three strict security boundaries:
1. Boundary 1 (Unauthenticated Requests): Unauthenticated requests must only receive static/default demo data and CANNOT read or write real orchard telemetry, watering, or maintenance logs, user records, or system logs.
2. Boundary 2 (Tenant / User Isolation): Logged-in users can ONLY access and mutate their own walnut field data, trees, sensor snapshots, care overrides, and orders (bound to their authenticated identity.subject / userId, never trusting client-supplied userId or returning unscoped queries).
3. Boundary 3 (Admin Role Checks): Admin endpoints for updating and sharing tree care details (careDefaults, careCards, careNotifications, shop product management, system logs, self-promo, backend/server.py routes) MUST strictly enforce server-side admin role checks.

Set `slice` to "{slice_name}". For every vulnerability found, report the exact file path, exact 1-based line number, function/endpoint name, which boundary is violated, severity (CRITICAL, HIGH, MEDIUM, LOW), a precise explanation of the flaw, and how to fix it. Also list functions/endpoints that properly enforce the boundaries in verified_safe."""
    return agent(
        prompt=prompt,
        schema=schema,
        role="researcher",
        type_name="research",
        model="flash",
        workspace="inherit",
    )


results = await parallel(targets, make_auditor)  # type: ignore[top-level-await]

for r in results:
    log(f"=== {r['slice']} ({len(r['findings'])} findings) ===")
    for f in r["findings"]:
        log(
            f"[{f['severity']}] {f['file']}:{f['line']} ({f['function_or_endpoint']}) - {f['boundary_violated']}: {f['description']}"
        )

print(json.dumps(results, indent=2))
