import "./i18n"
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import useAuth from "./store/useAuth";
import { applyTheme } from "./lib/theme";
import { TTS } from "./lib/tts";

// ✅ IMPORTACIÓN QUE FALTABA
import { useAccessibility } from "./store/useAccessibility";
import i18n from 'i18next'

useAuth.getState().init();
applyTheme();

function Root() {
  // ⚠️ Esto debe estar dentro de un componente React, NO en el archivo global.
  const { fontSize, contrastMode, focusMode, bigPointer, interactiveHighlight, voiceEnabled, voiceRate } = useAccessibility();

  // 🔧 Aplicar los cambios de accesibilidad directamente al <html>
  React.useEffect(() => {
    const root = document.documentElement;

    root.dataset.fontSize = fontSize;
    root.dataset.contrastMode = contrastMode;

    root.classList.toggle("focus-mode", focusMode);
    root.classList.toggle("big-pointer", bigPointer);
    root.classList.toggle("interactive-highlight", interactiveHighlight);
  }, [fontSize, contrastMode, focusMode, bigPointer, interactiveHighlight]);

  // 🌓 Reacción al cambio del sistema (modo oscuro/claro)
  React.useEffect(() => {
    if (!window.matchMedia) return;

    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", () => applyTheme());
    } catch { }
  }, []);

  // 🔁 Refresh automático al volver de background/conexión
  React.useEffect(() => {
    let last = 0;

    const throttle = async () => {
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      try {
        await useAuth.getState().refresh();
      } catch { }
    };

    window.addEventListener("focus", throttle);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") throttle();
    });
    window.addEventListener("pageshow", throttle);
    window.addEventListener("online", throttle);

    return () => {
      window.removeEventListener("focus", throttle);
      window.removeEventListener("pageshow", throttle);
      window.removeEventListener("online", throttle);
      document.removeEventListener("visibilitychange", throttle);
    };
  }, []);

  // On first load, prefer language stored in accessibility settings (if any).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('studentsnotes-accessibility')
      if (raw) {
        const parsed = JSON.parse(raw)
        const lang = parsed?.language
        if (lang && (String(lang).startsWith('en') || String(lang).startsWith('es'))) {
          if (!i18n.language || !i18n.language.startsWith(lang)) {
            i18n.changeLanguage(lang)
          }
        }
      }
    } catch {
      // ignore parse errors
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Global delegated click/keyboard handler for click-to-speak
  React.useEffect(() => {
    if (!voiceEnabled) return

    const interactiveTags = new Set([
      'A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL', 'OPTION', 'DETAILS', 'SUMMARY', 'VIDEO', 'AUDIO', 'SVG'
    ])

    const sanitize = (s?: string) => (s || '').trim().replace(/\s+/g, ' ')

    const trySpeakFromNode = (node: Element | null) => {
      if (!node) return null
      // prefer explicit data-speak attribute
      const el = node as HTMLElement
      const ds = el.getAttribute?.('data-speak')
      if (ds && ds.trim()) return sanitize(ds)
      // aria-label, title, alt (for img)
      const aria = el.getAttribute?.('aria-label')
      if (aria && aria.trim()) return sanitize(aria)
      if (el instanceof HTMLImageElement && el.alt) return sanitize(el.alt)
      const title = el.getAttribute?.('title')
      if (title && title.trim()) return sanitize(title)
      // fallback to textContent
      const txt = sanitize(el.textContent || '')
      if (txt) return txt
      return null
    }

    const onClick = (ev: MouseEvent) => {
      try {
        const target = ev.target as Element | null
        if (!target) return

        // If an ancestor explicitly opted-in via data-speak, speak that
        const opted = (target as Element).closest?.('[data-speak]') as Element | null
        if (opted) {
          const text = trySpeakFromNode(opted)
          if (text) {
            TTS.stop()
            TTS.speak(text, { rate: voiceRate })
          }
          return
        }

        // If clicked element (or nearby ancestor up to 3 levels) is interactive, do not auto-speak
        let node: Element | null = target
        for (let i = 0; i < 4 && node; i++) {
          if (interactiveTags.has(node.tagName)) return
          node = node.parentElement
        }

        // otherwise speak the clicked element's text (trimmed)
        const text = trySpeakFromNode(target)
        if (text) {
          TTS.stop()
          TTS.speak(text.slice(0, 400), { rate: voiceRate })
        }
      } catch (e) {
        // ignore
      }
    }

    const onKeyDown = (ev: KeyboardEvent) => {
      if (!(ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar')) return
      const active = document.activeElement as Element | null
      if (!active) return
      // If focused element has data-speak, speak it
      const opted = active.closest?.('[data-speak]') as Element | null
      if (opted) {
        const text = trySpeakFromNode(opted)
        if (text) {
          ev.preventDefault()
          TTS.stop()
          TTS.speak(text, { rate: voiceRate })
        }
        return
      }
      // skip if focus is on interactive control
      if (interactiveTags.has(active.tagName)) return
      const text = trySpeakFromNode(active)
      if (text) {
        ev.preventDefault()
        TTS.stop()
        TTS.speak(text, { rate: voiceRate })
      }
    }

    document.addEventListener('click', onClick, { capture: true })
    document.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      document.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [voiceEnabled, voiceRate])

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

// Render final
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);