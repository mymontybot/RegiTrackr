# RegiTrackr Design System
**Version 3.0 — Dark Professional Theme**
*Bloomberg Terminal meets Linear. Dense, precise, authoritative.*
Last updated: March 2026

---

## DESIGN PHILOSOPHY

This is a compliance monitoring tool for accounting professionals.
The visual language must communicate: precision, urgency, and trust.

**Dark — not gamer dark. Financial terminal dark.**
Deep navy-black backgrounds make urgency colors pop. Red alerts on a
dark surface are visceral in a way they never are on white. CPAs
scanning 40 clients at 7am need to see what needs attention
immediately — color contrast on dark does that better than anything.

**Dense — not sparse.**
Every pixel of screen real estate is data. No hero sections, no
illustrations, no decorative whitespace. CPAs work with spreadsheets
all day. They respect density.

**One glow. One gradient. Everything else flat.**
The AI Narrative card is the only element with a glow effect. This
makes it feel intelligent and special. Everything else is flat and
sharp. Restraint is what makes the one special thing land.

---

## COLOR SYSTEM

### Background Layers (darkest to lightest)

| Token | Hex | Tailwind / CSS | Usage |
|-------|-----|----------------|-------|
| bg-base | `#060B18` | `bg-[#060B18]` | Outermost app background |
| bg-sidebar | `#080C1A` | `bg-[#080C1A]` | Sidebar background |
| bg-surface | `#0D1526` | `bg-[#0D1526]` | Cards, modals, dropdowns |
| bg-surface-raised | `#111D35` | `bg-[#111D35]` | Hover states, selected rows, nested cards |
| bg-surface-high | `#162040` | `bg-[#162040]` | Active states, focused inputs |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| border-subtle | `#1A2640` | Default card borders, table dividers |
| border-default | `#1E2D4A` | Input borders, section dividers |
| border-strong | `#2A3F66` | Focused inputs, active elements |
| border-glow-blue | `rgba(37,99,235,0.4)` | Stat card top accent border |
| border-glow-violet | `rgba(124,58,237,0.6)` | AI Narrative card left border |

### Text Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|---------|-------|
| text-primary | `#F1F5F9` | `text-slate-100` | Headings, important values, client names |
| text-body | `#CBD5E1` | `text-slate-300` | Body copy, table data |
| text-secondary | `#94A3B8` | `text-slate-400` | Labels, metadata, column headers |
| text-muted | `#64748B` | `text-slate-500` | Timestamps, disabled, placeholder |
| text-disabled | `#334155` | `text-slate-700` | Disabled inputs |

### CTA Accent — Single color. One job.

| Token | Hex | Tailwind | Usage |
|-------|-----|---------|-------|
| accent-blue | `#3B82F6` | `blue-500` | ALL primary buttons, ALL links, focus rings |
| accent-blue-hover | `#2563EB` | `blue-600` | Button hover only |
| accent-blue-subtle | `rgba(59,130,246,0.1)` | — | Button ghost bg, selected row tint |

Nothing else in the UI uses blue except buttons and links.

### Tailwind Config — add to `tailwind.config.ts`

```ts
extend: {
  colors: {
    brand: {
      base:             '#060B18',
      sidebar:          '#080C1A',
      surface:          '#0D1526',
      'surface-raised': '#111D35',
      'surface-high':   '#162040',
      border:           '#1E2D4A',
      'border-subtle':  '#1A2640',
    }
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
  },
  boxShadow: {
    'glow-blue':   '0 0 24px rgba(37, 99, 235, 0.08)',
    'glow-violet': '0 0 32px rgba(124, 58, 237, 0.10)',
    'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  }
}
```

### Google Fonts — add to `app/layout.tsx`

```tsx
import { Inter } from 'next/font/google'
// JetBrains Mono via link tag in head:
// <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

---

## NEXUS BAND COLORS
**The most critical design decision. Sacred. Never deviate.**

On dark backgrounds these colors are vivid and visceral.
A CPA scanning the dashboard sees red and knows immediately.

| Band | Meaning | Text | Background | Border | Row highlight |
|------|---------|------|-----------|--------|---------------|
| Safe | < 70% | `#4ADE80` | `#052E16` | `#166534` | none |
| Warning | 70-89% | `#FDE047` | `#1A1400` | `#854D0E` | `#1A1400` |
| Urgent | 90-99% | `#FB923C` | `#1C0A00` | `#9A3412` | `#1C0A00` |
| Triggered | >= 100% unregistered | `#F87171` | `#1C0505` | `#991B1B` | `#1C0505` |
| Registered | Threshold crossed + registered | `#60A5FA` | `#0A1628` | `#1E40AF` | none |

