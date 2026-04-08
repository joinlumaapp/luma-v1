# Backend Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 backend issues: boost Gold cost mismatch, SpendGoldDto whitelist gap, missing discovery endpoints, and production receipt safety guard.

**Architecture:** All fixes are in the NestJS backend (`apps/backend/`). Changes touch 3 modules (payments, profiles, discovery) and 1 DTO. Each fix is independent and can be committed separately.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/backend/src/modules/profiles/profiles.service.ts:1015` | Modify | Align BOOST_GOLD_COST from 50 to 100 |
| `apps/backend/src/modules/payments/dto/spend-gold.dto.ts:11-21` | Modify | Add all 24 GOLD_COSTS actions to whitelist |
| `apps/backend/src/modules/discovery/discovery.controller.ts` | Modify | Add priority-boost and nearby-notify stub endpoints |
| `apps/backend/src/modules/discovery/discovery.service.ts` | Modify | Add stub methods for priority-boost and nearby-notify |
| `apps/backend/src/modules/payments/receipt-validator.service.ts:116-117` | Modify | Add REQUIRE_REAL_RECEIPTS env var guard |
| `apps/backend/src/modules/profiles/profiles.service.spec.ts` | Modify | Update boost cost test expectations |
| `apps/backend/src/modules/payments/payments.service.spec.ts` | Modify | Add tests for new gold actions |
| `apps/backend/src/modules/discovery/discovery.controller.spec.ts` | Modify | Add tests for new endpoints |
| `apps/backend/src/modules/payments/receipt-validator.service.spec.ts` | Modify | Add REQUIRE_REAL_RECEIPTS test |

---

## Task 1: Fix Boost Gold Cost Mismatch

The `ProfilesService` charges 50 Gold for boost, but `GOLD_COSTS` in `PaymentsService` defines 100. The `GOLD_COSTS` table is the single source of truth for all Gold spending. Align `ProfilesService` to 100.

**Files:**
- Modify: `apps/backend/src/modules/profiles/profiles.service.ts:1015`
- Test: `apps/backend/src/modules/profiles/profiles.service.spec.ts`

- [ ] **Step 1: Update BOOST_GOLD_COST to 100**

In `apps/backend/src/modules/profiles/profiles.service.ts`, change line 1015:

```typescript
// Before:
private static readonly BOOST_GOLD_COST = 50;

// After:
private static readonly BOOST_GOLD_COST = 100;
```

- [ ] **Step 2: Update boost description to match PaymentsService**

In `apps/backend/src/modules/profiles/profiles.service.ts`, change the description at line 1093:

```typescript
// Before:
description: `Profil Boost - ${ProfilesService.BOOST_DURATION_MINUTES} dakika`,

// After:
description: `Profil Boost - ${ProfilesService.BOOST_DURATION_MINUTES} dakika (${ProfilesService.BOOST_GOLD_COST} Gold)`,
```

- [ ] **Step 3: Search for any test expectations using old cost (50)**

Run: `grep -n "50" apps/backend/src/modules/profiles/profiles.service.spec.ts | grep -i boost`

If any test expects 50 Gold for boost, update to 100.

- [ ] **Step 4: Run profiles tests**

Run: `cd apps/backend && npx jest --testPathPattern=profiles.service.spec --no-coverage`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/profiles/profiles.service.ts apps/backend/src/modules/profiles/profiles.service.spec.ts
git commit -m "fix: align boost Gold cost to 100 (single source of truth in GOLD_COSTS)"
```

---

## Task 2: Sync SpendGoldDto Whitelist with GOLD_COSTS

The DTO whitelist has only 9 actions but `GOLD_COSTS` defines 24. Controller-level validation rejects valid actions before they reach the service.

**Files:**
- Modify: `apps/backend/src/modules/payments/dto/spend-gold.dto.ts:11-21`
- Test: `apps/backend/src/modules/payments/payments.service.spec.ts`

- [ ] **Step 1: Replace VALID_GOLD_ACTIONS with all 24 actions**

In `apps/backend/src/modules/payments/dto/spend-gold.dto.ts`, replace lines 11-21:

```typescript
const VALID_GOLD_ACTIONS = [
  "profile_boost",
  "super_like",
  "read_receipts",
  "undo_pass",
  "spotlight",
  "travel_mode",
  "priority_message",
  // Matching redesign actions
  "extra_likes_reveal",
  "extra_viewers_reveal",
  "viewer_delay_bypass",
  "priority_visibility_1h",
  "priority_visibility_3h",
  "activity_strip_pin",
  "secret_admirer_send",
  "secret_admirer_extra_guess",
  "compatibility_xray",
  "super_compatible_reveal",
  "ai_chat_suggestion_pack",
  "nearby_notify",
  "weekly_top_reveal",
  "message_bundle_3",
  "message_bundle_5",
  "message_bundle_10",
] as const;
```

- [ ] **Step 2: Update ApiProperty description to list all actions**

In the same file, update the `@ApiProperty` description for the `action` field to reference the full list.

- [ ] **Step 3: Remove stale voice_call and video_call actions**

The old whitelist had `voice_call` and `video_call` which are NOT in `GOLD_COSTS`. They were already removed in Step 1. Verify they don't appear anywhere else:

