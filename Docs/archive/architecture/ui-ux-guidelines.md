---
title: "UI/UX Documentation for Sightline.ai"
description: "Comprehensive design system specifications, component guidelines, and user experience standards"
type: "guide"
canonical_url: "/docs/architecture/ui-ux-guidelines"
version: "1.0"
last_updated: "2025-01-09"
audience: ["designers", "frontend-developers", "ux-engineers"]
complexity: "advanced"
tags: ["design-system", "ui", "ux", "components", "guidelines", "accessibility", "responsive"]
status: "active"
estimated_time: "30 minutes read"
related_docs: ["/architecture", "/docs/development/testing-strategy", "/contributing"]
design_categories: ["brand-identity", "color-palette", "typography", "components", "accessibility"]
---

# UI/UX Documentation for Sightline.ai

## Design System Specifications

### Brand Identity

- **Vision:** "Speed-learn anything on YouTube"
- **Voice:** Professional, efficient, intelligent
- **Personality:** Trustworthy, innovative, user-focused

### Color Palette

#### Primary Colors

```css
--primary-600: #2563eb;    /* Blue - Main brand color */
--primary-700: #1d4ed8;    /* Blue - Hover states */
--primary-800: #1e40af;    /* Blue - Active states */
```text

#### Neutral Colors

```css
--gray-50: #f9fafb;        /* Background */
--gray-100: #f3f4f6;       /* Light backgrounds */
--gray-200: #e5e7eb;       /* Borders */
--gray-300: #d1d5db;       /* Disabled states */
--gray-500: #6b7280;       /* Muted text */
--gray-700: #374151;       /* Body text */
--gray-900: #111827;       /* Headings */
```text

#### Semantic Colors

```css
--success-500: #10b981;    /* Success states */
--warning-500: #f59e0b;    /* Warnings */
--error-500: #ef4444;      /* Errors */
--info-500: #3b82f6;       /* Information */
```text

### Typography

#### Font Stack

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "SF Mono", Monaco, Consolas, "Courier New", monospace;
```text

#### Type Scale

```css
--text-xs: 0.75rem;        /* 12px - Captions */
--text-sm: 0.875rem;       /* 14px - Small text */
--text-base: 1rem;         /* 16px - Body text */
--text-lg: 1.125rem;       /* 18px - Large body */
--text-xl: 1.25rem;        /* 20px - Small headings */
--text-2xl: 1.5rem;        /* 24px - Section headings */
--text-3xl: 1.875rem;      /* 30px - Page headings */
--text-4xl: 2.25rem;       /* 36px - Hero headings */
```text

#### Font Weights

- Regular: 400 (body text)
- Medium: 500 (emphasis)
- Semibold: 600 (headings)
- Bold: 700 (strong emphasis)

### Spacing System

Based on 8px grid system:

```css
--space-1: 0.25rem;        /* 4px */
--space-2: 0.5rem;         /* 8px */
--space-3: 0.75rem;        /* 12px */
--space-4: 1rem;           /* 16px */
--space-6: 1.5rem;         /* 24px */
--space-8: 2rem;           /* 32px */
--space-12: 3rem;          /* 48px */
--space-16: 4rem;          /* 64px */
```text

### Border Radius

```css
--radius-sm: 0.25rem;      /* 4px - Small elements */
--radius-md: 0.375rem;     /* 6px - Default */
--radius-lg: 0.5rem;       /* 8px - Cards */
--radius-xl: 0.75rem;      /* 12px - Modals */
--radius-full: 9999px;     /* Pills, avatars */
```text

## UI Component Guidelines

### Core Components

#### 1. Button Component

```typescript
Variants:
- primary: Blue background, white text
- secondary: Gray border, gray text
- ghost: Transparent, hover effect
- danger: Red for destructive actions

Sizes:
- sm: Height 32px, padding 12px
- md: Height 40px, padding 16px (default)
- lg: Height 48px, padding 20px

