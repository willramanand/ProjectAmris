# Coding Conventions

**Analysis Date:** 2026-08-10

## Naming Patterns

**Files:**
- Component files: kebab-case (e.g., `button.ts`, `accordion.ts`, `avatar.ts`)
- Utility files: kebab-case (e.g., `form-actions.ts`, `unique-id.ts`)
- Style files: kebab-case with `.css.js` suffix (e.g., `reset.css.js`)
- Test files: component-name with `.test.ts` suffix (e.g., `button.test.ts`)

**Classes (Components):**
- PascalCase with `Am` prefix (e.g., `AmButton`, `AmInput`, `AmAccordion`, `AmAvatar`)
- All components extend `LitElement`
- Decorated with `@customElement('am-kebab-case')`

**Properties:**
- camelCase (e.g., `variant`, `size`, `disabled`, `loading`, `initials`)
- Boolean properties often use `disabled`, `readonly`, `invalid`, `required`, `clearable`
- Type properties: PascalCase exported types (e.g., `ButtonVariant`, `InputSize`, `AvatarShape`)

**Methods:**
- camelCase (e.g., `handleClick`, `handleImgError`, `getAssociatedForm`)
- Private methods prefixed with underscore (e.g., `_handleImgError`, `_internals`)
- Descriptive verb-noun pattern (e.g., `handleClick`, `setFormValue`, `checkValidity`)

**Variables & Properties:**
- camelCase for local variables and instance properties
- Private instance properties prefixed with underscore (e.g., `_internals`, `_imgFailed`, `_headerId`)
- State variables use `@state()` decorator (e.g., `private _imgFailed = false`)

**Type Definitions:**
- Exported as `export type` statements at the top of component files
- Union types for variants: `type ButtonVariant = 'primary' | 'outlined' | 'ghost' | 'subtle' | 'danger'`
- Union types for sizes: `type ButtonSize = 'sm' | 'md' | 'lg'`

## Code Style

**Formatting:**
- Target: ES2023
- Module format: ESNext with bundler module resolution
- No explicit Prettier or ESLint configuration found; reliant on TypeScript strict mode and IDE formatting
- Indentation: 2 spaces (inferred from code samples)

**Linting:**
- TypeScript strict mode enforced via `tsconfig.json`
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noFallthroughCasesInSwitch`: true
- `noUncheckedSideEffectImports`: true

**Type Safety:**
- Strict TypeScript enabled (`strict: true`)
- Generic types used extensively for event handlers and component props
- Type annotations required for function parameters and return types
- Use `type` not `interface` for component prop types exported to consumers

## Import Organization

**Order:**
1. Lit imports (e.g., `import { LitElement, css, html, nothing } from 'lit'`)
2. Lit decorators (e.g., `import { customElement, property } from 'lit/decorators.js'`)
3. Lit directives (e.g., `import { classMap } from 'lit/directives/class-map.js'`)
4. Internal style imports (e.g., `import { resetStyles, focusRingStyles } from '../../styles/reset.css.js'`)
5. Internal utility imports (e.g., `import { uniqueId } from '../../utilities/unique-id.js'`)

**Import Style:**
- Use relative paths with explicit `.js` extensions (e.g., `'../../utilities/form-actions.js'`)
- Default imports for component classes
- Named imports for utilities and types
- Type imports using `import type` syntax when importing only types

**Path Structure:**
- Components in `src/components/{component-name}/`
- Styles in `src/styles/`
- Utilities in `src/utilities/`
- Tokens in `src/tokens/`

## Error Handling

**Patterns:**
- Errors are handled via state changes, not thrown exceptions
- Error state tracked with boolean flags (e.g., `_imgFailed`)
- Error events emitted from components rather than thrown
- Use `@error` event handlers on elements (e.g., `@error=${this._handleImgError}` on `<img>` tags)
- Form validation uses `internals.setValidity()` for native form validation integration
- Private methods handle errors by setting internal state

**Example:** Avatar component's image load error:
```typescript
private _handleImgError() {
  this._imgFailed = true;
}

