import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSize = "small" | "medium" | "large";
export type ContrastMode = "default" | "dark" | "high";

interface AccessibilityState {
  fontSize: FontSize;
  contrastMode: ContrastMode;
  focusMode: boolean; // modo "enfoque" cognitivo
  bigPointer: boolean; // puntero grande (clase CSS)
  setFontSize: (size: FontSize) => void;
  setContrastMode: (mode: ContrastMode) => void;
  toggleFocusMode: () => void;
  toggleBigPointer: () => void;
}

export const useAccessibility = create<AccessibilityState>()(
  persist(
    (set) => ({
      fontSize: "medium",
      contrastMode: "default",
      focusMode: false,
      bigPointer: false,
      setFontSize: (fontSize) => set({ fontSize }),
      setContrastMode: (contrastMode) => set({ contrastMode }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      toggleBigPointer: () => set((s) => ({ bigPointer: !s.bigPointer })),
    }),
    { name: "studentsnotes-accessibility" }
  )
);