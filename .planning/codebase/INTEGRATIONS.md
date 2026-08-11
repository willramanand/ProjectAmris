# External Integrations

**Analysis Date:** 2026-08-10

## APIs & External Services

**No external APIs integrated.**

This is a component library that does not consume external APIs directly. Components are designed to be framework-agnostic and receive data from consumers via properties and slots. Example: `AmCombobox` component demonstrates async pattern in JSDoc (`src/components/combobox/combobox.ts`) where consuming applications handle their own API calls via the async loading pattern.

## Data Storage

**Databases:**
- Not applicable - This is a UI component library, not a backend service
- Consumer applications handle their own data persistence

**File Storage:**
- Not applicable at library level
- Local filesystem used for build artifacts only (`dist/`, `coverage/`)

**Caching:**
- Not applicable - Consumers implement caching in their applications

## Authentication & Identity

**Auth Provider:**
- Not applicable - Component library has no auth requirements
- Consumers integrate their own authentication providers
- Library includes no session management or credential handling

## Monitoring & Observability

**Error Tracking:**
- None - Development only, no production error tracking configured

**Logs:**
- Console output for development/build processes only
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- GitHub Packages (npm.pkg.github.com) - Primary package registry
- GitHub Repository - Source code hosting

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)
- Automated on: pull requests and pushes to main branch
- Workflow file: `.github/workflows/ci.yml`

**CI Steps:**
1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. TypeScript type checking (`npx tsc --noEmit`)
5. Run tests (`npm run test:run`)
6. Build library (`npm run build`)

**Release Pipeline:**
- Trigger: Manual via GitHub Actions
- Workflow: `.github/workflows/release.yml`
- Process:
  - Build library
  - Use changesets to publish to GitHub Packages
  - Publish to npm.pkg.github.com

**Publish Pipeline:**
- Trigger: Manual or automated on version updates
- Workflow: `.github/workflows/publish.yml`
- Registry: npm.pkg.github.com
- Node.js: version 20

## Environment Configuration

**Required env vars:**
- None required for the component library itself
- npm authentication handled via `.npmrc`

**NPM Configuration (.npmrc):**
```
@willramanand:registry=https://npm.pkg.github.com
```
- Scoped packages published to GitHub Packages registry
- Requires GitHub authentication for publishing

**Secrets location:**
- GitHub Actions secrets (managed in repository settings)
- Used for: GitHub Packages authentication during publish workflow
- No .env files in repository (see `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Development Tools Integration

**Storybook Instance:**
- Local development: `npm run storybook` (port 6006)
- Static build: `npm run build:storybook`
- Stories located: `src/**/*.stories.ts`
- Framework: Web Components with Vite integration

**Documentation Generation:**
- Custom Elements Manifest: `npm run build:manifest`
- Config: `custom-elements-manifest.config.js`
- Output: `dist/custom-elements.json`
- Tool: `@custom-elements-manifest/analyzer`

**Testing Environment:**
- Test runner: Vitest with jsdom (browser DOM simulation)
- Setup file: `test/setup.ts` (mocks for ElementInternals, ResizeObserver, etc.)
- Coverage: `npm run test:coverage` via @vitest/coverage-v8

## Version & Release Management

**Changesets:**
- Tool: @changesets/cli 2.6.0
- Purpose: Semantic versioning and changelog generation
- Workflow: Developers add changesets, maintainers publish coordinated releases
- Current version: 0.2.0 (from `package.json`)

## Third-Party Integrations

**GitHub Integration:**
- Source repository: https://github.com/willramanand/ProjectQuartz
- Actions/workflows for automated testing and publishing
- Package registry: GitHub Packages

**No Third-Party API Integrations:**
- This is a standalone UI component library
- Zero external service dependencies
- Consumers of the library integrate with external services independently

---

*Integration audit: 2026-08-10*
