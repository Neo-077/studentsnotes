import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FontSize = "small" | "medium" | "large";
export type ContrastMode = "default" | "dark" | "high";

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
  interactiveHighlight: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  customColorsEnabled: boolean;
  customBgColor: string;
  customTextColor: string;
  customPrimaryColor: string;
  customSidebarBgColor: string;
  customSidebarFgColor: string;

  setReadingMaskEnabled: (on: boolean) => void;
  setReadingGuideEnabled: (on: boolean) => void;
  setReadingGuideColor: (c: string) => void;
  setReadingGuideOpacity: (o: number) => void;
  setReadingGuideThickness: (t: number) => void;
  setReadingMaskHeight: (h: number) => void;
  setReadingMaskOpacity: (o: number) => void;
  setReadingMaskColor: (c: string) => void;
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
      customColorsEnabled: false,
      customBgColor: "#EFF1EB",
      customTextColor: "#1E3452",
      customPrimaryColor: "#63C1CA",
      customSidebarBgColor: "#1E3452",
      customSidebarFgColor: "#E9EEF5",
      interactiveHighlight: false,
      voiceEnabled: false,
      voiceRate: 1,
      setFontSize: (fontSize) => set({ fontSize }),
      setContrastMode: (contrastMode) => set({ contrastMode }),
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
      setCustomColorsEnabled: (customColorsEnabled) =>
        set({ customColorsEnabled }),
      setCustomBgColor: (customBgColor) => set({ customBgColor }),
      setCustomTextColor: (customTextColor) => set({ customTextColor }),
      setCustomPrimaryColor: (customPrimaryColor) =>
        set({ customPrimaryColor }),
      setCustomSidebarBgColor: (customSidebarBgColor) =>
        set({ customSidebarBgColor }),
      setCustomSidebarFgColor: (customSidebarFgColor) =>
        set({ customSidebarFgColor }),
      setInteractiveHighlight: (interactiveHighlight) =>
        set({ interactiveHighlight }),
      setVoiceEnabled: (voiceEnabled: boolean) => set({ voiceEnabled }),
      setVoiceRate: (voiceRate: number) => set({ voiceRate }),
    }),
    {
      name: "studentsnotes-accessibility",
      // explicit localStorage para que sea “a nivel navegador”
      storage: createJSONStorage(() => localStorage),
    }
  )
);