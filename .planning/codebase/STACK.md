# Technology Stack

**Analysis Date:** 2026-08-10

## Languages

**Primary:**
- TypeScript 6.0.3 - All source code, configuration, build scripts
- JavaScript (ES2023) - Runtime target, compilation output

**Secondary:**
- HTML - Component templates via Lit's `html` template tag
- CSS - Styling via Lit's `css` template tag with design tokens

## Runtime

**Environment:**
- Node.js 20 (specified in `.github/workflows/ci.yml`)

**Package Manager:**
- npm (uses `package-lock.json`)
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- Lit 3.3.2 (peer dependency) - Web components implementation framework
- Purpose: Component authoring with decorators, reactivity, templating

**Development & Documentation:**
- Storybook 10.3.0 - Component documentation and visual development
- @storybook/web-components-vite 10.3.0 - Storybook integration with Vite
- @storybook/web-components 10.3.0 - Web Components support for Storybook

**Build & Bundling:**
- Vite 8.0.0 - Development server and production bundler
- Terser 5.46.1 - JavaScript minification
- @lit-labs/rollup-plugin-minify-html-literals 0.2.0 - HTML template literal minification
- Custom Elements Manifest Analyzer 0.11.0 - Web Components metadata generation

**Testing:**
- Vitest 4.1.0 - Unit test runner
- @vitest/coverage-v8 4.1.0 - Code coverage reporting

## Key Dependencies

**Critical:**
- @floating-ui/dom 1.7.6 - Positioning library for dropdowns, popovers, tooltips, dialogs
- Why it matters: Handles complex positioning calculations for overlay components

**Development Tools:**
- axe-core 4.11.1 - Accessibility testing and WCAG compliance verification
- jsdom 29.0.0 - DOM simulation for headless testing in Vitest
- highlight.js 11.11.1 - Code syntax highlighting for documentation examples
- custom-elements-manifest 2.1.0 - Web Components metadata and tooling

**Release Management:**
- @changesets/cli 2.6.0 - Semantic versioning and changelog automation
- Purpose: Coordinated release management for component library

## Configuration

**Environment:**
- No runtime environment variables required
- Configuration via:
  - `tsconfig.json` - TypeScript compilation settings (ES2023 target, strict mode)
  - `vite.config.ts` - Build configuration, component discovery, minification
  - `vitest.config.ts` - Test environment (jsdom), test file patterns
  - `custom-elements-manifest.config.js` - Web Components metadata generation

**Build Settings (tsconfig.json):**
- Target: ES2023
- Module: ESNext
- Strict type checking enabled
- noUnusedLocals and noUnusedParameters enforced
- Experimental decorators enabled for Lit
- DOM library included

**Build Configuration (vite.config.ts):**
- Output directory: `dist`
- Minifier: Terser
- Sourcemaps enabled
- Library format: ES modules only
- External dependencies: `lit`, `@lit/*`, `@floating-ui/*`
- Custom plugins: CSS comment stripping for Lit templates

## Platform Requirements

**Development:**
- Node.js 20
- npm
- TypeScript knowledge (strict typing required)
- Familiarity with Web Components APIs and Lit framework

**Production (Consumer):**
- Browser support: ES2023-compatible browsers (see `BROWSER_SUPPORT.md`)
- Peer dependency on Lit 3.3.2 or compatible
- Minimal footprint: Component-based, tree-shakeable exports
- No external runtime dependencies for consumers

**Distribution:**
- Published to GitHub Packages (npm.pkg.github.com)
- Scoped package: @willramanand/amris
- Exports:
  - `amris` - Full bundle with all components
  - `amris-core` - Core components only
  - Individual component exports: `components/*`
  - Style tokens: `styles/tokens.css`
  - Utilities and design tokens

## Publishing Configuration

**Registry:**
- GitHub Packages (npm.pkg.github.com) - Primary registry
- Package name: @willramanand/amris
- Access level: restricted

**Artifacts:**
- Main entry: `dist/amris.js` (full bundle)
- Core entry: `dist/amris-core.js` (minimal core)
- Component entries: `dist/components/*/index.js`
- Type definitions: `dist/index.all.d.ts`, `dist/index.d.ts`
- Web Components metadata: `dist/custom-elements.json`
- CSS tokens: `dist/styles/tokens.css`

---

*Stack analysis: 2026-08-10*
