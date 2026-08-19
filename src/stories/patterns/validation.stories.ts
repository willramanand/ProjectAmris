import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
// Real shipped components exercised by this pattern (also globally registered
// via .storybook/preview.ts -> src/index.all.js). Imported explicitly so the
// example stands on its own and typechecks against the as-built public API.
import '../../components/field/field.js';
import '../../components/input/input.js';
import '../../components/label/label.js';
import '../../components/hint-text/hint-text.js';
import '../../components/error-text/error-text.js';
import '../../components/button/button.js';
import type { AmInput } from '../../components/input/input.js';

/**
 * Patterns / Validation
 *
 * A cross-cutting DOCS-03 example for the validation-message pattern
 * (FEAT-01 / FEAT-02). It shows the shipped public behavior only:
 *
 * - `am-field` composes label + control + hint/error via slots and swaps the
 *   hint for the error while the control is invalid (D-02, presentational).
 * - The form-associated `am-input` owns the SR-authoritative message: the
 *   native `validationMessage` surfaces on blur / failed submit (touch-gated,
 *   D-01), and a failed native submit announces it assertively (D-04).
 * - `am-input.setCustomError(message)` lets a consumer/server-supplied error
 *   win over the native constraint message; `setCustomError('')` clears it and
 *   the native constraint validity takes over again (D-03 precedence).
 *
 * All rendered text flows through Lit `${}` bindings — no raw-HTML sink
 * (threat T-05-03) — and only public component APIs are used (T-05-04).
 */
const meta: Meta = {
  title: 'Patterns/Validation',
  component: 'am-input',
  parameters: {
    docs: {
      description: {
        component:
          'Runnable validation-message pattern (DOCS-03). The form-associated ' +
          'am-input surfaces its native validationMessage on blur/submit, and ' +
          'setCustomError lets a consumer-supplied error take precedence.',
      },
    },
  },
  argTypes: {
    required: { control: 'boolean', description: 'Mark the email control required.' },
    inputType: {
      control: 'select',
      options: ['email', 'text', 'url', 'tel'],
      description: 'Native input type whose constraint drives validationMessage.',
    },
    customError: {
      control: 'text',
      description:
        'Consumer/server-supplied error routed through am-input.setCustomError(). ' +
        'Non-empty wins over the native message; empty string clears it (D-03).',
    },
  },
};
export default meta;
type Story = StoryObj;

/**
 * Live native-constraint example. Type an invalid email and blur (or press
 * Submit) to surface the touch-gated native `validationMessage`; a failed
 * submit announces it assertively. Toggle `required` and the input `type`
 * from the controls.
 */
export const NativeConstraint: Story = {
  args: { required: true, inputType: 'email', customError: '' },
  render: (args) => {
    const inputRef: Ref<AmInput> = createRef();
    // Apply the consumer-supplied custom error each render so the control
    // reflects the live `customError` arg (empty string clears it — D-03).
    const applyCustomError = (el?: Element) => {
      const input = el as AmInput | undefined;
      if (input) input.setCustomError(args.customError ?? '');
    };
    const onSubmit = (e: Event) => {
      // Keep the demo on-page; native constraint validation still runs and
      // fires `invalid` on the control, driving am-input's assertive message.
      e.preventDefault();
    };
    return html`
      <form
        @submit=${onSubmit}
        style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;"
      >
        <am-field>
          <am-label slot="label" ?required=${args.required}>Email address</am-label>
          <am-input
            ${ref(inputRef)}
            ${ref(applyCustomError)}
            name="email"
            type=${args.inputType}
            placeholder="you@example.com"
            ?required=${args.required}
          ></am-input>
          <am-hint-text slot="hint">We'll never share your email.</am-hint-text>
          <am-error-text slot="error">Please provide a valid email address.</am-error-text>
        </am-field>
        <am-button type="submit" variant="primary">Submit</am-button>
      </form>
    `;
  },
};

/**
 * Live `setCustomError` precedence example. Edit the `customError` control:
 * a non-empty value wins over the native constraint message; clearing it back
 * to an empty string hands validity back to the native constraint (D-03).
 */
export const CustomErrorPrecedence: Story = {
  args: { required: true, inputType: 'email', customError: 'That email is already registered.' },
  render: (args) => {
    const applyCustomError = (el?: Element) => {
      const input = el as AmInput | undefined;
      if (input) input.setCustomError(args.customError ?? '');
    };
    const onSubmit = (e: Event) => e.preventDefault();
    return html`
      <form
        @submit=${onSubmit}
        style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;"
      >
        <am-field>
          <am-label slot="label" ?required=${args.required}>Email address</am-label>
          <am-input
            ${ref(applyCustomError)}
            name="email"
            type=${args.inputType}
            value="taken@example.com"
            ?required=${args.required}
          ></am-input>
          <am-hint-text slot="hint">Pick an address no one else has used.</am-hint-text>
          <am-error-text slot="error">This address is unavailable.</am-error-text>
        </am-field>
        <am-button type="submit" variant="primary">Submit</am-button>
      </form>
    `;
  },
};
