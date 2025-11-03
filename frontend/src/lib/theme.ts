const STORAGE_KEY = 'sn_theme'

type Theme = 'light' | 'dark'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme | null {
  try { return (localStorage.getItem(STORAGE_KEY) as Theme) || null } catch { return null }
}

export function applyTheme(theme?: Theme) {
  const t: Theme = theme || getStoredTheme() || getSystemTheme()
  const root = document.documentElement
  if (t === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  try { localStorage.setItem(STORAGE_KEY, t) } catch {}
}

export function toggleTheme(): Theme {
  const root = document.documentElement
  const next: Theme = root.classList.contains('dark') ? 'light' : 'dark'
  applyTheme(next)
  return next
}

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}
