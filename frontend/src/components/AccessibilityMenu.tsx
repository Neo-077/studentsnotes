import React, { useState, memo, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAccessibility } from "../store/useAccessibility"
import { TTS } from "../lib/tts"

// Subselectores para reducir re-renders (cada grupo independiente)
const useFontSize = () =>
  useAccessibility(s => ({ fontSize: s.fontSize, setFontSize: s.setFontSize }))
const useContrast = () =>
  useAccessibility(s => ({
    contrastMode: s.contrastMode,
    setContrastMode: s.setContrastMode
  }))
const useFocusBigPointer = () =>
  useAccessibility(s => ({
    focusMode: s.focusMode,
    bigPointer: s.bigPointer,
    toggleFocusMode: s.toggleFocusMode,
    toggleBigPointer: s.toggleBigPointer
  }))
const useReadingMask = () =>
  useAccessibility(s => ({
    readingMaskEnabled: s.readingMaskEnabled,
    readingMaskHeight: s.readingMaskHeight,
    readingMaskOpacity: s.readingMaskOpacity,
    readingMaskColor: s.readingMaskColor,
    setReadingMaskEnabled: s.setReadingMaskEnabled,
    setReadingMaskHeight: s.setReadingMaskHeight,
    setReadingMaskOpacity: s.setReadingMaskOpacity,
    setReadingMaskColor: s.setReadingMaskColor
  }))
const useReadingGuide = () =>
  useAccessibility(s => ({
    readingGuideEnabled: s.readingGuideEnabled,
    readingGuideColor: s.readingGuideColor,
    readingGuideOpacity: s.readingGuideOpacity,
    readingGuideThickness: s.readingGuideThickness,
    setReadingGuideEnabled: s.setReadingGuideEnabled,
    setReadingGuideColor: s.setReadingGuideColor,
    setReadingGuideOpacity: s.setReadingGuideOpacity,
    setReadingGuideThickness: s.setReadingGuideThickness
  }))
const useCustomColors = () =>
  useAccessibility(s => ({
    customColorsEnabled: s.customColorsEnabled,
    customBgColor: s.customBgColor,
    customTextColor: s.customTextColor,
    customPrimaryColor: s.customPrimaryColor,
    customSidebarBgColor: s.customSidebarBgColor,
    customSidebarFgColor: s.customSidebarFgColor,
    setCustomColorsEnabled: s.setCustomColorsEnabled,
    setCustomBgColor: s.setCustomBgColor,
    setCustomTextColor: s.setCustomTextColor,
    setCustomPrimaryColor: s.setCustomPrimaryColor,
    setCustomSidebarBgColor: s.setCustomSidebarBgColor,
    setCustomSidebarFgColor: s.setCustomSidebarFgColor
  }))

const useInteractiveHighlight = () =>
  useAccessibility(s => ({
    interactiveHighlight: s.interactiveHighlight,
    setInteractiveHighlight: s.setInteractiveHighlight
  }))

const useVoice = () =>
  useAccessibility(s => ({
    voiceEnabled: s.voiceEnabled,
    setVoiceEnabled: s.setVoiceEnabled,
    voiceRate: s.voiceRate,
    setVoiceRate: s.setVoiceRate
  }))

const usePointer = () =>
  useAccessibility(s => ({
    pointerSize: s.pointerSize,
    setPointerSize: s.setPointerSize,
    bigPointer: s.bigPointer,
    pointerColor: s.pointerColor,
    setPointerColor: s.setPointerColor
  }))

type Props = {
  inline?: boolean // render as inline panel (no popover)
}

