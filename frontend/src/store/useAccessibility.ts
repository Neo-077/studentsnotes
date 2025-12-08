import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FontSize = "small" | "medium" | "large";
export type ContrastMode = "default" | "dark" | "high";

// ===== PALETAS DE TEMAS =====

/** Paleta de tema por defecto (claro) */
const DEFAULT_PALETTE = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1E3452",
  muted: "#4F667F",
  border: "#D9E0E6",
  primary: "#63C1CA",
  "primary-ctr": "#0B1220",
  "sidebar-bg": "#1E3452",
  "sidebar-fg": "#E9EEF5",
};

/** Paleta de tema oscuro */
const DARK_PALETTE = {
  bg: "#071428",
  surface: "#071428",
  card: "#0b1722",
  text: "#E9EEF5",
  muted: "#9AA6B2",
  border: "#233240",
  primary: "#63C1CA",
  "primary-ctr": "#0B1220",
  "sidebar-bg": "#0F2431",
  "sidebar-fg": "#E9EEF5",
};

/** Paleta de alto contraste */
const HIGH_CONTRAST_PALETTE = {
  bg: "#000000",
  surface: "#000000",
  card: "#000000",
  text: "#FFFFFF",
  muted: "#F5F5F5",
  border: "#FFFFFF",
  primary: "#FFBF00",
  "primary-ctr": "#000000",
  "sidebar-bg": "#000000",
  "sidebar-fg": "#FFFFFF",
};

interface AccessibilityState {
  fontSize: FontSize;
  contrastMode: ContrastMode;
  focusMode: boolean;
  bigPointer: boolean;
  readingMaskEnabled: boolean;
  readingGuideEnabled: boolean;
  readingGuideColor: string;
  readingGuideOpacity: number;
  readingGuideThickness: number;
  readingMaskHeight: number;
  readingMaskOpacity: number;
  readingMaskColor: string;
  pointerSize: number;
  pointerColor: string;
  interactiveHighlight: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  customColorsEnabled: boolean;
  customBgColor: string;
  customTextColor: string;
  customPrimaryColor: string;
  customSidebarBgColor: string;
  customSidebarFgColor: string;
  dyslexicFont: boolean;

  setReadingMaskEnabled: (on: boolean) => void;
  setReadingGuideEnabled: (on: boolean) => void;
  setReadingGuideColor: (c: string) => void;
  setReadingGuideOpacity: (o: number) => void;
  setReadingGuideThickness: (t: number) => void;
  setReadingMaskHeight: (h: number) => void;
  setReadingMaskOpacity: (o: number) => void;
  setReadingMaskColor: (c: string) => void;
  setPointerSize: (size: number) => void;
  setPointerColor: (c: string) => void;
  setFontSize: (size: FontSize) => void;
  setContrastMode: (mode: ContrastMode) => void;
  toggleFocusMode: () => void;
  toggleBigPointer: () => void;
  setCustomColorsEnabled: (on: boolean) => void;
  setCustomBgColor: (c: string) => void;
  setCustomTextColor: (c: string) => void;
  setCustomPrimaryColor: (c: string) => void;
  setCustomSidebarBgColor: (c: string) => void;
  setCustomSidebarFgColor: (c: string) => void;
  setInteractiveHighlight: (on: boolean) => void;
  setVoiceEnabled: (on: boolean) => void;
  setVoiceRate: (rate: number) => void;
  setDyslexicFont: (on: boolean) => void;
}

/**
 * Función centralizada que aplica el tema al documento.
 * Solo necesita aplicar las clases CSS correctas.
 * Las variables ya están definidas en globals.css para cada clase.
 */
export function applyThemeToDocument(state: AccessibilityState) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // 1. Limpiar clases previas
  root.classList.remove("dark", "high-contrast");

  // 2. Limpiar todas las propiedades inline primero
  const cssVars = [
    "--bg", "--surface", "--card", "--text", "--muted", "--border",
    "--primary", "--primary-ctr", "--sidebar-bg", "--sidebar-fg"
  ];
  cssVars.forEach(prop => root.style.removeProperty(prop));

  // 3. Determinar qué clase aplicar
  if (state.customColorsEnabled) {
    // Colores personalizados (daltonismo) - aplicar como inline styles
    root.style.setProperty("--bg", state.customBgColor);
    root.style.setProperty("--surface", state.customBgColor);
    root.style.setProperty("--card", state.customBgColor);
    root.style.setProperty("--text", state.customTextColor);
    root.style.setProperty("--muted", state.customTextColor);
    root.style.setProperty("--border", state.customTextColor);
    root.style.setProperty("--primary", state.customPrimaryColor);
    root.style.setProperty("--primary-ctr", getContrastColor(state.customPrimaryColor));
    root.style.setProperty("--sidebar-bg", state.customSidebarBgColor);
    root.style.setProperty("--sidebar-fg", state.customSidebarFgColor);
    // Asegurar color-scheme light para colores custom claros
    root.style.setProperty("color-scheme", "light");
  } else if (state.contrastMode === "high") {
    // Alto contraste
    root.classList.add("high-contrast");
    root.style.setProperty("color-scheme", "dark");
  } else if (state.contrastMode === "dark") {
    // Modo oscuro
    root.classList.add("dark");
    root.style.setProperty("color-scheme", "dark");
  } else {
    // Default (claro) - usar variables de :root, asegurar color-scheme light
    root.style.setProperty("color-scheme", "light");
    // Las variables ya están definidas en :root de globals.css, no necesitamos establecerlas
  }

  // 4. Aplicar dyslexic font
  root.classList.toggle("dyslexic-font", state.dyslexicFont);
}

