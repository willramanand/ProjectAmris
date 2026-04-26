# Project Amris Library Roadmap

## 1. Vision and Core Goals

### Primary goals
- Build a **framework-agnostic** UI component library
- Support **plain HTML**, **Lit**, and major frameworks through standard custom elements
- Provide a **clean, modern, premium design language**
- Ensure **accessibility**, **themeability**, and **long-term maintainability**
- Keep the library **lightweight**, **performant**, and **well-documented**

### Non-goals
- Not tied to React, Vue, Angular, or Svelte internals
- Not dependent on a large CSS framework
- Not reliant on a design tool runtime
- Not a one-off app-specific component set

---

## 2. Technical Requirements

## Core platform
- Use **Web Components**
- Use **Custom Elements**
- Use **Shadow DOM** where appropriate
- Use **slots** for composition
- Use **CSS custom properties** for theming
- Use **ElementInternals** and form-associated custom elements where useful

## Authoring stack
- **Lit** for component implementation
- **TypeScript** for authoring and API safety
- **Vite** for development, demos, and packaging
- **Custom Elements Manifest** for tooling and documentation
- **Floating UI** for dialogs, tooltips, and dropdowns

## Styling requirements
- Public styling API via:
  - CSS custom properties
  - `::part`
  - slots
- Avoid requiring global CSS resets
- Support light and dark themes
- Support design tokens
- Provide motion that respects `prefers-reduced-motion`

## Accessibility requirements
- Keyboard navigation support
- Focus-visible support
- Screen reader labeling
- Correct ARIA patterns where needed
- Sufficient color contrast
- Disabled, invalid, loading, and readonly states
- Reduced motion support
- Proper focus management in overlays

## Browser/runtime requirements
- Modern evergreen browsers — supported floor: **Chrome/Edge 111, Safari 16.4, Firefox 121** (see [BROWSER_SUPPORT.md](./BROWSER_SUPPORT.md))
- ESM-first distribution
- SSR-safe package behavior where possible
- No framework-specific runtime requirement

---

## 3. Product Requirements

## Developer experience
- Easy installation
- Easy import model
- Good documentation
- Clear examples for:
  - plain HTML
  - Svelte (in the future)
- Stable naming conventions
- Predictable API patterns

## Design system requirements
- Consistent spacing scale
- Consistent radius system
- Consistent typography scale
- Consistent elevation/shadow rules
- Consistent interaction states
- Token-based color system
- Clear distinction between semantic tokens and raw tokens

## Quality requirements
- Unit tests
- Accessibility tests
- Visual regression tests
- Manual keyboard testing
- Cross-browser validation
- Versioning and changelog discipline

---

## 4. Design Token Foundation

## Required token categories
- Color
- Typography
- Spacing
- Radius
- Border width
- Shadow/elevation
- Motion duration
- Motion easing
- Z-index layering
- Component sizing

## Token levels
### Primitive tokens
- Raw colors
- Raw spacing values
- Raw radius values
- Raw font sizes

### Semantic tokens
- Surface background
- Surface border
- Text primary
- Text secondary
- Accent
- Success
- Warning
- Danger
- Focus ring
- Disabled state

### Component tokens
- Button height
- Input border radius
- Card padding
- Dialog max width
- Tooltip offset

---

## 5. Component Architecture Requirements

## Each component should define
- Purpose
- Public API
- Attributes
- Properties
- Events
- Slots
- Parts
- CSS custom properties
- Accessibility behavior
- Keyboard behavior
- States
- Usage examples

## Standard states to support
- Default
- Hover
- Focus
- Focus-visible
- Active
- Disabled
- Loading
- Selected
- Invalid
- Readonly
- Expanded
- Open

## Event requirements
- Native-like naming where possible
- Avoid unnecessary custom events
- Emit meaningful detail payloads
- Document event timing clearly

---

## 6. Required Component Categories

## A. Foundations
These should be done first.

### Required
- `theme-provider` or token/bootstrap strategy
- `surface`
- `divider`
- `icon`
- `spinner`
- `visually-hidden`

---

## B. Actions
### Required
- `button`
- `icon-button`
- `button-group`
- `link-button`

### Requirements
- Variants: primary, secondary, ghost, subtle, danger
- Sizes: small, medium, large
- Icon-only support
- Loading state
- Disabled state
- Accessible label support

---

## C. Form Inputs
### Required
- `input`
- `textarea`
- `select`
- `checkbox`
- `radio`
- `switch`
- `slider`
- `field`
- `label`
- `hint-text`
- `error-text`