### Tailwind classes (copy-paste exact)

```
Safe:       bg-[#052E16] text-[#4ADE80] border border-[#166534]
Warning:    bg-[#1A1400] text-[#FDE047] border border-[#854D0E]
Urgent:     bg-[#1C0A00] text-[#FB923C] border border-[#9A3412]
Triggered:  bg-[#1C0505] text-[#F87171] border border-[#991B1B]
Registered: bg-[#0A1628] text-[#60A5FA] border border-[#1E40AF]
```

Badge shape: `rounded-full px-2.5 py-0.5 text-xs font-medium font-mono`

---

## TYPOGRAPHY

**Rule: All numbers use font-mono. All text uses Inter.**

Revenue amounts, percentages, dates, counts, thresholds — everything
numeric is monospaced. This signals precision and makes columns
scannable like a financial terminal.

| Element | Classes |
|---------|---------|
| Page title (H1) | `text-2xl font-semibold tracking-tight text-slate-100` |
| Section heading (H2) | `text-base font-semibold text-slate-100` |
| Card heading | `text-sm font-semibold text-slate-200` |
| Body text | `text-sm text-slate-300` |
| Column header | `text-xs font-medium uppercase tracking-widest text-slate-500` |
| Revenue / amounts | `font-mono text-sm text-slate-100` |
| Percentages | `font-mono text-sm font-medium` (color = band color) |
| Dates | `font-mono text-xs text-slate-400` |
| Counts / stats | `font-mono text-2xl font-bold text-slate-100` |
| AI Narrative text | `text-sm leading-relaxed text-slate-300` |
| Helper text | `text-xs text-slate-500` |
| Error text | `text-xs text-red-400` |

---

## COMPONENT STANDARDS

### Standard Card
```
rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-card p-6
```
Card header separator:
```
border-b border-[#1A2640] pb-4 mb-4
```

### Stat Cards (dashboard summary bar)
```
rounded-xl border border-[#1E2D4A] bg-[#0D1526] shadow-card p-5
```
Add this inline style for the blue top accent:
```tsx
style={{ borderTop: '1px solid rgba(59,130,246,0.4)' }}
```
Value: `font-mono text-2xl font-bold text-slate-100`
Label: `text-xs font-medium uppercase tracking-widest text-slate-500 mt-1`
Alert count: use Triggered band color `text-[#F87171]`

The blue accent top border is what makes stat cards look like
terminal panels. Do not remove it.

### AI Narrative Card — the hero element
This is the only element in the entire app with a glow effect.
```tsx
<div
  className="rounded-xl p-6 border border-l-[3px]"
  style={{
    background: 'linear-gradient(135deg, #0D1526 0%, #130D2E 100%)',
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderLeftColor: '#7C3AED',
    boxShadow: '0 0 32px rgba(124, 58, 237, 0.08)'
  }}
>
```
Card header row: `flex items-center gap-2 mb-4`
AI badge: `rounded-full bg-violet-900/50 text-violet-300 border border-violet-700/50 text-xs font-medium px-2.5 py-0.5`
Sparkles icon: `w-3.5 h-3.5 text-violet-400`
Timestamp: `text-xs text-slate-500 ml-auto`
Regenerate button: ghost style, `text-slate-500 hover:text-slate-300`

Skeleton loading (4 lines inside the violet card):
```tsx
<div className="space-y-2">
  <Skeleton className="h-3 w-full bg-violet-900/30" />
  <Skeleton className="h-3 w-5/6 bg-violet-900/30" />
  <Skeleton className="h-3 w-4/6 bg-violet-900/30" />
  <Skeleton className="h-3 w-3/6 bg-violet-900/30" />
</div>
```
On failure: card is simply absent. Never show an error in this card.

### Tables
```
w-full text-sm border-collapse
```
Header row: `border-b border-[#1A2640]`
Header cell: `px-4 py-3 text-xs font-medium uppercase tracking-widest text-slate-500 text-left`
Data row: `border-b border-[#1A2640] hover:bg-[#111D35] transition-colors`
Data cell: `px-4 py-2.5 text-sm text-slate-300`
Even rows: `bg-[#0A1020]`
Selected row: `bg-[rgba(59,130,246,0.08)]`

