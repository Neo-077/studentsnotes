import "./i18n"
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import useAuth from "./store/useAuth";
import { applyTheme } from "./lib/theme";


// ✅ IMPORTACIÓN QUE FALTABA
import { useAccessibility } from "./store/useAccessibility";

useAuth.getState().init();
applyTheme();

function Root() {
  // ⚠️ Esto debe estar dentro de un componente React, NO en el archivo global.
  const { fontSize, contrastMode, focusMode, bigPointer } = useAccessibility();

  // 🔧 Aplicar los cambios de accesibilidad directamente al <html>
  React.useEffect(() => {
    const root = document.documentElement;

    root.dataset.fontSize = fontSize;
    root.dataset.contrastMode = contrastMode;

    root.classList.toggle("focus-mode", focusMode);
    root.classList.toggle("big-pointer", bigPointer);
  }, [fontSize, contrastMode, focusMode, bigPointer]);

  // 🌓 Reacción al cambio del sistema (modo oscuro/claro)
  React.useEffect(() => {
    if (!window.matchMedia) return;

    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", () => applyTheme());
    } catch {}
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
      } catch {}
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