---
"@openui/react": minor
"@openui/svelte": minor
"@openui/astro": minor
"@openui/vue": minor
"@openui/cli": minor
---

Add a `theme` component for dark mode: a `theme` module (`theme.ts`) with the
`light`/`dark`/`system` state API, a no-flash init script, and a `ThemeToggle`
button that cycles the three modes. The choice persists under the
`openui-theme` key, applies a `dark` class on `<html>`, and `system` follows
`prefers-color-scheme` live. Implemented natively for React, Svelte, Astro, and
Vue with zero runtime dependencies; the docs site now uses it for its own dark
mode. Registry items gain `.js` siblings for plain TypeScript modules so
JavaScript projects can install `theme` too.
