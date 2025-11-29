import React, { useState, memo } from "react"
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

type Props = {
  inline?: boolean // render as inline panel (no popover)
}

function AccessibilityMenuBase({ inline = false }: Props) {
  const [expanded, setExpanded] = useState<boolean>(false)
  const [showAdvancedColors, setShowAdvancedColors] = useState<boolean>(false)

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
  const { t, i18n } = useTranslation()

  // Componente Toggle reutilizable para casillas más claras
  const Toggle = ({
    checked,
    onChange,
    label
  }: {
    checked: boolean
    onChange: (v: boolean) => void
    label: string
  }) => {
    const rowStyle: React.CSSProperties = checked
      ? {
        background: "color-mix(in oklab, var(--surface), var(--bg) 6%)",
        borderColor: "var(--border)"
      }
      : {
        background: "color-mix(in oklab, var(--surface), black 3%)",
        borderColor: "var(--border)"
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
          style={{ color: "var(--text)" }}
        >
          {label}
        </span>
        <span
          className={[
            "relative inline-flex items-center justify-center h-4 w-9 rounded-full flex-none",
            checked
              ? "bg-[color-mix(in_oklab,var(--primary),transparent_55%)]"
              : "bg-[color-mix(in_oklab,var(--muted),transparent_70%)]"
          ].join(" ")}
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

  // Pequeño wrapper para el toggle de resaltar elementos interactivos
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
      // when turning off, immediately stop any playing speech
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
        contrastMode === "default"
          ? {
            background: "#FFFFFF",
            color: "#1E3452",
            overflow: "hidden"
          }
          : undefined
      }
    >
      {/* Encabezado compacto con toggle */}
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold"
          style={
            contrastMode === "default" ? { color: "#1E3452" } : undefined
          }
        >
          {t("nav.accessibility.title")}
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-1 text-xs border rounded"
          style={
            contrastMode === "default"
              ? {
                borderColor: "#94A3B8",
                color: "#1E3452",
                background: "#E2E8F0"
              }
              : undefined
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
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
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
                      {readingMaskHeight}px
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
                      aria-label="Opacidad de la máscara"
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {Math.round(readingMaskOpacity * 100)}%
                    </span>
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="w-16 shrink-0">Color</span>
                    <input
                      type="color"
                      value={readingMaskColor}
                      onChange={e => setReadingMaskColor(e.target.value)}
                      aria-label={t("nav.accessibility.maskColorAria")}
                      className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {["#000000", "#1f2937", "#334155"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setReadingMaskColor(c)}
                          className="h-5 w-5 rounded border border-slate-500 shrink-0"
                          style={{ backgroundColor: c }}
                          aria-label={`Usar color ${c}`}
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
                      {readingGuideThickness}px
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">Opacidad</span>
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
                      aria-label="Opacidad de la guía"
                    />
                    <span className="tabular-nums w-12 text-right shrink-0">
                      {Math.round(readingGuideOpacity * 100)}%
                    </span>
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="w-16 shrink-0">Color</span>
                    <input
                      type="color"
                      value={readingGuideColor}
                      onChange={e => setReadingGuideColor(e.target.value)}
                      aria-label={t("nav.accessibility.guideColorAria")}
                      className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {["#ffbf00", "#00bcd4", "#ff4444"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setReadingGuideColor(c)}
                          className="h-5 w-5 rounded border border-slate-500 shrink-0"
                          style={{ backgroundColor: c }}
                          aria-label={`Usar color ${c}`}
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
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
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
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
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

          {/* Colores personalizados globales */}
          <section aria-labelledby="acc-colores" className="mb-3">
            <h2
              id="acc-colores"
              className="text-sm font-semibold"
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
            >
              {t("nav.accessibility.customColors")}
            </h2>

            {/* Fila con botón Editar y toggle, debajo del título */}
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 border rounded text-[0.65rem] shrink-0"
                style={
                  contrastMode === "default"
                    ? {
                      borderColor: "#94A3B8",
                      color: "#1E3452",
                      background: "#E2E8F0"
                    }
                    : undefined
                }
                onClick={() => setShowAdvancedColors(s => !s)}
                aria-expanded={showAdvancedColors}
              >
                {showAdvancedColors
                  ? t("nav.accessibility.hide")
                  : t("nav.accessibility.edit")}
              </button>

              <div className="flex-1 min-w-0">
                <Toggle
                  checked={customColorsEnabled}
                  onChange={setCustomColorsEnabled}
                  label={t("nav.accessibility.colorsActive")}
                />
              </div>
            </div>

            {customColorsEnabled && showAdvancedColors && (
              <div className="mt-2 space-y-2">
                {/* Fondo */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-16 shrink-0">
                    {t("nav.accessibility.bg")}
                  </span>
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={e => setCustomBgColor(e.target.value)}
                    aria-label={t("nav.accessibility.bgColorAria")}
                    className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {["#FFFFFF", "#0E1624", "#000000"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomBgColor(c)}
                        className="h-5 w-5 rounded border border-slate-500 shrink-0"
                        style={{ backgroundColor: c }}
                        aria-label={`Fondo ${c}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Texto */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-16 shrink-0">
                    {t("nav.accessibility.text")}
                  </span>
                  <input
                    type="color"
                    value={customTextColor}
                    onChange={e => setCustomTextColor(e.target.value)}
                    aria-label={t("nav.accessibility.textColorAria")}
                    className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {["#1E3452", "#FFFFFF", "#FFBF00"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomTextColor(c)}
                        className="h-5 w-5 rounded border border-slate-500 shrink-0"
                        style={{ backgroundColor: c }}
                        aria-label={`Texto ${c}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Primario */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-16 shrink-0">
                    {t("nav.accessibility.primary")}
                  </span>
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={e => setCustomPrimaryColor(e.target.value)}
                    aria-label={t("nav.accessibility.primaryColorAria")}
                    className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {["#63C1CA", "#FFBF00", "#6366F1"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomPrimaryColor(c)}
                        className="h-5 w-5 rounded border border-slate-500 shrink-0"
                        style={{ backgroundColor: c }}
                        aria-label={`Primario ${c}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Sidebar fondo */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-16 shrink-0">
                    {t("nav.accessibility.sidebarBg")}
                  </span>
                  <input
                    type="color"
                    value={customSidebarBgColor}
                    onChange={e => setCustomSidebarBgColor(e.target.value)}
                    aria-label={t("nav.accessibility.sidebarBgColorAria")}
                    className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {["#FFFFFF", "#1E3452"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomSidebarBgColor(c)}
                        className="h-5 w-5 rounded border border-slate-500 shrink-0"
                        style={{ backgroundColor: c }}
                        aria-label={`Sidebar ${c}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Sidebar texto */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-16 shrink-0">
                    {t("nav.accessibility.sidebarFg")}
                  </span>
                  <input
                    type="color"
                    value={customSidebarFgColor}
                    onChange={e => setCustomSidebarFgColor(e.target.value)}
                    aria-label={t("nav.accessibility.sidebarFgColorAria")}
                    className="h-6 w-8 rounded border border-slate-500 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {["#1E3452", "#FFFFFF"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomSidebarFgColor(c)}
                        className="h-5 w-5 rounded border border-slate-500 shrink-0"
                        style={{ backgroundColor: c }}
                        aria-label={`Sidebar texto ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Otras opciones */}
          <section aria-labelledby="acc-otros" className="space-y-1">
            <h2
              id="acc-otros"
              className="text-sm font-semibold"
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
            >
              {t("nav.accessibility.otherOptions")}
            </h2>
            <Toggle
              checked={focusMode}
              onChange={() => toggleFocusMode()}
              label={t("nav.accessibility.focusMode")}
            />
            <Toggle
              checked={bigPointer}
              onChange={() => toggleBigPointer()}
              label={t("nav.accessibility.bigPointer")}
            />
            {/* Highlight interactive elements */}
            <InteractiveHighlightToggle />
          </section>

          {/* Idioma */}
          <section aria-labelledby="acc-idioma" className="mt-3">
            <h2
              id="acc-idioma"
              className="text-sm font-semibold mb-1"
              style={
                contrastMode === "default" ? { color: "#1E3452" } : undefined
              }
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
        </>
      )}
    </div>
  )

  if (inline) return Panel

  return (
    <div className="relative">
      <details className="inline-block">
        <summary
          className="cursor-pointer px-2 py-1 text-sm border rounded"
          aria-label="Abrir ajustes de accesibilidad"
        >
          ♿ Accesibilidad
        </summary>
        <div
          className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border rounded shadow-lg p-3 z-50"
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
