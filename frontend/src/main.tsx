import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'
import useAuth from './store/useAuth'
import { applyTheme } from './lib/theme'

useAuth.getState().init()
applyTheme()

if (window.matchMedia) {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', () => applyTheme())
  } catch {}
}

// Refresh al volver de background/enfoque/conexión (throttled)
{
  let last = 0
  const throttle = async () => {
    const now = Date.now()
    if (now - last < 1500) return
    last = now
    try { await useAuth.getState().refresh() } catch {}
  }
  window.addEventListener('focus', throttle)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') throttle()
  })
  window.addEventListener('pageshow', () => throttle())
  window.addEventListener('online', throttle)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