Run: `grep -rn "voice_call\|video_call" apps/backend/src/modules/payments/`

- [ ] **Step 4: Run payments tests**

Run: `cd apps/backend && npx jest --testPathPattern=payments.service.spec --no-coverage`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payments/dto/spend-gold.dto.ts
git commit -m "fix: sync SpendGoldDto whitelist with all 24 GOLD_COSTS actions"
```

---

## Task 3: Add Missing Discovery Endpoints (priority-boost, nearby-notify)

Routes are defined in `API_ROUTES.DISCOVERY` but no controller methods exist. Add stub endpoints that return `501 Not Implemented` with a clear message — these are Gold-spend features that will be fleshed out later.

**Files:**
- Modify: `apps/backend/src/modules/discovery/discovery.controller.ts`
- Modify: `apps/backend/src/modules/discovery/discovery.service.ts`
- Test: `apps/backend/src/modules/discovery/discovery.controller.spec.ts`

- [ ] **Step 1: Add priority-boost endpoint to controller**

In `apps/backend/src/modules/discovery/discovery.controller.ts`, before the closing `}` of the class, add:

```typescript
// ── Priority Boost (Oncelikli Gorunurluk) ─────────────────────────

@Post("priority-boost")
@Throttle({ default: { limit: 5, ttl: 60000 } })
@ApiOperation({
  summary:
    "Activate priority visibility boost (costs Gold, duration varies by tier)",
})
async priorityBoost(@CurrentUser("sub") userId: string) {
  return this.discoveryService.activatePriorityBoost(userId);
}

// ── Nearby Notify (Yakin Cevre Bildirimi) ─────────────────────────

@Post("nearby-notify")
@Throttle({ default: { limit: 3, ttl: 60000 } })
@ApiOperation({
  summary:
    "Send a notification to nearby users about your presence (costs 35 Gold)",
})
async nearbyNotify(@CurrentUser("sub") userId: string) {
  return this.discoveryService.sendNearbyNotify(userId);
}
```

- [ ] **Step 2: Add stub methods to discovery service**

In `apps/backend/src/modules/discovery/discovery.service.ts`, add two methods:

```typescript
/** Activate priority visibility boost — costs Gold */
async activatePriorityBoost(userId: string) {
  throw new NotImplementedException(
    "Priority boost will be available in a future update",
  );
}

/** Send nearby notification — costs 35 Gold */
async sendNearbyNotify(userId: string) {
  throw new NotImplementedException(
    "Nearby notify will be available in a future update",
  );
}
```

Ensure `NotImplementedException` is imported from `@nestjs/common`.

- [ ] **Step 3: Run discovery controller tests**

Run: `cd apps/backend && npx jest --testPathPattern=discovery.controller.spec --no-coverage`

Expected: All tests PASS (new endpoints are stubs, no new test failures)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/discovery/discovery.controller.ts apps/backend/src/modules/discovery/discovery.service.ts
git commit -m "feat: add priority-boost and nearby-notify stub endpoints (501)"
```

---

## Task 4: Add Production Receipt Safety Guard

Currently receipt validation only checks `NODE_ENV`. Add an explicit `REQUIRE_REAL_RECEIPTS` environment variable that, when set to `"true"`, forces real validation regardless of `NODE_ENV`. This is a safety net against misconfigured deployments.

**Files:**
- Modify: `apps/backend/src/modules/payments/receipt-validator.service.ts:107-117`
- Test: `apps/backend/src/modules/payments/receipt-validator.service.spec.ts`

- [ ] **Step 1: Add REQUIRE_REAL_RECEIPTS check**

In `apps/backend/src/modules/payments/receipt-validator.service.ts`, modify the constructor:

```typescript
// Add after line 107 (private readonly isProduction: boolean;)
private readonly requireRealReceipts: boolean;

// In constructor, after isProduction assignment:
this.requireRealReceipts =
  this.configService.get<string>("REQUIRE_REAL_RECEIPTS") === "true";

if (this.requireRealReceipts) {
  this.logger.log(
    "REQUIRE_REAL_RECEIPTS is enabled. Mock receipts will be rejected.",
  );
}
```

- [ ] **Step 2: Update handleMissingCredentials to check requireRealReceipts**

In `handleMissingCredentials` method (line 448), change the production check:

```typescript
// Before:
if (this.isProduction) {

// After:
if (this.isProduction || this.requireRealReceipts) {
```

- [ ] **Step 3: Update handleMissingGoogleCredentials similarly**

In `handleMissingGoogleCredentials` method (line 490), change:

```typescript
// Before:
if (this.isProduction) {

// After:
if (this.isProduction || this.requireRealReceipts) {
```

- [ ] **Step 4: Run receipt validator tests**

Run: `cd apps/backend && npx jest --testPathPattern=receipt-validator.service.spec --no-coverage`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/payments/receipt-validator.service.ts
git commit -m "fix: add REQUIRE_REAL_RECEIPTS safety guard for receipt validation"
```

---

## Final Verification

- [ ] **Run all backend tests**

```bash
cd apps/backend && npx jest --no-coverage
```

Expected: All tests PASS

- [ ] **Run TypeScript compilation check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors
