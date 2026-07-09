# Event Creation / Edit Form

The highest-complexity page in the system. This spec covers field structure, layout decision, validation, and a React/TS skeleton.

## Layout decision: single scrolling page, not a wizard

Luma's own create flow is a single page with expandable sections, not a multi-step wizard — it lets hosts jump around and see everything at once, and it's instant (event exists as a draft from the first keystroke). Follow that model: one page, sectioned with clear `font-display` headers and generous `py-16` rhythm, autosaving as a draft. Reserve a step-based wizard only if the user explicitly wants a more guided first-time-host experience.

## Sections & fields

### 1. Basic Info
- Event title — large inline-editable `font-display` text, placeholder "Event name"
- Description — rich text editor (bold/italic/link/list), `font-body`
- Event type — in-person / virtual / hybrid (segmented control)

### 2. Date & Time
- Start date/time, end date/time — paired date + time pickers, values rendered in `font-mono` once set
- Timezone — auto-detected, editable dropdown
- Recurring toggle → reveals frequency (weekly/monthly), end condition (never/on date/after N occurrences) — this is the "event brand"/series pattern noted in the ClawX-style GTM thinking around recurring/time-boxed events, worth keeping flexible

### 3. Location
- If in-person: address autocomplete (map preview in grayscale filter, per `pages.md`), "hide exact location until approved" toggle
- If virtual: link input, or "auto-generate Zoom link" toggle
- If hybrid: both blocks shown

### 4. Cover Image
- Upload dropzone + a gallery of preset cover options — **the preset gallery is entirely grayscale/duotone patterns** (geometric, halftone, line-art), never the colorful preset packs Luma itself ships, to stay inside the monochrome constraint. User-uploaded photos remain full color per the SKILL.md exception.

### 5. Ticketing
- Free / Paid toggle
- If paid: ticket tiers (name, price, quantity cap) — repeatable row group, "Add ticket type" action
- Capacity — overall cap + waitlist toggle
- Currency selector (if relevant to the product)

### 6. Registration Questions
- Default fields: name, email (locked, always present)
- Custom questions — repeatable field builder: question text, type (short text / multiple choice / checkbox), required toggle
- Approval mode toggle: auto-approve vs. host must approve each registrant

### 7. Theme
- Since the platform is monochrome-only, this section is deliberately small: pick a **value variant** (light / dark / high-contrast) rather than a color picker. This is the one place the constraint should be made visible and explicit to the host, e.g. a short line: "Themes are grayscale by design — pick a value, not a color."

### 8. Review / Publish
- Live preview pane (renders the actual Event Detail page component in an iframe/panel) so the host sees exactly what guests will see
- Visibility: Public / Private / Member-only (segmented control)
- Publish CTA — inverted fill (`bg-ink text-paper`), the one high-emphasis button on the page

## Validation

- Inline, on-blur — never a summary error list at the top. Error copy sits directly under the field, in `font-body text-sm`, distinguished from normal helper text by weight (`font-medium`) and an inline icon, not color (see monochrome constraint).
- Required-but-empty fields block only the Publish action, not intermediate saving — the draft always saves as-is.

## React/TS skeleton

```tsx
// types.ts
type TicketTier = { id: string; name: string; price: number; quantity: number };
type RegistrationQuestion = {
  id: string;
  label: string;
  type: "short_text" | "multiple_choice" | "checkbox";
  required: boolean;
};

type EventFormValues = {
  title: string;
  description: string;
  eventType: "in_person" | "virtual" | "hybrid";
  startsAt: string;
  endsAt: string;
  timezone: string;
  location?: { address: string; hideUntilApproved: boolean };
  virtualLink?: string;
  coverImageUrl?: string;
  isPaid: boolean;
  ticketTiers: TicketTier[];
  capacity?: number;
  waitlistEnabled: boolean;
  questions: RegistrationQuestion[];
  approvalMode: "auto" | "manual";
  themeVariant: "light" | "dark" | "high_contrast";
  visibility: "public" | "private" | "member_only";
};
```

```tsx
// EventForm.tsx (Next.js App Router, client component)
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema } from "./schema";
import type { EventFormValues } from "./types";

export function EventForm({ defaultValues }: { defaultValues?: Partial<EventFormValues> }) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  // Autosave draft on change, debounced — Luma-style "always a draft" behavior
  // useDebouncedEffect(() => saveDraft(form.getValues()), [form.watch()], 800);

  return (
    <form className="mx-auto max-w-2xl space-y-24 py-16">
      <FormSection title="Basic info">{/* title, description, event type */}</FormSection>
      <FormSection title="Date & time">{/* ... */}</FormSection>
      <FormSection title="Location">{/* ... */}</FormSection>
      <FormSection title="Cover image">{/* ... */}</FormSection>
      <FormSection title="Ticketing">{/* ... */}</FormSection>
      <FormSection title="Registration questions">{/* ... */}</FormSection>
      <FormSection title="Theme">{/* value-variant picker, not color picker */}</FormSection>
      <PublishBar />
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-mist pt-12 first:border-t-0 first:pt-0">
      <h2 className="mb-6 font-display text-2xl text-ink">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
```

Use `zod` for `eventFormSchema` and `react-hook-form` for state — both are standard in this stack and keep validation declarative next to the type definitions above.