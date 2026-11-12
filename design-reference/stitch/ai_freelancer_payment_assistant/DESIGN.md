---
name: AI Freelancer Payment Assistant
colors:
  surface: '#0e1321'
  surface-dim: '#0e1321'
  surface-bright: '#343948'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2a'
  surface-container: '#1a1f2e'
  surface-container-high: '#252a39'
  surface-container-highest: '#303444'
  on-surface: '#dee2f6'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dee2f6'
  inverse-on-surface: '#2b303f'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dce6'
  primary: '#e0fdff'
  on-primary: '#00373a'
  primary-container: '#00f2fe'
  on-primary-container: '#006a70'
  inverse-primary: '#00696f'
  secondary: '#9bcbff'
  on-secondary: '#003256'
  secondary-container: '#3196e6'
  on-secondary-container: '#002c4b'
  tertiary: '#ecfaff'
  on-tertiary: '#003640'
  tertiary-container: '#91e8ff'
  on-tertiary-container: '#00697c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ff6ff'
  primary-fixed-dim: '#00dce6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#d0e4ff'
  secondary-fixed-dim: '#9bcbff'
  on-secondary-fixed: '#001d34'
  on-secondary-fixed-variant: '#004a7a'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0e1321'
  on-background: '#dee2f6'
  surface-variant: '#303444'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-num:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system projects institutional precision, algorithmic trust, and high-velocity workflow execution. Built for autonomous professionals and modern digital contractors managing cross-border financial flows, it blends the dense utility of Linear with the uncompromising polish of modern corporate fintech. 

The aesthetic is anchored in an uncompromising deep midnight atmosphere, punctured by purposeful electric teal radiance. Interactions feel instantaneous, computational, and restrained. Surfaces are defined by structural 1px low-contrast boundaries rather than heavy skeuomorphic drops. Ambient illumination indicates real-time state changes, cash-flow automation, and autonomous payment resolution.

## Colors

The palette operates on calibrated contrast tiers built specifically for sustained focus in high-density data environments:

- **Base Surfaces**: The foundational canvas starts at `#0a0f1d` (Canvas Base), graduating to `#0d1527` (Panel Surface) and `#131f37` (Interactive / Elevated Card).
- **Primary Energy**: `#00F2FE` is the primary accent token. It is reserved for active transactional triggers, system alerts, live machine-learning signals, and primary CTAs. It should never be used on broad background fills; it serves as a crisp beacon.
- **Secondary & Tertiary**: `#4FACFE` and `#06B6D4` support multi-series analytical charting, data gradients, and secondary processing indicators.
- **System States**:
  - Positive / Paid / Low Risk: `#10B981` (Crisp Emerald)
  - Processing / Pending / Medium Risk: `#F59E0B` (Warm Amber)
  - Critical / Overdue / High Risk: `#EF4444` (Vivid Crimson)
- **Structural Lines**: Borders and dividers strictly use `rgba(255, 255, 255, 0.08)` for inactive structures, stepping up to `rgba(0, 242, 254, 0.25)` on active focus or hover states.

## Typography

Typography prioritizes tabular clarity, dense data consumption, and neutral legibility. Inter is applied across all hierarchy levels to create a tight, technical interface rhythm.

- **Tabular Figures**: All numerical figures, currency valuations, invoice identifiers, and ledger outputs must enforce `font-feature-settings: "tnum" 1, "cv05" 1` to guarantee precise vertical column alignment.
- **Negative Letter Spacing**: All headlines from `headline-sm` to `headline-xl` feature compressed tracking (-0.01em to -0.025em) to enforce a disciplined editorial tone.
- **Micro Labels**: Sub-labels, risk categorization tags, and table header indicators must render in uppercase using `label-sm` or `label-md` with positive letter tracking for legibility against dark surfaces.

## Layout & Spacing

The layout model is governed by an 8pt architectural rhythm with half-step (4px) micro adjustments for compact toolbars, stat badges, and complex tabular rows.

- **Canvas Architecture**: Desktop viewports deploy a fluid 12-column structure constrained by a 1440px maximum content shell. Tablet screens collapse to an 8-column layout, while mobile viewports use a 4-column system.
- **Density Profile**: Data tables, live invoice streams, and command rows follow a dense height regime (32px to 40px row heights), maximizing vertical utility without visual crowding.
- **Spatial Hierarchy**: 
  - `space-xs` (4px) and `space-sm` (8px) govern icon-to-label couplings, inline chip gaps, and badge interior paddings.
  - `space-md` (16px) defines interior component padding for cards, metrics, and dropdown menus.
  - `space-lg` (24px) and `space-xl` (32px) partition distinct functional workspaces, analytical groups, and invoice lifecycle timelines.

