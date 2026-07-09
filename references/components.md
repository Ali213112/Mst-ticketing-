# Shared Components

Build these once, reuse across every page in `pages.md`. Consistency here matters more than novelty — a host and a guest should feel like they're in the same product everywhere.

## Navbar
- `paper` background, `border-b border-mist`, sticky
- Logo (wordmark in `font-display`, set in `ink`) + search input (pill-shaped `mist` fill, no border) + "Create Event" button (outline, `border-ink`) + avatar/sign-in

## Buttons
Three variants, all grayscale:
- **Primary**: `bg-ink text-paper`, hover `bg-charcoal`
- **Secondary**: `border border-ink text-ink bg-transparent`, hover `bg-mist`
- **Ghost**: `text-graphite`, hover `text-ink` (no background change)

No size beyond `sm` (32px height) / `md` (40px) / `lg` (48px). Disabled state = `bg-mist text-silver`, cursor not-allowed — not a lower-opacity version of the same color, a genuinely distinct flat state.

## EventCard
- Cover image (4:3 or 16:9, consistent per grid), `border border-mist`
- Date badge overlaid top-left on the image — small `font-mono` chip, `bg-paper/90` backdrop-blur, e.g. "JUL 12"
- Title (`font-display text-lg`, 2-line clamp)
- Metadata row: time (`font-mono text-xs text-graphite`) + location/format icon + attendee count
- Hover: whole card lifts via a 1px border-color shift from `mist` to `ink` (not a shadow) + Framer Motion `scale: 1.01`

Compact row variant (used in My Events, Calendar page lists): thumbnail + title + date, horizontal, no image dominance.

## Status indicator (replaces colored badges)
Since color can't encode status, use this consistent pattern across the product:
| Status | Treatment |
|---|---|
| Live/Open | Solid `ink` filled pill, `paper` text |
| Draft | Dashed `border-graphite`, `graphite` text, no fill |
| Sold out / Full | Diagonal-hatch pattern fill (SVG pattern, `mist`/`ink` hatch), `ink` text |
| Cancelled | Strikethrough text + hatch pattern, `graphite` text |
| Waitlisted | Dotted `border-silver`, `silver` text |

## Segmented control
Used for Going/Hosting toggle, event type, visibility. `bg-mist` track, active segment is `bg-ink text-paper` sliding via Framer Motion `layoutId` shared-element transition.

## Empty state
Centered, `max-w-sm`, one line of `font-display` copy stating what's missing, one line of `font-body text-graphite` explaining why/what to do, one CTA. No illustration — an empty state in this system is quiet, not decorated. If an icon is used at all, a single large outline icon in `silver` is enough.

## Data table row (Guest List)
- `border-b border-mist` per row, no zebra striping (striping tends to fight the flat grayscale system — rely on the border rule alone)
- Selected row: `bg-mist`
- Sort arrows in header: simple up/down carets, `graphite`, `ink` on the active sort column

## Toast / inline confirmation
- Slides in from bottom, `bg-ink text-paper`, `font-body text-sm`, auto-dismiss 4s, single-line, optional single action link in `underline`
- Never a colored success/error toast — differentiate by icon (check vs. exclamation) only, both rendered in `paper` on the same `ink` fill

## Avatar stack (guest strip)
- Overlapping circular avatars, `border-2 border-paper` between them for separation
- Grayscale filter applied in stack/grid contexts; full color on individual hover or in the Guest List table (see monochrome constraint's photography exception)