function AccessibilityMenuBase({ inline = false }: Props) {
  const [expanded, setExpanded] = useState<boolean>(false)
  const [showAdvancedColors, setShowAdvancedColors] = useState<boolean>(false)
  const [showColorBlindOptions, setShowColorBlindOptions] = useState<boolean>(false)

  const { fontSize, setFontSize } = useFontSize()
  const { contrastMode, setContrastMode } = useContrast()
  const { focusMode, bigPointer, toggleFocusMode, toggleBigPointer } =
    useFocusBigPointer()
  const {
    readingMaskEnabled,
    readingMaskHeight,
    readingMaskOpacity,
    readingMaskColor,
    setReadingMaskEnabled,
    setReadingMaskHeight,
    setReadingMaskOpacity,
    setReadingMaskColor
  } = useReadingMask()
  const {
    readingGuideEnabled,
    readingGuideColor,
    readingGuideOpacity,
    readingGuideThickness,
    setReadingGuideEnabled,
    setReadingGuideColor,
    setReadingGuideOpacity,
    setReadingGuideThickness
  } = useReadingGuide()
  const {
    customColorsEnabled,
    customBgColor,
    customTextColor,
    customPrimaryColor,
    customSidebarBgColor,
    customSidebarFgColor,
    setCustomColorsEnabled,
    setCustomBgColor,
    setCustomTextColor,
    setCustomPrimaryColor,
    setCustomSidebarBgColor,
    setCustomSidebarFgColor
  } = useCustomColors()

  // ✅ Hook para fuente disléxica en el tope (no dentro del condicional)
  const { dyslexicFont, setDyslexicFont } = useAccessibility(s => ({
    dyslexicFont: s.dyslexicFont,
    setDyslexicFont: s.setDyslexicFont
  }))

  const { pointerSize, setPointerSize, pointerColor, setPointerColor } = usePointer()
  const { t, i18n } = useTranslation()

  // === Paletas para daltonismo (usa los setters ya existentes de colores) ===
  const applyDaltonismPalette = (
    preset: "protanopia" | "deuteranopia" | "tritanopia" = "protanopia"
  ) => {
    setCustomColorsEnabled(true)

    if (preset === "protanopia" || preset === "deuteranopia") {
      setCustomBgColor("#FFFFFF")
      setCustomTextColor("#000000")
      setCustomPrimaryColor("#0072E3")
      setCustomSidebarBgColor("#003D7A")
      setCustomSidebarFgColor("#FFFFFF")
    } else if (preset === "tritanopia") {
      setCustomBgColor("#FFFFFF")
      setCustomTextColor("#000000")
      setCustomPrimaryColor("#E60000")
      setCustomSidebarBgColor("#1A1A1A")
      setCustomSidebarFgColor("#FFFFFF")
    }
  }

  // Helper para estilo de h2 en el panel
  const getH2Style = (): React.CSSProperties => {
    if (customColorsEnabled) {
      return { color: customSidebarFgColor }
    }
    if (contrastMode === "default") {
      return { color: "#1E3452" }
    }
    return { color: "var(--text)" }
  }

  // Componente Toggle reutilizable
  const Toggle = ({
    checked,
    onChange,
    label
  }: {
    checked: boolean
    onChange: (v: boolean) => void
    label: string
  }) => {
    const rowStyle: React.CSSProperties = customColorsEnabled
      ? {
        background: customSidebarBgColor,
        borderColor: customSidebarFgColor,
        color: customSidebarFgColor
      }
      : checked
        ? {
          background: "color-mix(in oklab, var(--surface), var(--bg) 6%)",
          borderColor: "var(--border)",
          color: "var(--text)"
        }
        : {
          background: "color-mix(in oklab, var(--surface), black 3%)",
          borderColor: "var(--border)",
          color: "var(--text)"
        }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-btn group flex items-center w-full text-xs px-2 py-1 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        style={rowStyle}
      >
        <span
          className="text-left font-medium select-none flex-1 min-w-0 truncate"
          style={{ color: customColorsEnabled ? customSidebarFgColor : "var(--text)" }}
        >
          {label}
        </span>
        <span
          className={[
            "relative inline-flex items-center justify-center h-4 w-9 rounded-full flex-none",
            checked
              ? customColorsEnabled
                ? `bg-[${customPrimaryColor}]`
                : "bg-[color-mix(in_oklab,var(--primary),transparent_55%)]"
              : "bg-[color-mix(in_oklab,var(--muted),transparent_70%)]"
          ].join(" ")}
          style={checked && customColorsEnabled ? { backgroundColor: "#63C1CA" } : undefined}
          aria-hidden="true"
        >
          <span
            className={[
              "absolute left-0 top-0 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            ].join(" ")}
            style={{
              border:
                "1px solid color-mix(in oklab, var(--primary), transparent 55%)"
            }}
          />
          <span className="text-[0.6rem] uppercase tracking-wide opacity-70 text-[color-mix(in_oklab,var(--text),transparent_30%)]">
            {checked ? "ON" : "OFF"}
          </span>
        </span>
      </button>
    )
  }

  const InteractiveHighlightToggle = () => {
    const { interactiveHighlight, setInteractiveHighlight } = useInteractiveHighlight()
    return (
      <Toggle
        checked={interactiveHighlight}
        onChange={setInteractiveHighlight}
        label={t("nav.accessibility.highlightInteractive")}
      />
    )
  }

  const VoiceControls = () => {
    const { voiceEnabled, setVoiceEnabled } = useVoice()

    const onToggle = (on: boolean) => {
      if (!on) TTS.stop()
      setVoiceEnabled(on)
    }

    return (
      <div className="space-y-2">
        <Toggle
          checked={voiceEnabled}
          onChange={onToggle}
          label={t("nav.accessibility.voiceEnable")}
        />
        <p className="text-xs opacity-70 pl-2">{t("nav.accessibility.voiceHint")}</p>
      </div>
    )
  }

  const Panel = (
    <div
      role="region"
      aria-label="Configuración de accesibilidad"
      className={`${expanded ? "space-y-3" : ""} accessibility-panel`}
      style={
        customColorsEnabled
          ? {
            background: customSidebarBgColor,
            color: customSidebarFgColor,
            overflow: "hidden"
          }
          : contrastMode === "default"
            ? {
              background: "#FFFFFF",
              color: "#1E3452",
              overflow: "hidden"
            }
            : {
              background: "var(--card)",
              color: "var(--text)",
              overflow: "hidden"
            }
      }
    >
      {/* Encabezado compacto con toggle */}
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold"
          style={
            customColorsEnabled
              ? { color: customSidebarFgColor }
              : contrastMode === "default" ? { color: "#1E3452" } : { color: "var(--text)" }
          }
        >
          {t("nav.accessibility.title")}
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-1 text-xs border rounded"
          style={
            customColorsEnabled
              ? {
                borderColor: customSidebarFgColor,
                color: customSidebarFgColor,
                background: customSidebarBgColor,
                opacity: 0.8
              }
              : contrastMode === "default"
                ? {
                  borderColor: "#94A3B8",
                  color: "#1E3452",
                  background: "#E2E8F0"
                }
                : {
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "var(--surface)"
                }
          }
          aria-expanded={expanded}
          aria-label={expanded ? "Contraer opciones" : "Expandir opciones"}
        >
          {expanded ? t("nav.accessibility.hide") : t("nav.accessibility.show")}
        </button>
      </div>

      {!expanded && (
        <p className="mt-1 text-[0.72rem] opacity-70">
          {t("nav.accessibility.hintShow")}
        </p>
      )}

      {expanded && (
        <>
          {/* Herramientas de lectura */}
          <section aria-labelledby="acc-lectura" className="mb-3">
            <h2
              id="acc-lectura"
              className="text-sm font-semibold"
              style={getH2Style()}
            >
              {t("nav.accessibility.readingTools")}
            </h2>
            {/* Máscara de lectura */}
            <div className="mt-2 space-y-2">
              <Toggle
                checked={readingMaskEnabled}
                onChange={setReadingMaskEnabled}
                label={t("nav.accessibility.readingMask")}
              />
              {readingMaskEnabled && (
                <div className="grid gap-2 pl-2">
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">
                      {t("nav.accessibility.height")}
                    </span>
                    <input
                      type="range"
                      min={80}
                      max={320}
                      step={10}
                      value={readingMaskHeight}
                      onChange={e =>
                        setReadingMaskHeight(Number(e.target.value))
                      }
                      className="flex-1 min-w-0"
                      aria-label="Altura de la máscara"
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {readingMaskHeight}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">
                      {t("nav.accessibility.opacity")}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={readingMaskOpacity}
                      onChange={e =>
                        setReadingMaskOpacity(Number(e.target.value))
                      }
                      className="flex-1 min-w-0"
                      aria-label={`${t("nav.accessibility.opacity")} ${t("nav.accessibility.readingMask")}`}
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {Math.round(readingMaskOpacity * 100)}%
                    </span>
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="w-16 shrink-0">Color</span>
                    <div className="flex gap-1 flex-wrap">
                      {["#ffbf00", "#00bcd4", "#ff4444"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setReadingMaskColor(c)}
                          className="h-5 w-5 rounded border border-slate-500 shrink-0"
                          style={{ backgroundColor: c }}
                          aria-label={`Usar color ${c}`}
                          title={c}
                        />
                      ))}
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Text-to-speech controls */}
            <div className="mt-3">
              <h3 className="text-xs font-medium mb-1">{t("nav.accessibility.voiceTitle")}</h3>
              <VoiceControls />
            </div>

            {/* Guía de lectura (línea) */}
            <div className="mt-3 space-y-2">
              <Toggle
                checked={readingGuideEnabled}
                onChange={setReadingGuideEnabled}
                label={t("nav.accessibility.readingGuide")}
              />
              {readingGuideEnabled && (
                <div className="grid gap-2 pl-2">
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">
                      {t("nav.accessibility.thickness")}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={readingGuideThickness}
                      onChange={e =>
                        setReadingGuideThickness(Number(e.target.value))
                      }
                      className="flex-1 min-w-0"
                      aria-label="Grosor de la guía"
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {readingGuideThickness}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">{t("nav.accessibility.opacity")}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={readingGuideOpacity}
                      onChange={e =>
                        setReadingGuideOpacity(Number(e.target.value))
                      }
                      className="flex-1 min-w-0"
                      aria-label={`${t("nav.accessibility.opacity")} ${t("nav.accessibility.readingGuide")}`}
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {Math.round(readingGuideOpacity * 100)}%
                    </span>
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="w-16 shrink-0">Color</span>
                    <div className="flex gap-1 flex-wrap">
                      {["#ffbf00", "#00bcd4", "#ff4444"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setReadingGuideColor(c)}
                          className="h-5 w-5 rounded border border-slate-500 shrink-0"
                          style={{ backgroundColor: c }}
                          aria-label={`Usar color ${c}`}
                          title={c}
                        />
                      ))}
                    </div>
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* Tamaño de texto */}
          <section aria-labelledby="acc-fuente" className="mb-2">
            <h2
              id="acc-fuente"
              className="text-sm font-semibold"
              style={getH2Style()}
            >
              {t("nav.accessibility.textSize")}
            </h2>
            <div className="flex gap-2 mt-1">
              {(["medium", "large"] as const).map(size => (
                <button
                  key={size}
                  type="button"
                  className={`px-2 py-1 border rounded text-xs ${fontSize === size ? "bg-slate-200 dark:bg-slate-700" : ""
                    }`}
                  style={
                    contrastMode === "default"
                      ? {
                        borderColor:
                          fontSize === size ? "#64748b" : "#CBD5E1",
                        color: "#1E3452",
                        background:
                          fontSize === size ? "#CBD5E1" : "#F8FAFC",
                        fontWeight: fontSize === size ? "600" : "400"
                      }
                      : undefined
                  }
                  onClick={() => setFontSize(size)}
                >
                  {size === "medium" && "A"}
                  {size === "large" && "A+"}
                </button>
              ))}
            </div>
          </section>

          {/* Contraste */}
          <section aria-labelledby="acc-contraste" className="mb-2">
            <h2
              id="acc-contraste"
              className="text-sm font-semibold"
              style={getH2Style()}
            >
              {t("nav.accessibility.contrast")}
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(["default", "dark", "high"] as const).map(m => {
                const active = contrastMode === m
                const style =
                  contrastMode === "default"
                    ? {
                      borderColor: active ? "#64748b" : "#CBD5E1",
                      color: "#1E3452",
                      background: active ? "#CBD5E1" : "#F8FAFC",
                      fontWeight: active ? ("600" as const) : ("400" as const)
                    }
                    : {
                      borderColor: "var(--border)",
                      color: "var(--text)",
                      background: active
                        ? "color-mix(in oklab, var(--surface), white 4%)"
                        : "color-mix(in oklab, var(--surface), black 3%)",
                      fontWeight: active ? ("600" as const) : ("400" as const)
                    }
                const label =
                  m === "default"
                    ? t("nav.accessibility.contrastNormal")
                    : m === "dark"
                      ? t("nav.accessibility.contrastDark")
                      : t("nav.accessibility.contrastHigh")
                return (
                  <button
                    key={m}
                    type="button"
                    className={`px-2 py-1 border rounded text-xs ${active ? "bg-slate-200 dark:bg-slate-700" : ""
                      }`}
                    style={style}
                    onClick={() => setContrastMode(m)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Modo Daltonismo */}
          <section aria-labelledby="acc-daltonismo" className="mb-3">
            <h2
              id="acc-daltonismo"
              className="text-sm font-semibold"
              style={getH2Style()}
            >
              {t("nav.accessibility.colorBlindMode", "Modo Daltonismo")}
            </h2>
            <div className="mt-1 space-y-2">
              <button
                type="button"
                className="px-2 py-1 border rounded text-[0.65rem] w-full text-left shrink-0"
                style={
                  contrastMode === "default"
                    ? {
                      borderColor: "#94A3B8",
                      color: "#1E3452",
                      background: "#E2E8F0"
                    }
                    : undefined
                }
                onClick={() => setShowColorBlindOptions(s => !s)}
                aria-expanded={showColorBlindOptions}
              >
                {showColorBlindOptions ? "▼ Opciones" : "► Seleccionar paleta"}
              </button>

              {showColorBlindOptions && (
                <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => applyDaltonismPalette("protanopia")}
                    className="w-full px-2.5 py-2 border rounded text-xs text-left transition hover:shadow-sm"
                    style={
                      contrastMode === "default"
                        ? {
                          borderColor: "#0072E3",
                          color: "#003D7A",
                          background: "#E3F0FF",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#0072E3" ? "600" : "400"
                        }
                        : {
                          background: "var(--surface)",
                          color: "var(--text)",
                          borderColor: "#0072E3",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#0072E3" ? "600" : "400"
                        }
                    }
                  >
                    <span className="font-semibold block mb-0.5">🔵 Protanopía</span>
                    <span className="text-[0.6rem] opacity-75">
                      {t("nav.accessibility.colorBlindRG", "Daltonismo rojo-verde - Visión azul/amarillo")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDaltonismPalette("deuteranopia")}
                    className="w-full px-2.5 py-2 border rounded text-xs text-left transition hover:shadow-sm"
                    style={
                      contrastMode === "default"
                        ? {
                          borderColor: "#0072E3",
                          color: "#003D7A",
                          background: "#E3F0FF",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#0072E3" ? "600" : "400"
                        }
                        : {
                          background: "var(--surface)",
                          color: "var(--text)",
                          borderColor: "#0072E3",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#0072E3" ? "600" : "400"
                        }
                    }
                  >
                    <span className="font-semibold block mb-0.5">🔵 Deuteranopía</span>
                    <span className="text-[0.6rem] opacity-75">
                      {t("nav.accessibility.colorBlindGreen", "Daltonismo rojo-verde - Insensibilidad al verde")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDaltonismPalette("tritanopia")}
                    className="w-full px-2.5 py-2 border rounded text-xs text-left transition hover:shadow-sm"
                    style={
                      contrastMode === "default"
                        ? {
                          borderColor: "#E60000",
                          color: "#8B0000",
                          background: "#FFE3E3",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#E60000" ? "600" : "400"
                        }
                        : {
                          background: "var(--surface)",
                          color: "var(--text)",
                          borderColor: "#E60000",
                          fontWeight: customColorsEnabled && customPrimaryColor === "#E60000" ? "600" : "400"
                        }
                    }
                  >
                    <span className="font-semibold block mb-0.5">🔴 Tritanopía</span>
                    <span className="text-[0.6rem] opacity-75">
                      {t("nav.accessibility.colorBlindBY", "Daltonismo azul-amarillo")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomColorsEnabled(false)}
                    className="w-full px-2.5 py-2 border rounded text-xs text-left transition hover:shadow-sm"
                    style={
                      contrastMode === "default"
                        ? {
                          borderColor: "#94A3B8",
                          color: "#4B5563",
                          background: "#F1F5F9",
                          fontWeight: !customColorsEnabled ? "600" : "400"
                        }
                        : {
                          background: "var(--surface)",
                          color: "var(--text)",
                          borderColor: "var(--border)",
                          fontWeight: !customColorsEnabled ? "600" : "400"
                        }
                    }
                  >
                    <span className="font-semibold block mb-0.5">✕ Deshabilitado</span>
                    <span className="text-[0.6rem] opacity-75">Usar colores normales</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Otras opciones */}
          <section aria-labelledby="acc-otros" className="space-y-1">
            <h2
              id="acc-otros"
              className="text-sm font-semibold"
              style={getH2Style()}
            >
              {t("nav.accessibility.otherOptions")}
            </h2>

            <Toggle
              checked={bigPointer}
              onChange={() => toggleBigPointer()}
              label={t("nav.accessibility.bigPointer")}
            />
            {bigPointer && (
              <div className="pl-2">
                <label className="flex items-center gap-3 text-xs">
                  <input
                    type="range"
                    min={12}
                    max={120}
                    step={2}
                    value={pointerSize}
                    onChange={e => setPointerSize(Number(e.target.value))}
                    className="accessibility-range flex-1 min-w-0"
                    aria-label="Tamaño del puntero"
                  />
                  <span className="tabular-nums w-12 text-right shrink-0">
                    {pointerSize}
                  </span>
                </label>
              </div>
            )}
            {bigPointer && (
              <div className="mt-2 pl-2">
                <span className="text-xs block mb-1">Puntero</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`p-1 border rounded ${pointerColor === 'white' ? 'ring-2 ring-offset-1' : ''}`}
                    onClick={() => setPointerColor('white')}
                    aria-pressed={pointerColor === 'white'}
                    title="Blanco"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                      <path d="M2 2 L14 12 L10 14 L12 20 L8 22 L6 16 L2 2" fill="#ffffff" stroke="#000" strokeWidth="0" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`p-1 border rounded ${pointerColor === 'black' ? 'ring-2 ring-offset-1' : ''}`}
                    onClick={() => setPointerColor('black')}
                    aria-pressed={pointerColor === 'black'}
                    title="Negro"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                      <path d="M2 2 L14 12 L10 14 L12 20 L8 22 L6 16 L2 2" fill="#000000" stroke="#fff" strokeWidth="0" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {/* Highlight interactive elements */}
            <InteractiveHighlightToggle />
          </section>

          {/* Fuente para dislexia */}
          <section aria-labelledby="acc-dyslexic" className="mt-3">
            <h2
              id="acc-dyslexic"
              className="text-sm font-semibold mb-1"
              style={getH2Style()}
            >
              {t("nav.accessibility.dyslexicFont")}
            </h2>
            <Toggle
              checked={dyslexicFont}
              onChange={setDyslexicFont}
              label={t("nav.accessibility.dyslexicFontEnable")}
            />
          </section>

          {/* Idioma */}
          <section aria-labelledby="acc-idioma" className="mt-3">
            <h2
              id="acc-idioma"
              className="text-sm font-semibold mb-1"
              style={getH2Style()}
            >
              {t("nav.accessibility.language")}
            </h2>
            <div className="flex gap-2">
              {["es", "en"].map(l => {
                const active = i18n.language.startsWith(l)
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(l)
                      try {
                        const raw = localStorage.getItem('studentsnotes-accessibility')
                        const parsed = raw ? JSON.parse(raw) : {}
                        parsed.language = l
                        localStorage.setItem('studentsnotes-accessibility', JSON.stringify(parsed))
                      } catch { }
                    }}
                    className={[
                      "px-2 py-1 border rounded text-xs transition",
                      active ? "font-semibold" : "opacity-80"
                    ].join(" ")}
                    style={
                      contrastMode === "default"
                        ? {
                          borderColor: active ? "#64748b" : "#CBD5E1",
                          background: active ? "#CBD5E1" : "#F8FAFC",
                          color: "#1E3452"
                        }
                        : {
                          borderColor: "var(--border)",
                          background: active
                            ? "color-mix(in oklab, var(--surface), white 4%)"
                            : "color-mix(in oklab, var(--surface), black 3%)",
                          color: "var(--text)"
                        }
                    }
                    aria-pressed={active}
                  >
                    {l.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Reset */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                try {
                  const store = useAccessibility.getState()

                  store.setCustomColorsEnabled(false)
                  store.setContrastMode("default")
                  store.setVoiceEnabled(false)
                  store.setReadingMaskEnabled(false)
                  store.setReadingGuideEnabled(false)
                  store.setFontSize("medium")
                  store.setInteractiveHighlight(false)
                  store.setDyslexicFont(false)

                  if (store.bigPointer) store.toggleBigPointer()
                  if (store.focusMode) store.toggleFocusMode()

                  localStorage.removeItem('studentsnotes-accessibility')
                  localStorage.removeItem('sn_high_contrast')
                } catch { }
                window.location.reload()
              }}
              className="text-[0.82rem] px-3 py-1 rounded-md border transition bg-transparent"
              title={"Reestablecer accesibilidad"}
            >
              Reestablecer accesibilidad
            </button>
          </div>
        </>
      )}
    </div>
  )

  if (inline) return Panel

  const detailsRef = useRef<HTMLDetailsElement | null>(null)
  const [open, setOpen] = useState<boolean>(false)

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (detailsRef.current) detailsRef.current.open = false
        setOpen(false)
      }
    }

    function onPointerDown(e: PointerEvent) {
      const el = detailsRef.current
      if (!el) return
      const target = e.target as Node | null
      if (target && !el.contains(target)) {
        el.open = false
        setOpen(false)
      }
    }

    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)

    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <div className="relative">
      <details
        className="inline-block"
        ref={detailsRef}
        onToggle={() => setOpen(detailsRef.current ? !!detailsRef.current.open : false)}
      >
        <summary
          className="cursor-pointer px-2 py-1 text-sm border rounded"
          style={
            customColorsEnabled
              ? {
                borderColor: customTextColor,
                color: customTextColor,
                background: customBgColor,
              }
              : contrastMode === "default"
                ? {
                  borderColor: "#94A3B8",
                  color: "#1E3452",
                  background: "#E2E8F0"
                }
                : undefined
          }
          aria-label="Abrir ajustes de accesibilidad"
          aria-expanded={open}
        >
          Accesibilidad
        </summary>
        <div
          className="absolute right-0 mt-2 w-72 rounded shadow-lg p-3 z-50"
          style={
            customColorsEnabled
              ? {
                background: customBgColor,
                borderColor: customTextColor,
                border: `1px solid ${customTextColor}`,
                color: customTextColor
              }
              : contrastMode === "default"
                ? {
                  background: "#FFFFFF",
                  borderColor: "#D9E0E6",
                  border: "1px solid #D9E0E6",
                  color: "#1E3452"
                }
                : {
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  border: "1px solid var(--border)",
                  color: "var(--text)"
                }
          }
          role="dialog"
          aria-label="Configuración de accesibilidad"
        >
          {Panel}
        </div>
      </details>
    </div>
  )
}

export const AccessibilityMenu = memo(AccessibilityMenuBase)
