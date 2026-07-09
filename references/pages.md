# Page Inventory

Each entry: route, purpose, sections top-to-bottom, key components used (see `components.md`), and states to design for. Build public-facing pages before authenticated ones (see SKILL.md build order).

---

## 1. Discover / Home — `/`

**Purpose:** browsing/search entry point. Analogous to Luma's Discover feed.

**Sections:**
- Nav bar (logo, search input, "Create Event" CTA, sign-in)
- Hero: not a marketing hero — a functional one. A large `font-display` line ("What's happening") plus a city/location switcher, since events are inherently local/time-bound
- Featured calendars strip — horizontal scroll of calendar avatars/names a user can follow
- Event grid — `EventCard` components, 3-column on desktop / 1-column mobile, grouped by date heading ("Today", "This week", "Later")
- Category filter chips (in-person / virtual / hybrid, and topic tags) — chips are outline-only, inverted (`bg-ink text-paper`) when active, never colored
- Footer

**States:**
- Empty (no events in area/filter) → editorial empty state, not a sad-face illustration: a single line of `font-display` copy plus a "browse all events" fallback action
- Loading → skeleton cards using `mist` fill blocks, no shimmer gradient (a moving gradient reads as a generic loading state; a static pulse via Framer Motion's `opacity` tween is more in keeping with the restrained motion language — see `animation.md`)

---

## 2. Event Detail (public RSVP page) — `/e/[slug]`

**Purpose:** the page a guest lands on from a shared link. Single most important page — it's the conversion moment.

**Sections:**
- Cover image (full color allowed here — see monochrome constraint exception in SKILL.md) with a hard `border-b border-mist`, no gradient overlay
- Event title (`font-display`, large), host name/avatar, date/time block set in `font-mono` (this is the "instrument panel" precision moment — treat the date/time like a boarding pass stub)
- Sticky RSVP panel (desktop: right rail; mobile: sticky bottom bar) — capacity indicator, price or "Free", the primary CTA
- Location block — address or virtual link, map thumbnail rendered in **grayscale filter** (`filter: grayscale(1)`) to hold the monochrome line even for embedded map tiles
- Description (rich text, `font-body`, `max-w-2xl` reading width)
- Host/calendar card — small module linking to the host's Calendar/Brand page
- Guest avatars strip ("32 going") — circular avatars desaturated to grayscale in the strip view, full color on individual hover/click
- Comments/questions section (optional, if platform supports it)

**States:**
- Not yet open for registration → CTA disabled, replaced with "Registration opens [date]" in mono type
- Sold out / full → CTA becomes "Join waitlist", indicated by a dashed border treatment on the RSVP panel (pattern-as-status, not color)
- Already registered (returning visitor) → CTA replaced with a receipt-style confirmation block ("You're going ✓" — checkmark icon, not a green pill)
- Cancelled event → the whole page adopts a diagonal-hatch texture watermark behind the content — this is the pattern-based "cancelled" signal referenced in SKILL.md

---

## 3. Create / Edit Event — `/create` and `/e/[slug]/edit`

**Purpose:** host-facing form. This is the most complex page — see `event-form.md` for the full field-level spec.

**High-level sections:** Basic Info → Location/Format → Date & Time → Cover Image → Ticketing → Registration Questions → Theme (grayscale variants only) → Review/Publish.

---

## 4. Event Management Dashboard — `/e/[slug]/manage`

**Purpose:** the host's control room after an event is created. Tabbed layout.

**Tabs:**
- **Overview** — key numbers (registered / capacity / revenue) as large `font-mono` stat blocks, not chart-heavy; a simple grayscale sparkline for registration-over-time
- **Guests** — links to Guest List page (below)
- **Blasts** — list of scheduled/sent email announcements, compose button opens a modal with subject/body/send-time fields
- **Insights** — registration source breakdown (referrer, social, direct), rendered as a horizontal bar list using the value scale (`ink` = largest bar, fading to `silver`) rather than a colored pie chart
- **Settings** — visibility (public/private/member-only), custom URL, capacity, waitlist toggle, cancellation

**States:** empty Blasts tab → prompt to send first reminder; zero-guests Overview → encouragement copy + "share your event" CTA with copyable link field.

---

## 5. Guest List & Check-in — `/e/[slug]/manage/guests`

**Purpose:** table of registrants; doubles as a check-in mode for day-of.

**Sections:**
- Search/filter bar (by name, ticket type, check-in status)
- Table: name, ticket type, registration date (`font-mono`), status (Going / Waitlist / Cancelled — status shown via icon + text label, never a colored pill), check-in toggle
- Bulk actions bar (appears on row selection — email selected, export CSV)
- **Check-in mode** (distinct full-screen view, likely mobile-optimized for door staff): large search field, guest name in `font-display`, single tap-to-check-in action, running counter of checked-in vs. total in `font-mono`

**States:** empty (no registrants yet); check-in mode "not found" state (name search miss) → offer manual add-guest fallback.

---

## 6. Checkout / Ticket Purchase — `/e/[slug]/checkout`

**Purpose:** payment flow for paid events. Keep this short — Luma's own advantage over legacy platforms is a fast checkout.

**Sections:**
- Order summary (ticket type, quantity stepper, price in `font-mono`)
- Registration questions (if host configured any — reuses form components from `event-form.md`)
- Payment fields (card via Stripe Elements — style Stripe's injected iframe fields with the closest achievable monochrome border/focus treatment)
- Total + Pay CTA

**States:** processing (button shows an inline spinner — a rotating hairline ring in `ink`, not a colored spinner); error (payment declined) → inline text under the field, `graphite` background flash via Framer Motion instead of a red border, see `animation.md`; success → replaces the whole panel with a confirmation/receipt view, ticket QR code rendered in pure black/white (QR codes are naturally monochrome — no treatment needed).

---

## 7. Calendar / Brand Page — `/c/[calendar-slug]`

**Purpose:** a host's or organization's public page listing all their events — what a user "follows"/subscribes to.

**Sections:**
- Banner + calendar name/logo, follow/subscribe button, follower count (`font-mono`)
- Upcoming events list (reuses `EventCard`, list layout not grid)
- Past events (collapsed/secondary section, lower visual weight — `graphite` text instead of `ink`)
- About block (host bio)

---

## 8. Auth (Sign in / Verify) — `/login`

**Purpose:** passwordless, email-code based (matches Luma's actual flow).

**Sections:**
- Minimal centered card on `paper` background, no nav bar — this page should feel like a quiet pause, not a busy screen
- Email input → "Send code" CTA
- Code verification step (6-digit input, `font-mono`, auto-advance between boxes)

**States:** code sent confirmation, expired code, resend cooldown timer (shown as a `font-mono` countdown, not a disabled-gray-out only).

---

## 9. My Events (Going / Hosting) — `/me/events`

**Purpose:** signed-in user's personal dashboard of events they're attending or hosting.

**Sections:**
- Toggle: Going / Hosting (segmented control, inverted-fill active state)
- Chronological list grouped by month, reusing `EventCard` in a compact row variant
- Quick actions per row (add to calendar, get directions, cancel RSVP)

---

## 10. Account Settings — `/me/settings`

**Purpose:** profile, notification preferences, connected calendars/integrations.

**Sections:**
- Profile (name, avatar upload — avatar preview stays in color; everything around it monochrome)
- Notification toggles (email/SMS granularity) — use simple switch components in the grayscale scale, `ink` when on, `mist` when off
- Connected accounts (Google/Apple calendar sync, Zoom)
- Danger zone (delete account) — set apart by a `border-t border-mist` and nothing else; do not use red text even here — use a confirmation modal with explicit typed-confirmation instead of relying on color to signal danger