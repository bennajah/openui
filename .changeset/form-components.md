---
"@openui/react": minor
"@openui/svelte": minor
"@openui/astro": minor
"@openui/vue": minor
"@openui/cli": minor
---

Add form components: `input`, `textarea`, `select`, `checkbox`, `radio`,
`label`, and `field`, implemented natively for React, Svelte, Astro, and Vue.
The controls wrap their native elements with a shared field treatment and an
`invalid` state; `field` composes a label, control, and hint or error message
with `id`/`aria-describedby`/`aria-invalid` wiring. The registry, docs, and LLM
files now cover all eight components.
