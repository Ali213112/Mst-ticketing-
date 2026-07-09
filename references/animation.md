# Motion — GSAP + Framer Motion

Monochrome design leans harder on motion and space for personality since color is off the table — but the same restraint principle applies (see `frontend-design` SKILL.md: "spend your boldness in one place"). Pick a small number of signature moments; keep everything else quiet.

## Division of labor

- **Framer Motion** — component-level, React-state-driven motion: hover/tap states, layout transitions (`layoutId` for the segmented control and tab underline), enter/exit of modals and toasts, list item stagger on the event grid.
- **GSAP** — timeline-driven, scroll-linked, or non-React-state motion: the page-load hero sequence, scroll-triggered reveals down a long Event Detail page, the Discover page's featured-calendars marquee, complex multi-element choreography that would be awkward to express as component state.

Rule of thumb: if the animation is "this element's state changed, animate the transition" → Framer Motion. If it's "orchestrate several unrelated elements against scroll position or a fixed timeline" → GSAP (`useGSAP` hook + `ScrollTrigger` plugin, wrapped in a `useLayoutEffect`-safe pattern for Next.js SSR).

## Signature moments (pick one or two, not all)

1. **Event Detail load-in**: cover image scales from 1.02→1 with a slight blur-to-sharp over 400ms (GSAP), title and metadata fade/rise in a staggered timeline immediately after
2. **Discover grid**: cards stagger in on scroll via GSAP ScrollTrigger, 40ms stagger, `y: 16 → 0` + opacity
3. **Form section reveal**: Framer Motion `AnimatePresence` height auto-animate when a conditional block appears (e.g. ticketing fields when "Paid" is toggled)
4. **Check-in tap confirmation**: a single satisfying scale-pulse (Framer Motion `whileTap`) on the guest row when checked in — this is the one place a slightly more playful motion beat earns its keep, since it's a real-time, high-frequency host action

## Reduced motion

Every animation must respect `prefers-reduced-motion`. Concretely:
```ts
const shouldReduceMotion = useReducedMotion(); // framer-motion hook
// GSAP: gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => { /* instant, no tween */ });
```
When reduced motion is on: cross-fades only (150ms opacity), no transforms, no scroll-linked scrubbing. Never fully remove the transition — an instant cut without any fade reads as broken, not accessible.

## What to avoid

- No color-based motion cues (e.g. flashing red on error) — use a scale/shake or an `ink`-tinted flash of the field background instead, per the monochrome constraint in SKILL.md
- No skeleton-loading shimmer gradients — use a static opacity pulse (`0.5 ↔ 0.8`, 1.2s ease-in-out loop) on `mist` blocks instead; a moving gradient reads as a generic template loader
- No parallax for its own sake — reserve scroll-linked motion for the one or two signature moments above, not every section