## Elevation & Depth

Visual hierarchy does not rely on heavy drop shadows. Depth is achieved through **tonal surface stacking** combined with **subtle light transmission**:

- **Tonal Layers**:
  - `Level 0 (Canvas)`: `#0a0f1d` — Application canvas foundation.
  - `Level 1 (Sub-Panels / Sidebars)`: `#0d1527` — Structural navigation and grouped workspaces.
  - `Level 2 (Cards / Tables / Stat Blocks)`: `#131f37` with 1px border `rgba(255, 255, 255, 0.08)`.
  - `Level 3 (Overlays / Modals / Command Bars)`: `#16233f` backed by `backdrop-filter: blur(16px)` and illuminated with an inner stroke `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.
- **Radiant Accents & Micro Glows**:
  - Active elements or hovered payment nodes utilize a controlled ambient neon aura: `box-shadow: 0 0 20px -4px rgba(0, 242, 254, 0.25)`.
  - Overdue risk indicators leverage an amber or crimson aura: `box-shadow: 0 0 16px -4px rgba(239, 68, 68, 0.3)`.

## Shapes

The design system enforces a disciplined, geometric corner radius (Scale 1: Soft). This provides an engineered, software-grade aesthetic reminiscent of developer-centric tools.

- **Standard Elements (4px / 0.25rem)**: Inputs, badges, small buttons, status indicators, and inline dropdown items.
- **Structural Containers (8px / 0.5rem - `rounded-lg`)**: Metric cards, transaction tables, modal surfaces, and data visualizers.
- **Surface Nesting Principle**: When a nested component sits inside a parent card, the child radius is strictly equal to or smaller than the parent's inner curve, preventing optical distortion across borders.

## Components

### Buttons & Interactive Controls
- **Primary Action**: Solid `#00F2FE` background with `#0a0f1d` text, `fontWeight: 600`. Hover state triggers a subtle luminosity shift (`#4FACFE`) paired with an ambient cyan glow.
- **Secondary Action**: Background `#131f37`, 1px border `rgba(255, 255, 255, 0.08)`, text `#E2E8F0`. On hover, the border transitions to `rgba(0, 242, 254, 0.4)` and text elevates to `#FFFFFF`.
- **Destructive / High Risk**: Background `rgba(239, 68, 68, 0.1)`, 1px border `rgba(239, 68, 68, 0.3)`, text `#EF4444`.

### Micro-Stat Badges & Status Chips
- Pill or soft-rect styling (`roundedness: 1`), padding `2px 8px`, `label-sm` font token.
- **Paid / Low Risk**: Emerald tint (`rgba(16, 185, 129, 0.1)` fill, `rgba(16, 185, 129, 0.3)` border, `#10B981` text) accompanied by a 6px static dot.
- **Pending / Medium Risk**: Amber tint (`rgba(245, 158, 11, 0.1)` fill, `rgba(245, 158, 11, 0.3)` border, `#F59E0B` text).
- **Overdue / AI Alert**: Crimson tint (`rgba(239, 68, 68, 0.12)` fill, `rgba(239, 68, 68, 0.4)` border, `#EF4444` text) with an optional subtle pulse animation for high-urgency recovery notifications.

### Data Tables & Transaction Streams
- Clean horizontal borders (`rgba(255, 255, 255, 0.06)`). No vertical dividing lines.
- Hovering a row applies `#131f37` surface tint and an accent bar indicator on the far left edge (`#00F2FE`, 2px wide).
- Numeric data columns utilize `Inter` with tabular figures right-aligned for instant visual aggregation.

### High-Contrast Data Visualization Cards
- Built on `#0d1527` panels with a top hairline highlight (`rgba(255, 255, 255, 0.1)`).
- Area charts implement subtle vertical gradients shifting from `rgba(0, 242, 254, 0.2)` down to transparent `#0a0f1d`.
- Grid lines in charts strictly render at `rgba(255, 255, 255, 0.04)` to prevent competing with financial trend paths.

### Input Fields & Search Bars
- Background `#0a0f1d`, border `rgba(255, 255, 255, 0.1)`, text `#F8FAFC`.
- Focused state eliminates conventional browser halos, replacing them with a crisp 1px stroke of `#00F2FE` and a micro-glow of `0 0 0 3px rgba(0, 242, 254, 0.12)`.