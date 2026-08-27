---
"@willramanand/amris": minor
---

Add the opt-in `@willramanand/amris/compat-forms` side-effect subpath.

Importing it once at app init enables a hidden-input Light-DOM form-participation
fallback strictly below the ElementInternals form-association floor (e.g. Safari
< 16.4), restoring native `<form>` submission and native `required`/`pattern`
constraint validation for Amris form controls on engines without
`ElementInternals`.

The fallback is XOR-gated with ElementInternals — never both channels, so no
double-submit — and is a no-op at or above the floor (ElementInternals wins). It
is entirely opt-in: nothing activates unless the consumer imports the subpath.
This adds no change to the frozen public CEM surface — component
props/events/slots/parts and design tokens are unchanged; the subpath registers
no custom element.
