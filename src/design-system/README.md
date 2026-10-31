# Apollo design system

Apollo's shared visual language lives here: semantic tokens, dark/light theme
application, global defaults and reusable presentation components. It is a local
module, not a separate package or a copy of another product's design.

## Structure

```text
design-system/
  tokens.ts       # Canonical colours, fonts, sizes, spacing, radii and shadows
  theme.ts        # Live typed palette and derived CSS variables
  base.css        # Reset, global typography, scrollbars and logo animation
  styles.css      # Single shared stylesheet entry
  formStyles.ts   # Shared form and button style recipes
  components/     # Reusable presentation, using the same theme tokens
  index.ts        # Public TypeScript API
```

Product components import from `design-system`, not its implementation files.
Bootstrap imports `design-system/styles.css` once and applies the selected theme
before rendering the app. Shared components keep their existing token-based
inline styles; they do not depend on page CSS to supply their presentation.

## Tokens and themes

`tokens.ts` owns the palette and shared typography, spacing, radii and shadows.
There is no second palette in CSS. `getTheme(mode)` returns typed values;
`applyThemeMode(mode)` updates the live `theme` export and the document's CSS
variables from those same values.

Examples of derived variables are `--apollo-colors-text-primary`,
`--apollo-colors-bg-card`, `--apollo-fonts-sans`, `--apollo-fonts-size-sm`,
`--apollo-spacing-md` and `--apollo-radii-lg`. Existing `--app-*` names remain
available for the page background and scrollbars. Sizes use pixels; font weights
remain unitless.

Use semantic roles rather than creating another palette in feature code. Static
form recipes use CSS variables so they follow the selected theme even when the
module was first loaded under a different palette. Functions such as button
recipes read the current typed theme when called.

Theme selection and persistence remain owned by the existing app state. This
module does not introduce another provider, browser-storage key or preference
store. Canvas consumers read typed tokens because canvas rendering does not
inherit CSS colours.

## Reusable presentation

- `Modal` supplies the shared dialog surface and existing dismissal behaviour.
- `InfoTip` supplies compact contextual help.
- `Dot` supplies a small status marker with a caller-provided colour.
- `DatasetSkeleton` supplies decorative loading rows and a status announcement,
  never fake dataset rows.
- `LaunchCard`, `LaunchField`, `LaunchInput`, `LaunchSelect`,
  `LaunchActionButton` and `LaunchProgress` supply the repeated card/form pattern.
- Shared form-style recipes keep related inputs, labels and buttons consistent.

Owners supply content, native attributes, data and callbacks. Shared presentation
does not fetch data or decide whether a computation is allowed. Read-only feature
owners keep Run controls disabled and selected indicator choices masked.

## Feature boundaries

API clients, market models, workspace layout/state, indicator choices, dataset
navigation and synthetic example content stay outside this module. The
market-specific symbol selector stays with feature components; it consumes the
same shared tokens without moving market vocabulary into a generic primitive.
Apollo's branded logo/loader components also remain feature-owned.

Chart drawing colours and per-chart user settings are product preferences, not a
second global theme. Component-specific geometry stays local. Promote a shared
decision only when it has real consumers; do not create empty categories or a
wrapper for every HTML element.

The current values and component contracts preserve Apollo's existing appearance.
Source ownership alone is not visual, accessibility or browser certification;
changes to shared presentation need theme, interaction and rendered checks.