States:
- default, hover, active, focus, disabled, loading
```text

#### 2. Input Component

```typescript
Types:
- text: Standard text input
- url: YouTube URL input with validation
- search: With search icon

Features:
- Label above input
- Helper text below
- Error state with message
- Character count (optional)
- Clear button (optional)
```text

#### 3. Card Component

```typescript
Variants:
- summary: For library items
- pricing: For subscription plans
- feature: For landing page

Structure:
- Header (optional)
- Body
- Footer (optional)
- Actions area
```text

#### 4. Modal Component

```typescript
Types:
- share: Social sharing options
- confirm: Action confirmation
- form: Multi-step forms

Features:
- Backdrop click to close
- ESC key to close
- Focus trap
- Smooth animations
```text

### Complex Components

#### SummaryViewer

- Markdown rendering with syntax highlighting
- Copy button for code blocks
- Table of contents for long summaries
- Search within summary
- Export options dropdown

#### LibraryTable

- Sortable columns
- Search/filter bar
- Bulk actions
- Infinite scroll
- Empty state
- Loading skeleton

#### URLInputForm

- Large, prominent input field
- Paste button
- URL validation
- Recent URLs dropdown
- Loading state with progress

## User Experience Flow Diagrams

### 1. Main User Journey

```text
Landing Page → Sign In → Dashboard → Paste URL → View Summary → Save to Library
     ↓            ↓          ↓           ↓            ↓              ↓
   Features    Google     Recent     Processing    Share/Copy    Organize
   Overview     OAuth     Activity    Animation     Options      Categories
```text

### 2. Summary Generation Flow

```text
1. User pastes YouTube URL
2. Real-time URL validation
3. "Summarizing..." animation starts
4. Stream summary text as it generates
5. Display complete summary
6. Show action buttons (Save, Copy, Share)
```text

### 3. Library Management Flow

```text
Dashboard
    ├── All Summaries (default view)
    ├── Categories/Tags
    ├── Search & Filter
    ├── Sort Options
    └── Bulk Actions (Pro)
```text

### 4. Sharing Flow

```text
Summary → Share Button → Share Modal
                            ├── Copy Link
                            ├── Download (MD/PDF)
                            ├── Email
                            └── Social Media
```text

## Responsive Design Requirements

### Breakpoints

```css
--screen-sm: 640px;   /* Mobile landscape */
--screen-md: 768px;   /* Tablet portrait */
--screen-lg: 1024px;  /* Tablet landscape */
--screen-xl: 1280px;  /* Desktop */
--screen-2xl: 1536px; /* Large desktop */
```text

### Desktop First Approach (per PRD)

1. **Primary Design Target:** 1280px+ width
2. **Two-column layout** for dashboard
3. **Sidebar navigation** (240px fixed)
4. **Main content area** with max-width: 1200px

### Tablet Adaptations (768px - 1279px)

1. **Collapsible sidebar** with hamburger menu
2. **Single column** layout
3. **Stacked cards** instead of grid
4. **Touch-optimized** tap targets (44px minimum)

### Mobile Adaptations (< 768px)

1. **Bottom navigation** for main actions
2. **Full-width** components
3. **Drawer navigation** pattern
4. **Simplified summaries** (collapsible sections)
5. **Native share API** integration

## Accessibility Standards (WCAG 2.1 AA)

### Color Contrast

- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum
- Focus indicators: 3:1 minimum

### Keyboard Navigation

- All interactive elements reachable via Tab
- Visible focus indicators (2px outline)
- Skip links for main content
- Logical tab order
- Custom shortcuts for power users

### Screen Reader Support

- Semantic HTML structure
- ARIA labels for icons
- Live regions for dynamic content
- Form field associations
- Error announcements

### Motion & Animation

- Respect prefers-reduced-motion
- Pause/stop controls for animations
- No auto-playing videos
- Smooth scrolling optional

## Component Library Organization

### Directory Structure

```text
design-system/
├── tokens/              # Design tokens
├── components/          # Component library
├── patterns/           # UI patterns
├── layouts/           # Page layouts
└── assets/            # Icons, images
```text

### Component Documentation

Each component includes:

- Visual examples
- Props documentation
- Usage guidelines
- Accessibility notes
- Code snippets

## User Journey Maps

### New User Journey

```text
1. Land on homepage
   - Hero: "Speed-learn anything on YouTube"
   - Value props visible
   - Try demo (no auth required)

