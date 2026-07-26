# Fitconnect Backend

Domain glossary and terms for the Fitconnect backend system.

## Language

**Schedule**:
A planned session or class at a gym/company, which has a specific capacity (maximum users) and an assigned administrator.
A schedule cannot be deleted if it has registered users or users on the waitlist; in such cases, it is _cancelled_ (deactivated but preserved in history) instead of physically deleted. Past schedules are also preserved and never deleted automatically when their recurring template (Schedule Programmed) is removed.

**Schedule Programmed (Programación Semanal)**:
A weekly recurring template that defines the days of the week, hours, capacity, and administrator (coach) for a type of session. It serves as the baseline to automatically spawn individual Schedule instances for future weeks.

**Schedule Options**:
Settings configured per company/gym that dictate rules for booking, capacity requirements, and administrative warnings.

**Quota Warning Thresholds**:
An array of percentage values representing capacity levels at which schedule administrators receive warning notifications.

**Notified Quota Thresholds**:
An array of threshold percentages stored on a schedule to track which quota warnings have already been sent to avoid duplicate notifications.

**Waitlist (Lista de espera)**:
A list of users waiting to join a schedule when its maximum capacity has been reached. When a slot becomes available, the first user in the waitlist is promoted, subject to business logic validation.

**Future Subscription (Suscripción Futura)**:
A subscription created from scratch with a start date (startDate) set in the future. It is saved in the database as ACTIVE or TRIALING, but the user cannot access its permissions until the start date is reached, due to current period validation filters.
A user/company can have at most one Future Subscription scheduled at any time, and its start date must be strictly after the current active subscription's period end. When a Future Subscription is scheduled, the current active subscription is automatically set to cancel at the end of its period to prevent renewal conflicts.

**Subscription State (subscriptionState)**:
A derived, mutually-exclusive access state computed **per member, per active company** and returned on the auth payload (login / getMe → `buildAuthResponseWithPermissions`). It answers "why can/can't this member access the gym?" and drives the informational banner in the mobile app. It is derived, never stored. Four states:

- `ACTIVE` — a currently-active subscription row exists (`hasActive: true`). Full access; no banner.
- `SCHEDULED` — no currently-active row, but a future-dated ACTIVE/TRIALING row exists (a Future Subscription, or a brand-new member whose sub has not started). No access yet; banner reads "your subscription starts on {startDate}". SCHEDULED takes precedence over EXPIRED.
- `EXPIRED` — no active row and no future row, but at least one past subscription row exists. No access; banner reads "your subscription has expired".
- `NONE` — no subscription rows at all (never subscribed). No banner.

Only computed for the **member** role; coaches, admins, and super-admins are always `ACTIVE`/`NONE` and never trip the banner. `hasActive` remains the single gate for access; `subscriptionState` is additive and only distinguishes *why* access is absent.

**Backdated Subscription (Suscripción Retroactiva)**:
A subscription created with a **past** `startDate`. Only permitted for **free plans** (`plan.amount === 0`) — on this platform a free plan models a **cash/manual membership** the administrator settles off-platform (the member pays in efectivo), so backdating lets the admin record a membership from the day the member actually started using the gym instead of gifting those already-used days. Because the period end is computed from the backdated start (`calculatePeriodEnd(startDate, plan)`), the elapsed days are absorbed by the member — their period ends sooner, not later. Contrast with **Future Subscription** (start in the future).

Rules:
- Allowed **only** when `plan.amount === 0`. Paid plans must start today (neither past nor future).
- The resulting period end must be strictly **after today** — a backdate whose whole period has already elapsed is rejected (this also bounds how far back a backdate can reach: less than one plan interval; there is no separate absolute cap).
- Permitted **only if no overlapping entitlement exists**: no subscription for the same user+company in status `ACTIVE`, `TRIALING`, `PAST_DUE`, or `PAUSED` whose paid period `[currentPeriodStart, currentPeriodEnd]` intersects the new subscription's whole span `[startDate, periodEnd]`. A `CANCELED` subscription never blocks (a member who gave up coverage may have the gap backfilled).
- Not gated by role: backdating can only ever **shorten** a member's period, so there is no incentive to abuse it.

**Invariant — CANCELED means the paid period is over**:
A `CANCELED` subscription never holds a still-live paid period: `CANCELED ⇒ currentPeriodEnd <= now`. This now holds **by construction**, not by convention (see [ADR 0003](./docs/adr/0003-deferred-only-cancellation.md)). There are exactly two live routes into `CANCELED`, both invariant-preserving:

- **Deferred (default):** the billing CRON (`processBillingCycle`) fires when `currentPeriodEnd <= now`. Standard cancellation (`cancelSubscription`) is *always* deferred — it only sets `cancelAtPeriodEnd = true` and leaves `status`/`currentPeriodEnd` intact, so the member keeps access for the period they paid for. The `cancelAtPeriodEnd` input field is retained-but-ignored.
- **Radical (admin-only):** `radicalCancelSubscription` terminates immediately and *truncates* the period (`canceledAt = endedAt = currentPeriodEnd = now`, `nextBillingDate` cleared), forfeiting the member's remaining days. Gated by `plansPermissions.CREATE_UPDATE_DELETE`; requires a mandatory reason.

`adminOverride` can no longer transition to `CANCELED`. The old "replace a recently-cancelled subscription with a pending period" path (`findRecentCanceledWithPendingPeriod` / `replaceCanceledSubscription`, "Vertiente 3") — plus the caller-less `replaceSubscription` machinery — was provably dead once the invariant held and has been deleted. See [ADR 0003](./docs/adr/0003-deferred-only-cancellation.md).
