# Design Tokens — Monochrome System

## Color scale

Six named values. Everything on every page derives from this scale — no exceptions, no one-off hex codes.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0A0A0A` | Primary text, primary CTA fill, active nav state |
| `charcoal` | `#242424` | Secondary CTA fill, hover state of `ink`, dark-mode surface |
| `graphite` | `#5C5C5C` | Secondary text, icons, disabled-but-visible states |
| `silver` | `#A6A6A6` | Placeholder text, dividers on dark surfaces, tertiary icons |
| `mist` | `#E4E4E4` | Borders, hairline rules, input backgrounds, hover surface on light |
| `paper` | `#FAFAF9` | Page background (off-white, not pure white — reads as printed stock, not a screen default) |

Dark mode is not a separate palette — it's the same scale read in reverse (`paper`→background becomes `ink`, `ink`→text becomes `paper`). Never introduce new grays for dark mode; invert the existing six.

A 7th value is allowed only for pure black/white extremes when needed for contrast-ratio compliance: `#000000` and `#FFFFFF`. Prefer `ink`/`paper` in all normal use.

## Tailwind config

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        charcoal: "#242424",
        graphite: "#5C5C5C",
        silver: "#A6A6A6",
        mist: "#E4E4E4",
        paper: "#FAFAF9",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        // sharp, editorial — not the default rounded-everything look
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
};
export default config;
```

## Typography

Three roles, deliberately paired — do not substitute generic system fonts:

- **Display** (`font-display`): a high-contrast serif for hero titles, event names on cards, section headers. Suggested: **Fraunces** or **Instrument Serif**. Used sparingly — display type is the one place weight/size does dramatic work.
- **Body** (`font-body`): a clean humanist sans for everything read at length — descriptions, form labels, dashboard copy. Suggested: **Inter** or **General Sans**.
- **Mono** (`font-mono`): for anything that is data — timestamps, ticket codes, guest counts, prices, RSVP deadlines. Suggested: **IBM Plex Mono** or **JetBrains Mono**. This is what gives the monochrome system its "instrument panel" precision instead of feeling flat.

### Type scale (Tailwind utility mapping)

| Use | Class | Font |
|---|---|---|
| Hero event title | `text-5xl md:text-6xl font-display font-normal tracking-tight` | display |
| Page section header | `text-2xl font-display` | display |
| Card title | `text-lg font-display` | display |
| Body copy | `text-base font-body leading-relaxed` | body |
| Form label | `text-sm font-body font-medium text-graphite` | body |
| Caption / metadata | `text-xs font-mono uppercase tracking-wide text-graphite` | mono |
| Ticket price / count / timestamp | `text-sm font-mono` | mono |

Load fonts via `next/font/google` (or local variable fonts) and expose as CSS variables `--font-display`, `--font-body`, `--font-mono` in the root layout so the Tailwind config above resolves correctly.

## Spacing & layout

- Base unit: 4px (Tailwind default) — don't override.
- Content max-width: `max-w-2xl` for reading-width pages (event detail description), `max-w-6xl` for grid/browse pages (discover, dashboard).
- Section rhythm: `py-16 md:py-24` between major page sections — generous whitespace is what makes monochrome feel premium instead of flat/cheap. Cramped spacing reads as a grayscale wireframe; generous spacing reads as an intentional editorial choice.

## Borders & elevation

No drop shadows for elevation — a monochrome system with soft gray shadows tends to look muddy. Use instead:
- **1px `border-mist`** to separate surfaces on `paper`
- **Inverted fill** (`bg-ink text-paper`) to indicate the "raised"/active state of a card or button, rather than a shadow
- If genuine elevation is needed (e.g. a modal over content), use a hard, high-contrast approach: `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` — one consistent value, not a shadow scale

## Iconography

Single-weight line icons (e.g. Lucide, which is already available in this environment's React setup) at a consistent stroke width. Do not mix filled and outlined icon styles. Icons are `graphite` by default, `ink` on hover/active — never colored per meaning (see monochrome constraint in SKILL.md for how to encode status without hue).