/**
 * Calcula un color de contraste (blanco o negro) para un color de fondo dado.
 */
function getContrastColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#FFFFFF";
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#FFFFFF";
  }
  return "#000000";
}

export const useAccessibility = create<AccessibilityState>()(
  persist(
    (set) => ({
      fontSize: "medium",
      contrastMode: "default",
      focusMode: false,
      bigPointer: false,
      readingMaskEnabled: false,
      readingGuideEnabled: false,
      readingGuideColor: "#ffbf00",
      readingGuideOpacity: 0.9,
      readingGuideThickness: 2,
      readingMaskHeight: 160,
      readingMaskOpacity: 0.35,
      readingMaskColor: "#000000",
      pointerSize: 28,
      pointerColor: "white",
      customColorsEnabled: false,
      customBgColor: "#EFF1EB",
      customTextColor: "#1E3452",
      customPrimaryColor: "#63C1CA",
      customSidebarBgColor: "#1E3452",
      customSidebarFgColor: "#E9EEF5",
      interactiveHighlight: false,
      voiceEnabled: false,
      voiceRate: 1,
      dyslexicFont: false,

      // === Métodos simples que solo actualizan estado ===
      setFontSize: (fontSize) => set({ fontSize }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      toggleBigPointer: () => set((s) => ({ bigPointer: !s.bigPointer })),
      setReadingMaskEnabled: (on) => set({ readingMaskEnabled: on }),
      setReadingGuideEnabled: (on) => set({ readingGuideEnabled: on }),
      setReadingGuideColor: (readingGuideColor) => set({ readingGuideColor }),
      setReadingGuideOpacity: (readingGuideOpacity) =>
        set({ readingGuideOpacity }),
      setReadingGuideThickness: (readingGuideThickness) =>
        set({ readingGuideThickness }),
      setReadingMaskHeight: (readingMaskHeight) => set({ readingMaskHeight }),
      setReadingMaskOpacity: (readingMaskOpacity) =>
        set({ readingMaskOpacity }),
      setReadingMaskColor: (readingMaskColor) => set({ readingMaskColor }),
      setPointerSize: (pointerSize: number) => set({ pointerSize }),
      setPointerColor: (pointerColor: string) => set({ pointerColor }),
      setInteractiveHighlight: (interactiveHighlight) =>
        set({ interactiveHighlight }),
      setVoiceEnabled: (voiceEnabled: boolean) => set({ voiceEnabled }),
      setVoiceRate: (voiceRate: number) => set({ voiceRate }),
      setDyslexicFont: (dyslexicFont: boolean) => set({ dyslexicFont }),

      // === Métodos que cambian el tema (llaman a applyThemeToDocument) ===
      setContrastMode: (contrastMode: ContrastMode) =>
        set((state) => {
          const newState = { contrastMode };
          applyThemeToDocument({ ...state, ...newState });
          return newState;
        }),

      setCustomColorsEnabled: (customColorsEnabled: boolean) =>
        set((state) => {
          const newState = { customColorsEnabled };
          applyThemeToDocument({ ...state, ...newState });
          return newState;
        }),

      setCustomBgColor: (customBgColor: string) =>
        set((state) => {
          const newState = { customBgColor };
          if (state.customColorsEnabled) {
            applyThemeToDocument({ ...state, ...newState });
          }
          return newState;
        }),

      setCustomTextColor: (customTextColor: string) =>
        set((state) => {
          const newState = { customTextColor };
          if (state.customColorsEnabled) {
            applyThemeToDocument({ ...state, ...newState });
          }
          return newState;
        }),

      setCustomPrimaryColor: (customPrimaryColor: string) =>
        set((state) => {
          const newState = { customPrimaryColor };
          if (state.customColorsEnabled) {
            applyThemeToDocument({ ...state, ...newState });
          }
          return newState;
        }),

      setCustomSidebarBgColor: (customSidebarBgColor: string) =>
        set((state) => {
          const newState = { customSidebarBgColor };
          if (state.customColorsEnabled) {
            applyThemeToDocument({ ...state, ...newState });
          }
          return newState;
        }),

      setCustomSidebarFgColor: (customSidebarFgColor: string) =>
        set((state) => {
          const newState = { customSidebarFgColor };
          if (state.customColorsEnabled) {
            applyThemeToDocument({ ...state, ...newState });
          }
          return newState;
        }),
    }),
    {
      name: "studentsnotes-accessibility",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Limpiar localStorage viejo conflictivo
        try {
          localStorage.removeItem("sn_theme");
          localStorage.removeItem("sn_high_contrast");
        } catch { }

        // Después de que persist cargue del localStorage, reaplicar el tema
        if (state) {
          applyThemeToDocument(state);
        }
      },
    }
  )
);
