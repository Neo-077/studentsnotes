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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
