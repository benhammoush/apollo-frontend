/** Live typed palette and CSS adapter; the existing persisted app state owns selection. */
import { themes, type ThemeTokens, type UiThemeMode } from './tokens'

export let theme: ThemeTokens = themes.dark
let currentThemeMode: UiThemeMode = 'dark'

export function getTheme(mode: UiThemeMode = currentThemeMode): ThemeTokens {
  return themes[mode]
}

export function getThemeMode(): UiThemeMode {
  return currentThemeMode
}

/** Derive CSS values from the canonical tokens, including existing app-variable names. */
export function getThemeCssVariables(mode: UiThemeMode): Record<string, string> {
  const selected = getTheme(mode)
  const variables: Record<string, string> = {}
  function visit(value: unknown, keys: string[]) {
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) visit(child, [...keys, key])
      return
    }
    const name = '--apollo-' + keys.join('-').replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
    const pixels = typeof value === 'number' && (keys[0] === 'radii' || keys[0] === 'spacing' || keys[1] === 'size')
    variables[name] = String(value) + (pixels ? 'px' : '')
  }
  visit(selected, [])
  return {
    ...variables,
    '--app-bg': selected.colors.bg.primary,
    '--app-fg': selected.colors.text.primary,
    '--app-scrollbar-track': selected.colors.bg.card,
    '--app-scrollbar-thumb': selected.colors.border.strong,
    '--app-scrollbar-thumb-hover': selected.colors.border.muted,
  }
}

export function applyThemeMode(mode: UiThemeMode): ThemeTokens {
  currentThemeMode = mode
  theme = getTheme(mode)
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.dataset.theme = mode
    root.style.colorScheme = mode
    for (const [name, value] of Object.entries(getThemeCssVariables(mode))) {
      root.style.setProperty(name, value)
    }
  }
  return theme
}

/** `#RRGGBB` → `rgba(r,g,b,a)` for borders and glows that follow the active palette. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