2. First summary
   - Paste URL in prominent input
   - See real-time progress
   - Read summary (limited features)

3. Sign up prompt
   - "Save this summary to your library"
   - Google OAuth (one-click)
   - Return to summary

4. Onboarding
   - Welcome message
   - Quick tour of features
   - First summary saved
```text

### Returning User Journey

```text
1. Quick access
   - Bookmark/PWA install prompt
   - Recent summaries on dashboard
   - Quick paste widget

2. Power features
   - Keyboard shortcuts
   - Batch processing (Pro)
   - API access (Pro)
```text

## Wireframe References

### Landing Page Layout

```text
┌─────────────────────────────────────┐
│ Header (logo, sign in)              │
├─────────────────────────────────────┤
│ Hero Section                        │
│ - Headline                          │
│ - URL Input (prominent)             │
│ - CTA Button                        │
├─────────────────────────────────────┤
│ Features Grid (3 columns)           │
├─────────────────────────────────────┤
│ Pricing Cards                       │
├─────────────────────────────────────┤
│ Footer                              │
└─────────────────────────────────────┘
```text

### Dashboard Layout

```text
┌────────┬────────────────────────────┐
│Sidebar │ Main Content Area           │
│        │ ┌────────────────────────┐ │
│ - Home │ │ Search Bar             │ │
│ - Lib  │ ├────────────────────────┤ │
│ - Bill │ │ Summary Cards Grid     │ │
│ - Set  │ │ (responsive columns)   │ │
│        │ └────────────────────────┘ │
└────────┴────────────────────────────┘
```text

### Summary View Layout

```text
┌─────────────────────────────────────┐
│ Back to Library | Actions Menu      │
├─────────────────────────────────────┤
│ Video Title (H1)                    │
│ Channel • Date • Duration           │
├─────────────────────────────────────┤
│ Summary Content (Markdown)          │
│ - Key Points                        │
│ - Sections                          │
│ - Quotes                            │
├─────────────────────────────────────┤
│ Action Bar                          │
│ Copy | Share | Export | Delete      │
└─────────────────────────────────────┘
```text

## Design Tool Integration

### Figma Setup

- Component library file
- Design tokens plugin
- Auto-layout for responsive design
- Prototype interactions

### Development Handoff

- CSS variables for all tokens
- Storybook for component docs
- Visual regression tests
- Design-dev sync meetings

## Style Guide and Branding

### Voice & Tone

- **Professional:** Credible and trustworthy
- **Efficient:** Respect user's time
- **Intelligent:** Smart recommendations
- **Friendly:** Approachable, not intimidating

### Microcopy Guidelines

- Action-oriented CTAs ("Summarize Video" not "Submit")
- Clear error messages with solutions
- Encouraging empty states
- Contextual help text

### Loading & Progress States

- Skeleton screens for initial loads
- Progress bars for long operations
- Animated placeholders
- Estimated time remaining

### Empty States

- Helpful illustrations
- Clear next actions
- Sample content to try
- Educational tips

## Performance Considerations

### Perceived Performance

- Instant feedback on interactions
- Progressive content loading
- Optimistic UI updates
- Smart prefetching

### Visual Performance

- CSS-based animations (no JS)
- GPU-accelerated transforms
- Reduced motion options
- Efficient re-renders

### Asset Optimization

- WebP images with fallbacks
- SVG icons (sprite sheet)
- Variable fonts
- Lazy loading images

This comprehensive UI/UX documentation provides a complete design system for Sightline.ai, ensuring consistency, accessibility, and excellent user experience across all platforms and devices.