### Buttons

Primary:
```
bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors
```

Secondary:
```
border border-[#2A3F66] hover:bg-[#111D35] text-slate-300 hover:text-slate-100 font-medium rounded-lg px-4 py-2 text-sm transition-colors
```

Ghost:
```
hover:bg-[#111D35] text-slate-400 hover:text-slate-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors
```

Destructive:
```
bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 hover:text-red-100 font-medium rounded-lg px-4 py-2 text-sm transition-colors
```

### Form Inputs
```
rounded-lg border border-[#1E2D4A] bg-[#060B18] px-3 py-2 text-sm text-slate-100
placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500
focus:border-blue-500 transition-colors
```
Label: `text-xs font-medium text-slate-400 mb-1.5 block`
Helper: `text-xs text-slate-600 mt-1`
Error: `text-xs text-red-400 mt-1`

### Sheet / Drawer (shadcn)
Override in component:
```
bg-[#0D1526] border-l border-[#1E2D4A]
```
Header: `border-b border-[#1A2640] pb-4 mb-6`
Title: `text-base font-semibold text-slate-100`
Description: `text-sm text-slate-400`

### Filing Status Chips

| Status | Classes |
|--------|---------|
| Upcoming | `bg-slate-800 text-slate-300 border border-slate-700` |
| Prepared | `bg-[#0A1628] text-[#60A5FA] border border-[#1E40AF]` |
| Filed | `bg-[#052E16] text-[#4ADE80] border border-[#166534]` |
| Confirmed | `bg-[#052E16] text-[#4ADE80] border border-[#166534] font-semibold` |
| Overdue | `bg-[#1C0505] text-[#F87171] border border-[#991B1B] font-semibold` |

### Workload Score Badges

| Score | Classes |
|-------|---------|
| 0-5 Light | `bg-[#052E16] text-[#4ADE80] border border-[#166534]` |
| 6-15 Moderate | `bg-[#1A1400] text-[#FDE047] border border-[#854D0E]` |
| 16+ Heavy | `bg-[#1C0505] text-[#F87171] border border-[#991B1B]` |

---

## NAVIGATION

### Sidebar
```
bg-[#080C1A] border-r border-[#1A2640] w-60 flex flex-col
```
Logo area: `px-5 py-5 border-b border-[#1A2640]`
Logo text: `text-base font-bold text-slate-100 tracking-tight`

Section label:
```
text-xs font-medium uppercase tracking-widest text-slate-600 px-4 mb-1 mt-6
```

Nav item default:
```
flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 rounded-lg mx-2
hover:bg-[#111D35] hover:text-slate-200 transition-colors
```

Nav item active:
```
flex items-center gap-3 px-[14px] py-2.5 text-sm text-slate-100 font-medium
rounded-lg mx-2 bg-[#111D35] border-l-2 border-l-blue-500
```

Bottom section: `mt-auto border-t border-[#1A2640] pt-4 pb-4`

### Top Bar
```
h-14 bg-[#0D1526] border-b border-[#1A2640] flex items-center px-6 gap-4
```
Page title: `text-base font-semibold text-slate-100`
Breadcrumb inactive: `text-sm text-slate-500 hover:text-slate-300`
Breadcrumb separator: `text-slate-600`

---

## DENSITY RULES

- Target viewport: 1440px wide — maximum data without horizontal scroll
- Table row height: compact — `py-2.5` not `py-4`
- Card padding: `p-6` desktop, `p-4` mobile
- Section gaps: `gap-6` between cards, `gap-4` within sections
- Never use hero images, illustrations, or decorative graphics
- Never use animations except `transition-colors` on hover
- Never add glow or shadow to anything except the AI Narrative card
- Paginate all tables at 25 rows
- Virtualize filing calendar list when > 200 rows

---

## ICONS

Use lucide-react exclusively. Already installed.

| Context | Icon |
|---------|------|
| Dashboard | `LayoutDashboard` |
| Clients | `Users` |
| Calendar | `Calendar` |
| Alerts | `Bell` |
| Staff/Team | `UserCheck` |
| Settings | `Settings` |
| Billing | `CreditCard` |
| Export PDF | `Download` |
| AI Narrative | `Sparkles` |
| Nexus trigger | `CalendarSearch` |
| Warning | `AlertTriangle` |
| Overdue | `AlertCircle` |
| Safe | `CheckCircle2` |
| Snooze | `Clock` |
| Refresh | `RefreshCw` |

