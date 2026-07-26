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