### Strongly recommended
- `combobox`
- `autocomplete`
- `input-otp`
- `number-field`
- `search-field`

### Requirements
- Label association
- Help text
- Error state
- Validation state
- Required/optional indicators
- Prefix/suffix slot support
- Form participation where appropriate

---

## D. Layout and Surfaces
### Required
- `card`
- `panel`
- `stack`
- `grid`
- `separator`

### Strongly recommended
- `app-shell`
- `split-view`
- `tabs`
- `accordion`

### Requirements
- Flexible spacing
- Responsive layout behavior
- Clear content hierarchy
- Minimal opinionation

---

## E. Navigation
### Required
- `tabs`
- `tab-panel`
- `breadcrumb`
- `pagination`

### Strongly recommended
- `nav-bar`
- `side-nav`
- `menu`
- `menu-item`

### Requirements
- Keyboard navigation
- Selection state
- Orientation support where relevant
- Proper roles and labeling

---

## F. Feedback and Status
### Required
- `badge`
- `alert`
- `toast`
- `progress`
- `progress-ring`
- `empty-state`

### Strongly recommended
- `skeleton-loader`
- `status-dot`

### Requirements
- Semantic variants
- Icon support
- Accessible announcements where needed

---

## G. Overlay Components
### Required
- `dialog`
- `popover`
- `tooltip`

### Strongly recommended
- `dropdown`
- `context-menu`
- `drawer`
- `command-palette`

### Requirements
- Focus trapping where needed
- Escape-to-close
- Click-outside behavior
- Anchor positioning
- Layering/z-index strategy
- Restore focus on close

---

## H. Data Display
### Required
- `avatar`
- `list`
- `list-item`
- `table`

### Strongly recommended
- `data-grid`
- `stat`
- `timeline`
- `tag`
- `chip`

### Requirements
- Responsive behavior
- Empty states
- Sorting patterns for advanced components
- Selection behavior if applicable

---

## I. Utility / Advanced Components
### Later phase
- `date-picker`
- `time-picker`
- `calendar`
- `tree-view`
- `file-upload`
- `rich-select`
- `color-picker`

These are best deferred until the core system is stable.

---

## 7. Required Cross-Cutting Utilities

## Behavior utilities
- Focus management
- Roving tabindex
- Dismissable layer logic
- Overlay positioning
- Keyboard shortcut helpers
- Selection model helpers
- ID generation utilities
- Controlled/uncontrolled state helpers

## Styling utilities
- Token resolution
- Density/size scaling
- Directionality support (`ltr` / `rtl`)
- High contrast mode support

## Platform utilities
- Event composition helpers
- Slot content detection
- Resize observation
- Mutation observation where necessary
- Scroll locking for overlays

---

## 8. Accessibility Roadmap

## Baseline requirements
- Every interactive component must be keyboard accessible
- Every component must have documented ARIA behavior
- Visible focus state on all interactive controls
- All form controls must support labels and errors
- Overlays must manage focus correctly
- Announcements for toasts/alerts as appropriate

## Validation checklist
- Screen reader testing
- Keyboard-only navigation testing
- Contrast testing
- Reduced motion testing
- Zoom/responsive testing
- High contrast testing if supported

---

## 9. Theming Requirements

## Must support
- Light theme
- Dark theme
- Brand theme overrides
- Per-component token overrides
- Global token overrides

## Public theming API
- CSS variables
- Documented `::part` selectors
- Slot-based composition
- Optional theme class or host attribute

## Avoid
- Deep undocumented DOM selectors
- Requiring consumers to pierce shadow roots
- Hardcoded colors that bypass tokens

---

## 10. Documentation Requirements

## Required docs for each component
- Overview
- Import instructions
- Basic examples
- Attributes/properties
- Events
- Slots
- Parts
- CSS variables
- Accessibility notes
- Keyboard interactions
- Framework usage notes

## Required global docs
- Getting started
- Installation
- Theming
- Design tokens
- Accessibility principles
- Browser support
- SSR caveats
- Contribution guide
- Versioning policy

---

## 11. Testing Requirements

## Unit testing
- Component rendering
- Property/attribute reflection
- Event dispatch
- State changes
- Slot behavior

## Accessibility testing
- Automated a11y checks
- Focus behavior
- Keyboard interaction testing

## Visual testing
- Variant coverage
- Theme coverage
- Hover/focus/disabled/loading states
- Regression screenshots

## Integration testing
- Forms
- Dialog interactions
- Popover positioning
- Menu navigation
- Controlled/uncontrolled flows

