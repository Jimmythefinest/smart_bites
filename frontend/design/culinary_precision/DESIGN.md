---
name: Culinary Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#494bd6'
  on-tertiary: '#ffffff'
  tertiary-container: '#9699ff'
  on-tertiary-container: '#1d17b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for operational excellence in the high-stakes environment of professional food management. It merges the technical precision of developer tools with the vibrant, sensory appeal of the culinary industry. The aesthetic is rooted in **Corporate / Modern** principles, prioritizing utility and speed, while utilizing **Glassmorphism** for non-intrusive overlays and state changes.

The target audience consists of restaurateurs, inventory managers, and enterprise food operators who require a "heads-up display" of their business. The emotional response is one of controlled efficiency—the UI should feel like a sharp chef’s knife: professional, reliable, and perfectly balanced. High-density layouts ensure information is visible at a glance, reducing cognitive load during peak operational hours.

## Colors

The palette is anchored by **Emerald Green**, representing growth, freshness, and "ready" states. **Sunset Orange** serves as the primary action and appetite-stimulant color, used for alerts, high-energy interactions, and warnings. **Deep Slate** provides the structural foundation for text and navigation, ensuring high contrast and readability.

In **Light Mode**, surfaces use soft grays (`#F1F5F9`) to define boundaries without harsh lines. In **Dark Mode**, the system shifts to a deep navy-black aesthetic, utilizing subtle tonal shifts to indicate elevation rather than true black, maintaining depth and reducing eye strain during late-night inventory audits.

## Typography

This design system utilizes **Inter** for all functional UI elements to leverage its exceptional legibility and systematic feel, reminiscent of high-performance SaaS tools. **Hanken Grotesk** is reserved for headlines and display roles to provide a touch of modern sophistication and "tech-forward" personality.

Hierarchy is established through tight tracking on headlines and generous line heights for body copy to ensure readability in high-density data environments. Labels and small data points use a slightly heavier weight (Medium or Semi-bold) to ensure they remain distinct when viewed on mobile devices or tablets in kitchen environments.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 8px baseline. This ensures that every element—from the smallest icon to the largest menu card—scales predictably.

- **Desktop (1440px+):** A 12-column grid with 40px side margins and 20px gutters. Content is organized into "Panels" that can be pinned or collapsed.
- **Tablet (768px - 1439px):** An 8-column grid. Sidebars collapse into a slim icon-only bar to maximize canvas space for Kanban boards and inventory lists.
- **Mobile (<767px):** A 4-column grid with 16px margins. High-density cards stack vertically, and complex tables transition into expandable list items.

Spacing between related items (e.g., input and label) uses `sm` (8px), while spacing between unrelated sections uses `xl` (32px) to maintain clarity.

## Elevation & Depth

Hierarchy is communicated through **Tonal Layers** and **Ambient Shadows**. Surfaces do not rely on heavy drop shadows; instead, they use a 1px border (`#E2E8F0` in light mode, `#1E293B` in dark mode) to define edges.

1.  **Level 0 (Base):** The canvas background.
2.  **Level 1 (Cards):** Slightly elevated with a 2px blur, 4% opacity shadow. This is the primary surface for inventory and menu items.
3.  **Level 2 (Modals/Popovers):** Utilizes **Glassmorphism**. A background blur of 12px and a semi-transparent fill (e.g., `rgba(255, 255, 255, 0.8)`) creates a sense of focused overlay without losing the context of the dashboard beneath.
4.  **Floating Action Buttons:** High-contrast shadows (10% opacity) to denote immediate interactivity.

## Shapes

The shape language is primarily **Rounded**, favoring a soft but professional geometry. 

- **Standard Elements (Buttons, Inputs):** 8px (`rounded-md`).
- **Containers (Cards, Kanban columns):** 16px (`rounded-lg`) to create a distinct "app-like" feel that softens the high-density data.
- **Large Sections (Modals, Feature blocks):** 24px (`rounded-xl`).
- **Status Pills:** Fully rounded (`pill`) to distinguish them from interactive buttons.

This consistent rounding compensates for the "coldness" of data-heavy screens, making the platform feel more approachable and modern.

## Components

### KPI Cards
High-density summary blocks featuring a large `headline-lg` value, a `label-md` title, and a small sparkline or percentage indicator using the Primary (Emerald) or Secondary (Sunset) colors to show trend direction.

### Visual Inventory Grids
Cards with a fixed 1:1 aspect ratio image at the top, followed by a tight list of metadata (Stock levels, Unit price). 16px corner radius on the card, with the image masked to the top corners.

### Kanban Boards
Low-contrast background columns (`#F1F5F9`) with 12px padding. Tasks are white cards with subtle 1px borders. Interaction handles appear on hover to maintain a clean aesthetic.

### Input Fields
Minimalist design: a 1px border that transforms into a 2px Primary (Emerald) border on focus. Labels are positioned above the field in `label-md` typography.

### Buttons
- **Primary:** Solid Emerald or Sunset background with white text.
- **Secondary:** Transparent background with a 1px border.
- **Ghost:** No border or background until hover, used for utility actions in dense lists.

### Menu Cards
Image-heavy components utilizing a gradient overlay at the bottom for text legibility. Prices are highlighted using the `secondary_color_hex` (Sunset) to draw the eye to revenue-critical data.