Size: `w-4 h-4` in nav and tables, `w-3.5 h-3.5` in AI badge
Nav default color: `text-slate-500`
Nav active color: `text-slate-300`

---

## EMPTY STATES

```
flex flex-col items-center justify-center py-16 text-center
```
Icon: `w-8 h-8 text-slate-700 mb-3`
Heading: `text-sm font-medium text-slate-500`
Subtext: `text-xs text-slate-600 mt-1 max-w-xs`
CTA: primary button style, `mt-5`

---

## LOADING STATES

- Tables: Skeleton rows with `bg-[#111D35]`, same height as real rows
- AI card: 4-line skeleton with `bg-violet-900/20`
- Stat cards: skeleton on number only with `bg-[#111D35]`
- Never show full-page spinner — load sections independently

---

## ALERTS & BANNERS

Success toast: border-left green, dark bg
Error toast: border-left red, dark bg
Unassigned clients warning banner:
```
bg-[#1A1400] border border-[#854D0E] text-[#FDE047] rounded-lg px-4 py-3 text-sm flex items-center gap-2
```

---

## GLOBAL CSS — add to `app/globals.css`

```css
/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #060B18; }
::-webkit-scrollbar-thumb { background: #1E2D4A; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2A3F66; }

/* Selection */
::selection { background: rgba(59, 130, 246, 0.3); color: #F1F5F9; }

/* Focus visible */
:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }
:focus:not(:focus-visible) { outline: none; }
```

## SHADCN CSS VARIABLES — add to `app/globals.css`

These override every shadcn component automatically.
Sheet, Dialog, Select, Toast, Skeleton all go dark without
touching individual component files.

```css
:root {
  --background: 222 47% 5%;
  --foreground: 210 40% 95%;
  --card: 222 47% 8%;
  --card-foreground: 210 40% 95%;
  --popover: 222 47% 8%;
  --popover-foreground: 210 40% 95%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 5%;
  --secondary: 222 47% 12%;
  --secondary-foreground: 210 40% 80%;
  --muted: 222 47% 12%;
  --muted-foreground: 215 20% 55%;
  --accent: 222 47% 14%;
  --accent-foreground: 210 40% 90%;
  --destructive: 0 63% 40%;
  --destructive-foreground: 210 40% 95%;
  --border: 222 47% 18%;
  --input: 222 47% 10%;
  --ring: 217 91% 60%;
  --radius: 0.75rem;
}
```

---

## CURSOR PROMPT TEMPLATE

Use this for every screen conversion:

```
@docs/design-system.md

Convert [SCREEN NAME] to the dark professional theme.

Core values to apply:
- App bg: #060B18
- Card bg: #0D1526
- Card border: #1E2D4A
- Sidebar: #080C1A
- Text primary: #F1F5F9
- Text body: #CBD5E1
- Text secondary: #94A3B8

Apply:
1. Shadcn CSS variable overrides in globals.css (if not already done)
2. Stat cards: blue accent top border rgba(59,130,246,0.4) via inline style
3. AI Narrative card: violet gradient + glow per design system spec
4. Nexus band badges: dark-mode colors from design system
5. All numeric values: font-mono
6. Tables: compact py-2.5 rows, dark alternating bg-[#0A1020]
7. Sidebar: bg-[#080C1A] with blue left-border on active item
8. All inputs: bg-[#060B18] border-[#1E2D4A]

className and style changes only. No logic or data changes.
Show complete diff before applying.
```

---

## DO / DON'T

| Do | Don't |
|----|-------|
| Dark navy backgrounds everywhere | Light or white backgrounds in the app |
| font-mono for ALL numbers | Display any number in sans-serif |
| Exact nexus band colors from this doc | Use Tailwind default green/amber/red |
| Single blue-500 for buttons and links only | Use blue decoratively |
| Compact table rows py-2.5 | Spacious rows py-4 |
| Glow on AI Narrative card only | Add glow to any other element |
| transition-colors on interactive elements | Scale, translate, opacity animations |
| Load sections independently | Full-page loading spinners |
| Hide AI card completely on failure | Show error state in the AI card |
| Blue left-border on active nav item | Background-only active state |

---

*When in doubt: less color, more contrast, more mono.
This is a financial terminal, not a marketing page.*