---

## 12. Packaging Requirements

## Package outputs
- ESM build
- Type declarations
- Side-effect clarity
- Tree-shakeable exports
- Component-by-component imports
- Optional bundled stylesheet or token entrypoints

## Metadata
- `package.json` exports map
- Type definitions
- README
- changelog
- license
- custom-elements manifest

---

## 13. Recommended Build and Tooling Stack

## Core
- Lit
- TypeScript
- Vite

## Recommended
- Floating UI
- Web Test Runner
- Open WC tooling
- Custom Elements Manifest generator
- Storybook or a Vite-based docs site
- Changesets for versioning
- ESLint
- Prettier

## Optional
- Motion One
- Zod for complex config validation
- a11y linting tools
- visual regression tooling

---

## 14. Suggested Implementation Phases

## Phase 1: Foundation
- Project setup
- Token architecture
- Theme system
- Base styling conventions
- Testing setup
- Documentation shell

## Phase 2: Core primitives
- Button
- Icon button
- Surface
- Card
- Input
- Field
- Checkbox
- Switch
- Spinner

## Phase 3: Navigation and overlays
- Tabs
- Accordion
- Dialog
- Tooltip
- Popover
- Menu

## Phase 4: Form expansion
- Select
- Textarea
- Radio
- Slider
- Combobox
- Search field

## Phase 5: Data and feedback
- Badge
- Alert
- Toast
- Progress
- Table
- Avatar
- Empty state

## Phase 6: Advanced components
- Date picker
- Calendar
- Command palette
- Drawer
- Data grid
- File upload

---

## 15. MVP Component List

## Minimum viable release
- Button
- Icon button
- Input
- Textarea
- Checkbox
- Switch
- Card
- Surface
- Tabs
- Dialog
- Tooltip
- Badge
- Alert
- Spinner
- Field
- Label
- Error text

This is enough to validate:
- theming
- accessibility model
- API consistency
- docs structure
- packaging strategy

---

## 16. Nice-to-Have Features Later

- Framework wrapper packages
- Figma token sync
- RTL support
- animation presets
- density modes
- mobile interaction tuning
- headless primitives layer
- data grid
- advanced form controls
- command palette

---

## 17. Definition of Done for Each Component

A component is done when it has:
- Stable API
- Tests
- Accessibility coverage
- Documentation
- Theme support
- Keyboard behavior
- Slots/parts documented
- CSS variables documented
- Example usage in plain HTML
- Example usage in at least one framework

---

## 17a. SSR (Server-Side Rendering) — current status

Amris is **client-only** today. Components ship as decorator-based Lit elements that call `attachInternals()` in their constructor, which throws under non-DOM SSR runtimes (Node, Deno, Bun without DOM shim). No Declarative Shadow DOM (DSD) authoring is in place yet.

### What works
- ESM imports under SSR bundlers (Next.js, Nuxt, SvelteKit) **as long as components are dynamically imported in client-only boundaries** (e.g. Next.js `dynamic(..., { ssr: false })`, SvelteKit `onMount`, `<ClientOnly>` in Nuxt).
- Token CSS via `@willramanand/amris/styles/tokens.css` is fully SSR-safe — it is plain CSS, not a custom element.

### What does not work
- Rendering `<am-*>` tags during server render (will error on `attachInternals()` and the decorator-driven property initialization).
- Hydration of pre-rendered shadow trees — there is no DSD output yet.

### Recommended pattern

```tsx
// Next.js (App Router) — client component
'use client';
import '@willramanand/amris/components/button';

export function MyButton() {
  return <am-button>Click me</am-button>;
}
```

```css
/* Global tokens — safe to load on the server */
@import '@willramanand/amris/styles/tokens.css';
```

### Determinism for server-rendered IDs

When the server-render path **is** rendering Amris (e.g. via a future DSD build, or via a custom DOM shim), call `resetUniqueIdCounter()` at the start of each request to keep generated IDs deterministic and avoid client/server hydration mismatches:

```ts
import { resetUniqueIdCounter } from '@willramanand/amris/core';

// in your request handler / middleware
resetUniqueIdCounter();
```

DSD/`@lit-labs/ssr` integration is tracked as future work.

---

## 18. Success Criteria

The library is successful if it:
- Works in plain HTML with no framework
- Feels natural in React/Vue/Svelte/Angular apps
- Has consistent styling and API patterns
- Is accessible by default
- Is easy to theme
- Has excellent docs
- Can scale from primitive controls to complex app UIs
