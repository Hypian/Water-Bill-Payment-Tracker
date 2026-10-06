# WaterBill Tracker — Design System Specification (v2.0)

## 1. Aesthetic Direction: "Calm Luxury" Utility Banking
A high-end financial feel inspired by Stripe, Wise, and Monzo. Restrained, trustworthy, and precise. Data (currency, readings, dates, meter IDs) are treated as hero elements using tabular numerals.

---

## 2. Color Palette & Tonal Scales (WCAG AA Verified)

All foreground/background combinations maintain contrast >= 4.5:1 (normal text) and >= 3:1 (large text/graphics).

### Light Mode
- **Canvas / Background**: `#f8fafc` (`var(--bg)`)
- **Card / Surface**: `#ffffff` (`var(--surface)`)
- **Card / Elevated Surface**: `#ffffff` (`var(--surface-raised)`)
- **Primary Brand (Deep Ocean)**:
  - 50: `#f0f7fb`
  - 500: `#0b6e99` (Brand action)
  - 700: `#084c6b` (Text-safe primary, 7.8:1 on white)
  - 900: `#042636`
- **Text & Neutral**:
  - Primary text: `#0f172a` (Slate 900, 15.2:1 on white)
  - Secondary / muted text: `#475569` (Slate 600, 5.6:1 on white)
  - Borders: `rgba(15, 23, 42, 0.08)` / `#e2e8f0`
- **Semantic Statuses (with Text + Icon + Colour)**:
  - **Paid / Success**:
    - Surface: `#ecfdf5` (Emerald 50)
    - Border: `#a7f3d0` (Emerald 200)
    - Text: `#065f46` (Emerald 800, 6.9:1 on emerald 50)
    - Icon: `bx-check-circle`
  - **Unpaid / Due Soon**:
    - Surface: `#fffbeb` (Amber 50)
    - Border: `#fde68a` (Amber 200)
    - Text: `#92400e` (Amber 800, 5.3:1 on amber 50)
    - Icon: `bx-time-five`
  - **Overdue / Danger**:
    - Surface: `#fef2f2` (Rose 50)
    - Border: `#fecaca` (Rose 200)
    - Text: `#991b1b` (Rose 800, 6.7:1 on rose 50)
    - Icon: `bx-error-circle`

### Dark Mode
- **Canvas / Background**: `#090d16`
- **Card / Surface**: `#111827`
- **Card / Elevated Surface**: `#1e293b`
- **Primary Brand**: `#38bdf8` (8.2:1 on dark surface)
- **Text & Neutral**:
  - Primary text: `#f8fafc`
  - Secondary text: `#94a3b8`
  - Borders: `rgba(255, 255, 255, 0.08)`

---

## 3. Typography

- **Self-Hosted Local WOFF2** (No CDN runtime):
  - **Display / Headers**: `Plus Jakarta Sans` (weights 600, 700)
  - **Body / Interactive**: `Inter` (weights 400, 500, 600)
  - **Fallback**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Tabular Numerals**: Every amount (`RWF`), date, reading (`m³`), and meter ID explicitly enforces `font-variant-numeric: tabular-nums lining-nums`.
- **Type Scale**:
  - Hero Balance Amount: `2.5rem` (`40px`), weight 700, letter-spacing `-0.03em`
  - Heading 1: `1.75rem` (`28px`), weight 700, letter-spacing `-0.02em`
  - Heading 2: `1.25rem` (`20px`), weight 600, letter-spacing `-0.01em`
  - Body: `0.9375rem` (`15px`), weight 400 & 500
  - Caption / Badges: `0.8125rem` (`13px`), weight 600

---

## 4. Spacing, Elevation & Motion Tokens

- **Radius**:
  - `sm`: 6px (tags, buttons small)
  - `md`: 10px (inputs, standard buttons)
  - `lg`: 16px (cards, modal containers)
  - `full`: 9999px (pills, badges)
- **Elevation / Shadows**:
  - `shadow-subtle`: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`
  - `shadow-card`: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`
  - `shadow-modal`: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
- **Transitions**:
  - Standard: `150ms cubic-bezier(0.4, 0, 0.2, 1)`
  - Modal / Sheet: `220ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Reduced Motion: Handled via `@media (prefers-reduced-motion: reduce)`

---

## 5. Icon System: Boxicons
Local self-hosted Boxicons v2.1.4:
- Icons provide immediate affordance and semantic context.
- Badges pair an explicit text label with a status icon (never color alone).
