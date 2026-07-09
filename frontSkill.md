---
name: mono-event-frontend
description: Design and build a monochromatic, Luma-inspired event/RSVP platform frontend in Next.js (TypeScript) + Tailwind CSS + GSAP + Framer Motion. Use this whenever the user wants to build, redesign, or extend a Luma-like event site — event discovery pages, event detail/RSVP pages, the event creation form, host dashboards, guest lists, ticketing/checkout, or calendar pages — with a strict grayscale/monochrome visual identity (no color accents). Trigger on mentions of "Luma clone", "event platform frontend", "RSVP page", "event creation form", "monochrome UI", or requests to design pages for an event/ticketing product.
---

# Monochrome Event Frontend

A reference skill for building a Luma-style event & RSVP platform frontend with a strict **monochromatic (grayscale) visual identity** — no hue accents, all contrast and hierarchy done through value, weight, and space. Stack: **Next.js (App Router, TypeScript) + Tailwind CSS + GSAP + Framer Motion**.

This skill is a page-and-system inventory, not a copy-paste template. Use it to scope which pages exist, what each page needs, and how to build it with the given stack — then apply `/mnt/skills/public/frontend-design/SKILL.md` principles for the actual visual execution (that skill governs *how* to make it distinctive; this skill governs *what* to build and the monochrome constraint).

## How to use this skill

1. **Read `references/design-tokens.md` first, always.** It defines the grayscale palette, type scale, spacing, and the Tailwind config. Every page and component derives from these tokens — never introduce a hue.
2. **Read `references/pages.md`** to see the full page inventory and pick which page(s) the current task touches. Each page entry lists its sections, states (empty/loading/error), and the components it pulls in.
3. If the task is specifically the **event creation form**, also read `references/event-form.md` — it's the most complex page (multi-section form, validation, draft state) and gets its own deep-dive.
4. If the task involves **any component reuse** (cards, nav, buttons, badges, list rows), check `references/components.md` before inventing a new one — consistency across pages matters more than novelty per-component.
5. If the task involves **motion** (page transitions, hover states, scroll reveals, form step transitions), read `references/animation.md` for the GSAP vs. Framer Motion split and the reduced-motion rule.

## The monochrome constraint

This is the one hard rule that overrides normal frontend-design freedom: **no color hue, anywhere, ever** — not in buttons, not in status badges, not in charts, not in avatars. All of the following are achieved with grayscale value alone:

- **Hierarchy** → font weight + size + the ink/graphite/silver value scale (never color-coding importance)
- **State** (success/error/warning/info) → shape, icon, and text, never a green/red/amber pill. A cancelled event badge and a live event badge differ in border style, fill, and icon — not hue. Use pattern/texture (diagonal hatch, dotted border) as a second channel when a status genuinely needs to be scannable at a glance.
- **Selection/focus** → invert (dark-on-light becomes light-on-dark) or add a ring, not a colored highlight
- **Data viz** (e.g. RSVP trends, ticket sales) → a grayscale value ramp, differentiated further by pattern (solid / hatched / dotted) if more than 2 series
- Photography and user-uploaded cover images are the one place actual color can appear (a person's event photo). Treat it like a printed photo on grayscale newsprint: full color image, monochrome chrome around it. Optionally offer a "desaturate on hover/grid view" treatment to keep list views cohesive.

If a task seems to need color to work (e.g. "make the error red so it's noticeable") — solve it with weight, size, icon, and motion instead. This is a deliberate constraint, not a placeholder for "add color later."

## Page inventory (summary — full detail in references/pages.md)

| # | Page | Purpose |
|---|------|---------|
| 1 | Discover / Home | Browse & search public events, featured calendars |
| 2 | Event Detail (public RSVP page) | The page a guest lands on to register/buy a ticket |
| 3 | Create/Edit Event | Host-facing multi-section form |
| 4 | Event Management Dashboard | Post-creation hub: guests, blasts, insights, settings |
| 5 | Guest List & Check-in | Table of registrants + live check-in mode |
| 6 | Checkout / Ticket Purchase | Payment flow for paid events |
| 7 | Calendar / Brand Page | A host's public, subscribable calendar of events |
| 8 | Auth (Sign in / Verify) | Email-code based passwordless auth |
| 9 | My Events (Going / Hosting) | Signed-in user's personal event list |
| 10 | Account Settings | Profile, notification prefs, connected calendars |

## Build order recommendation

If building from scratch, this order minimizes rework:
1. Design tokens + Tailwind config (foundation)
2. Shared components (nav, buttons, event card, badges, empty states)
3. Discover/Home + Event Detail (public-facing, no auth needed — validates the visual identity fastest)
4. Create/Edit Event (the highest-complexity form)
5. Dashboard + Guest List (host tooling)
6. Checkout, Calendar page, Auth, Settings (remaining surfaces, mostly compositions of components already built)

## Non-goals

This skill does not cover backend/API design, payment processor integration logic, or database schema — only the frontend surface, componentry, and motion. If the user needs those, treat it as a separate task.