protected updated(changed: Map<string, unknown>) {
  if (changed.has('src')) {
    this._imgFailed = false;
  }
}
```

## Logging

**Framework:** Console logging (no logging framework detected)

**Patterns:**
- No explicit logging found in component code
- Console logging would be used for debugging during development
- Keep logging minimal in production builds

## Comments

**When to Comment:**
- JSDoc comments for all public components
- JSDoc comments for exported types and public methods
- Inline comments for complex logic (e.g., grid-template-rows transitions, animation timing)
- Comments for accessibility patterns and why they're implemented a certain way
- Comments explaining non-obvious conditionals or edge cases

**JSDoc/TSDoc:**
```typescript
/**
 * Avatar — displays a user image, initials, or a fallback icon.
 *
 * Falls back gracefully: image → initials → default person icon.
 *
 * @slot - Custom fallback content
 * @csspart image - The img element
 * @csspart initials - The initials text
 * @csspart fallback - The default fallback icon
 *
 * @cssprop --am-avatar-size - Override size
 * @cssprop --am-avatar-radius - Override border radius
 *
 * @example
 * ```html
 * <am-avatar src="/photo.jpg" alt="Jane Doe"></am-avatar>
 * ```
 */
```

**Comment Structure:**
- Brief description at top
- @slot tags for named slots
- @csspart tags for CSS parts
- @cssprop tags for CSS custom properties
- @fires tags for custom events
- @example tags with HTML usage examples

**Aria/Accessibility Comments:**
- Used to mark hidden elements (`aria-hidden="true"`)
- Document intent of aria attributes in JSDoc

## Function Design

**Size:** Keep methods focused on single responsibility. Render methods should build templates; event handlers should update state.

**Parameters:**
- Use typed parameters with TypeScript
- Destructure option objects when multiple parameters
- Avoid positional parameters beyond 2-3

**Return Values:**
- Explicit return type annotations required
- Return `nothing` from Lit templates for conditional rendering
- Return boolean for validation/check methods
- Return `void` for event handlers

**Example Pattern:**
```typescript
private handleClick(event: Event) {
  if (this.disabled || this.loading || this.type === 'button') {
    return;
  }

  if (this.type === 'submit') {
    requestAssociatedFormSubmit(this, {
      event,
      internals: this._internals,
      disabled: this.disabled || this.loading,
    });
    return;
  }

  if (this.type === 'reset') {
    event.preventDefault();
    resetAssociatedForm(this, this._internals);
  }
}
```

## Module Design

**Exports:**
- Default export: component class (e.g., `export class AmButton`)
- Named exports: type definitions (e.g., `export type ButtonVariant`)
- Global type declaration at end of file:
  ```typescript
  declare global {
    interface HTMLElementTagNameMap {
      'am-button': AmButton;
    }
  }
  ```

**Barrel Files:**
- Main entry: `src/index.ts` exports all components and types organized by category
- Core bundle: `src/index.ts` for foundational, layout, form, and feedback components
- All bundle: `src/index.all.ts` for extended components

**File Structure:**
- One component class per file
- Static styles defined in component file with `static styles = [...]`
- Render method returns `TemplateResult`

## Lit-Specific Patterns

**Decorators:**
- `@customElement('am-element-name')`: Register custom element
- `@property({ reflect: true })`: Reflect property to attribute
- `@property({ type: Boolean, reflect: true })`: Boolean property with reflection
- `@state()`: Internal state, not reflected to attribute
- `@query()`: Query for child element in shadow DOM
- `@queryAssignedElements()`: Query assigned slot elements

**Lifecycle:**
- `constructor()`: Initialize form internals and attach ElementInternals
- `protected updated(changed: PropertyValues)`: Called after property changes
- `render()`: Return template, uses Lit's `html` template tag

**Reactive Rendering:**
- Properties decorated with `@property()` trigger re-render on change
- Use `live()` directive for two-way binding with form inputs
- Use `classMap()` directive for conditional classes

**Example:**
```typescript
@customElement('am-button')
export class AmButton extends LitElement {
  @property({ reflect: true })
  variant: ButtonVariant = 'primary';

  @property({ type: Boolean, reflect: true })
  loading = false;

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('disabled') || changed.has('loading')) {
      this.setAttribute('aria-disabled', String(this.disabled || this.loading));
    }
  }

  render() {
    return html`<button ...>${this.label}</button>`;
  }
}
```

---

*Convention analysis: 2026-08-10*
