/** Canonical Apollo visual tokens. No browser access or theme mutation on import. */
export type UiThemeMode = 'dark' | 'light'

const baseTheme = {
  fonts: {
    serif: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    sans: 'system-ui, sans-serif',
    mono: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
    size: { xs: 11, sm: 12, md: 13, base: 14, lg: 15, xl: 18 },
    weight: { light: 300, normal: 400, medium: 500, bold: 700 },
  },
  radii: { sm: 3, md: 5, lg: 7, xl: 11, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
} as const

const darkTheme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: '#050607',
      secondary: '#090b0e',
      card: '#0d1016',
      input: '#050607',
      hover: '#13161c',
      deep: '#0b0e14',
      surface: '#141920',
      alt: '#090c12',
      overlay: 'rgba(10,12,18,0.95)',
      /** Modal / dialog backdrop */
      scrim: 'rgba(0,0,0,0.72)',
    },
    border: {
      default: '#1a2030',
      strong: '#252d3d',
      subtle: '#0d1016',
      muted: '#2c3548',
      grid: '#1e2535',
      surface: '#141920',
    },
    text: {
      primary: '#dde4ee',
      secondary: '#8e9eb5',
      muted: '#5c6a7e',
      axisText: '#7a8a9e',
      dim: '#b8c6d8',
      dimmer: '#424e60',
      link: '#4d9fff',
      bright: '#edf2f8',
      disabled: '#333d4d',
    },
    accent: {
      primary: '#ffffff',
      blue: '#22d3ee',
      green: '#24d166',
      red: '#f05454',
      yellow: '#f0b429',
      purple: '#a78bfa',
      orange: '#f97316',
    },
    chart: {
      up: '#28c96a',
      down: '#f05454',
      grid: '#1e2535',
      crosshair: '#5a6475',
      axisText: '#5a6475',
    },
  },
  shadows: {
    card: '0 2px 12px rgba(0,0,0,0.5)',
    dropdown: '0 8px 28px rgba(0,0,0,0.7)',
    tooltip: '0 4px 20px rgba(0,0,0,0.6)',
  },
} as const

const lightTheme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: '#f5f7fb',
      secondary: '#eef3f8',
      card: '#ffffff',
      input: '#ffffff',
      hover: '#e7eef7',
      deep: '#edf2f7',
      surface: '#e3ebf5',
      alt: '#f8fbff',
      overlay: 'rgba(238,243,248,0.94)',
      scrim: 'rgba(15,23,42,0.45)',
    },
    border: {
      default: '#ccd7e5',
      strong: '#aebdd1',
      subtle: '#dfe7f1',
      muted: '#96a8c0',
      grid: '#d7e0eb',
      surface: '#e3ebf5',
    },
    text: {
      primary: '#17212f',
      secondary: '#405269',
      muted: '#66788f',
      axisText: '#5e7188',
      dim: '#2f435c',
      dimmer: '#7d8ea3',
      link: '#2563eb',
      bright: '#0b1220',
      disabled: '#a2b0c2',
    },
    accent: {
      primary: '#0b1220',
      blue: '#0891b2',
      green: '#16934a',
      red: '#dc2626',
      yellow: '#c68a00',
      purple: '#7c3aed',
      orange: '#ea580c',
    },
    chart: {
      up: '#16934a',
      down: '#dc2626',
      grid: '#d7e0eb',
      crosshair: '#78889c',
      axisText: '#66788f',
    },
  },
  shadows: {
    card: '0 8px 24px rgba(15,23,42,0.08)',
    dropdown: '0 14px 36px rgba(15,23,42,0.16)',
    tooltip: '0 8px 20px rgba(15,23,42,0.14)',
  },
} as const

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const

export type ThemeTokens = typeof darkTheme | typeof lightTheme
