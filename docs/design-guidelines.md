# Proove — design guidelines

The vibe is a **warm, cosy, printed recipe book**: letterpress-style serif
type, warm-paper backgrounds, terracotta accents, restrained motion. Nothing
loud. When in doubt, make it quieter and warmer.

## Typography

Everything is set in **Michelangelus** (a serif with progressively "degraded"
letterpress cuts), falling back to Georgia / serif.

| Use | Family (CSS var) | Notes |
|---|---|---|
| Body text | `--font-redaction` (Michelangelus, 400/700) | Default everywhere |
| Section headings `h2`, `h3` | `--font-redaction-20` | Lightly degraded cut |
| Large titles `h1` | `--font-redaction-35` | More degraded, letterpress feel |

- The home title ("Proove") is intentionally large — `text-5xl tracking-tight`.
- Page titles `h1` are `text-3xl`; form titles `text-2xl`; section `h2` is
  `text-xl`.
- Weight stays at 400 for headings (the typeface carries the character — don't
  reach for bold to add emphasis).
- Numerals that line up in columns (quantities, countdowns) use `tabular-nums`.

## Colour

Defined as CSS variables in `globals.css`, exposed to Tailwind as
`bg-*/text-*/border-*` tokens. **Always use the tokens**, never hard-coded hex,
so light/dark and future theming stay consistent.

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `background` | `#f5efe6` | `#1b1814` | Warm paper / page |
| `surface` | `#fbf7f0` | `#232019` | Cards, inputs, popovers |
| `foreground` | `#322c25` | `#ece4d6` | Warm ink / primary text |
| `muted` | `#857a6d` | `#9a8e7d` | Secondary text, icons |
| `border` | `#e3d9c8` | `#383125` | Hairlines, dividers |
| `accent` | `#b3622f` | `#d68a52` | Terracotta — primary actions, links, "next" |
| `accent-fg` | `#fbf7f0` | `#1b1814` | Text/icon on accent |
| `danger` | `#b3261e` | `#e06a60` | Destructive actions |
| `danger-fg` | `#ffffff` | `#1b1814` | Text on danger |

- Dark mode is driven by `prefers-color-scheme` (no manual toggle).
- The browser theme-color is `#faf7f2` (light) / `#1a1714` (dark).
- Accent is used sparingly — a single warm highlight, not a fill-everything
  brand colour. Tints like `bg-accent/10` are good for soft emphasis
  (e.g. emoji placeholders).

## Shape, spacing, layout

- **Radii:** `rounded-lg` for inputs/buttons, `rounded-xl` for cards,
  `rounded-2xl` for dialogs, `rounded-full` for icon buttons and pills.
- **Page shell:** `max-w-5xl mx-auto p-5`. Forms are `max-w-xl mx-auto`.
- **Rhythm:** vertical stacks use `flex flex-col` with `gap-5`/`gap-6`. Group
  related controls tighter (`gap-2`/`gap-3`).
- **Borders over shadows.** Hairline `border` is the default separator; shadows
  are reserved for floating layers (popovers, dialogs, toasts).

## Components & patterns

Reusable classes live in `globals.css` under `@layer components`:

- `.btn-primary` — accent fill, primary action.
- `.btn-outline` — bordered surface.
- `.btn-ghost` — text-only, muted (cancel / low-emphasis).
- `.btn-danger` — destructive.
- `.icon-btn` — round 36px bordered surface button for icon-only actions.

Conventions:

- **Cards** (`bg-surface border rounded-xl`) link to a detail page; a small
  uppercase **pill** sits in the top-right corner (`RECIPE` / `MEAL`), both in
  the same muted bordered style.
- **Pills/badges:** `rounded-full border px-1.5 py-0.5 text-[10px] uppercase
  tracking-wide text-muted`.
- **Inputs:** `border rounded-lg p-2`, `bg-surface`. Labels are
  `text-sm font-medium text-muted` above the field.
- **Image-less items** show a warm food emoji on a `bg-accent/10` square (the
  item's chosen or randomly-assigned emoji — see `src/lib/emoji.ts`).
- **Icons:** the inline set in `src/components/icons.tsx` — stroked,
  `currentColor`, 1.6 weight, 24×24 viewBox. Match that style for new icons.
- **Confirmations** use `ConfirmDialog`; transient feedback uses the `Toast`
  provider (`useToast().notify`).

## Motion

Restrained and physical — things press, they don't bounce around.

- Tap feedback: `active:scale-[0.98]` (buttons) / `active:scale-[0.99]` (cards)
  / `active:scale-[0.95]` (icon buttons), with `transition`.
- Celebration (`Celebration.tsx`): confetti + `pop-in` — reserved for genuine
  "you finished" moments only.
- The live "next" timeline node uses a gentle `node-pulse`.
- Honour the spirit of `prefers-reduced-motion` for anything new and animated.

## Voice

Short, warm, plain. "Not cooked yet", "All done — enjoy the meal", "Add some
tasks". Sentence case. No exclamation spam (the confetti can have the one 🎉).
