import "./i18n"
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import BigPointer from "./components/BigPointer";
import "./styles/globals.css";
import useAuth from "./store/useAuth";
import { TTS } from "./lib/tts";

// ✅ Zustand es el único responsable de temas
import { useAccessibility, applyThemeToDocument } from "./store/useAccessibility";
import i18n from 'i18next'

// 🔄 LIMPIAR localStorage viejo conflictivo INMEDIATAMENTE
try {
  localStorage.removeItem("sn_theme");
  localStorage.removeItem("sn_high_contrast");
  // Nota: NO limpiamos "studentsnotes-accessibility" para que se persista correctamente
} catch { }

useAuth.getState().init();

// 🎨 Aplicar tema inicial
try {
  applyThemeToDocument(useAccessibility.getState());
} catch (err) {
  console.error("Error al aplicar tema inicial:", err);
}

function Root() {
  // ⚠️ Destructuración: accesibilidad NO tema
  // El tema es manejado por el store y onRehydrateStorage de persist
  const { fontSize, focusMode, bigPointer, interactiveHighlight, dyslexicFont, voiceEnabled, voiceRate, pointerSize } = useAccessibility();

  // 🔧 Aplicar cambios de accesibilidad al <html>
  React.useEffect(() => {
    const root = document.documentElement;

    root.dataset.fontSize = fontSize;
    root.classList.toggle("focus-mode", focusMode);
    root.classList.toggle("big-pointer", bigPointer);
    root.classList.toggle("interactive-highlight", interactiveHighlight);
    root.classList.toggle("dyslexic-font", dyslexicFont);
  }, [fontSize, focusMode, bigPointer, interactiveHighlight, dyslexicFont]);

  // 🌓 Sistema de temas ahora es 100% responsabilidad de useAccessibility
  // No necesitamos reaccionar a cambios del sistema operativo
  React.useEffect(() => {
    // Sistema de temas centralizado en Zustand
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

  React.useEffect(() => {
    let styleEl: HTMLStyleElement | null = null
    let mounted = true

    const applyCursors = async () => {
      try {
        const arrowResp = await fetch('/cursors/cursor-arrow.svg')
        let handResp: Response | null = null
        try {
          handResp = await fetch('/cursors/cursor-hand.svg')
        } catch {
          handResp = null
        }
        if (!mounted) return
        const arrowSvg = await arrowResp.text()
        // if hand not available, fallback to arrow SVG so we always have a cursor image
        const handSvg = handResp && handResp.ok ? await handResp.text() : arrowSvg

        const makeDataUrl = (svgText: string, size: number) => {
          // inject width/height into the svg tag so browsers scale it to desired px size
          const replaced = svgText.replace(/<svg([^>]*)>/, `<svg$1 width="${size}" height="${size}">`)
          // Use base64 encoding for broader compatibility across browsers
          try {
            const utf8 = encodeURIComponent(replaced)
            const b64 = typeof window !== 'undefined'
              ? window.btoa(unescape(utf8))
              : Buffer.from(replaced, 'utf8').toString('base64')
            return `data:image/svg+xml;base64,${b64}`
          } catch (err) {
            // fallback to URI-encoded svg
            return `data:image/svg+xml;utf8,${encodeURIComponent(replaced)}`
          }
        }

        const arrowUrl = makeDataUrl(arrowSvg, pointerSize)
        const handUrl = makeDataUrl(handSvg, Math.round(pointerSize * 0.9))

        const css = `html.big-pointer { cursor: url("${arrowUrl}") 0 0, auto; }\nhtml.big-pointer a, html.big-pointer button { cursor: url("${handUrl}") 0 0, pointer; }`

        styleEl = document.getElementById('custom-cursors') as HTMLStyleElement | null
        if (!styleEl) {
          styleEl = document.createElement('style')
          styleEl.id = 'custom-cursors'
          document.head.appendChild(styleEl)
        }
        styleEl.textContent = css
      } catch (e) {
        // ignore fetch failures
      }
    }

    if (bigPointer) {
      try { applyCursors() } catch { }
    }
    else {
      const existing = document.getElementById('custom-cursors')
      if (existing) existing.remove()
    }

    return () => {
      mounted = false
    }
  }, [bigPointer, pointerSize])

  return (
    <BrowserRouter>
      <App />
      <BigPointer />
    </BrowserRouter>
  );
}

// Render final
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);