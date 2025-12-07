import React, { useEffect, useRef, useState } from "react"
import { useAccessibility } from "../store/useAccessibility"
import { TTS } from "../lib/tts"

type Props = {
  children: React.ReactNode
  /** Texto a leer explícitamente (opcional). Si se pasa, ignora la inferencia de tabla. */
  text?: string
  /** Nombre de la columna (opcional). Si no se provee, intenta inferirlo desde la cabecera de la tabla */
  column?: string
  /** Forzar aria-label (si quieres algo distinto a lo que se habla) */
  ariaLabelOverride?: string
  className?: string
  title?: string
}

/**
 * Componente de accesibilidad que:
 * - Si está dentro de una celda de tabla (<td>/<th>), intenta leer: "Encabezado, Valor".
 * - Si se pasa `column`, lee: "column, valor".
 * - Si se pasa `text`, lee exactamente ese texto.
 * - Expone un aria-label que coincide con lo que va a hablar.
 * - Responde a click y a Enter/Espacio (si la voz está activada).
 */
export const SpeakOnClick: React.FC<Props> = ({
  children,
  text,
  column,
  ariaLabelOverride,
  className,
  title,
}) => {
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const elRef = useRef<HTMLSpanElement | null>(null)
  const [ariaLabel, setAriaLabel] = useState<string | undefined>()

  const speak = (payload?: string) => {
    if (!voiceEnabled) return

    let content = payload

    // Fallback: si no vino payload, intentar usar children si es string/number
    if (!content) {
      if (typeof children === "string" || typeof children === "number") {
        content = String(children)
      }
    }

    if (!content) return

    if (TTS.isSupported()) {
      TTS.speak(content, { rate: voiceRate })
    }
  }

  const inferHeaderAndValue = (el: HTMLElement) => {
    if (typeof document === "undefined") return el.textContent?.trim() || undefined

    // Buscar la celda (td/th) contenedora
    let cell: HTMLTableCellElement | null = null
    let parent: HTMLElement | null = el
    while (parent) {
      if (parent.tagName === "TD" || parent.tagName === "TH") {
        cell = parent as HTMLTableCellElement
        break
      }
      parent = parent.parentElement
    }

    const valueText = el.textContent?.trim() || undefined
    if (!cell) return valueText

    const table = cell.closest("table") as HTMLTableElement | null
    if (!table) return valueText

    // Calcular índice de columna (colStart), respetando colSpan
    const computeColStart = (c: HTMLTableCellElement) => {
      let start = 0
      let prev = c.previousElementSibling as HTMLTableCellElement | null
      while (prev) {
        const span =
          prev.colSpan && Number.isFinite(prev.colSpan) ? prev.colSpan : 1
        start += span
        prev = prev.previousElementSibling as HTMLTableCellElement | null
      }
      return start
    }

    const colStart = computeColStart(cell)

    // 1) Intentar con aria-labelledby
    const ariaLabelled = cell.getAttribute?.("aria-labelledby")
    if (ariaLabelled) {
      const ids = ariaLabelled.split(/\s+/).filter(Boolean)
      const parts: string[] = []
      for (const id of ids) {
        const ref = document.getElementById(id)
        if (ref) parts.push(ref.textContent?.trim() || "")
      }
      const headerText = parts.filter(Boolean).join(" ")
      if (headerText) {
        return headerText + (valueText ? `, ${valueText}` : "")
      }
    }

    // 2) Intentar con atributo headers
    const headersAttr = cell.getAttribute?.("headers")
    if (headersAttr) {
      const ids = headersAttr.split(/\s+/).filter(Boolean)
      const parts: string[] = []
      for (const id of ids) {
        const ref = document.getElementById(id)
        if (ref) parts.push(ref.textContent?.trim() || "")
      }
      const headerText = parts.filter(Boolean).join(" ")
      if (headerText) {
        return headerText + (valueText ? `, ${valueText}` : "")
      }
    }

    // 3) Buscar en thead (soporta cabeceras con colSpan)
    let headerText: string | undefined
    if (table.tHead && table.tHead.rows.length > 0) {
      for (let r = 0; r < table.tHead.rows.length; r++) {
        const headerRow = table.tHead.rows[r]
        let cum = 0
        for (let i = 0; i < headerRow.cells.length; i++) {
          const hc = headerRow.cells[i]
          const span =
            hc.colSpan && Number.isFinite(hc.colSpan) ? hc.colSpan : 1
          if (colStart >= cum && colStart < cum + span) {
            headerText = hc.textContent?.trim() || undefined
            break
          }
          cum += span
        }
        if (headerText) break
      }
    }

    // 4) Fallback: primera fila con <th>
    if (!headerText) {
      const firstRow = table.querySelector("tr")
      if (firstRow) {
        const ths = Array.from(firstRow.querySelectorAll("th"))
        const pick = ths[colStart]
        headerText = pick ? pick.textContent?.trim() || undefined : undefined
      }
    }

    if (headerText && valueText) return `${headerText}, ${valueText}`
    return valueText
  }

  // Compute and set an `aria-label` on the element so screen readers
  // and assistive tech read the same text that TTS will speak.
  useEffect(() => {
    if (typeof document === "undefined") return
    const el = elRef.current
    if (!el) return

    // Priority: override explícito → text → column → inferencia
    if (ariaLabelOverride) {
      setAriaLabel(ariaLabelOverride)
      return
    }

    if (text) {
      setAriaLabel(text)
      return
    }

    if (column) {
      const val = el.textContent?.trim() || ""
      setAriaLabel(val ? `${column}, ${val}` : column)
      return
    }

    const inferred = inferHeaderAndValue(el)
    setAriaLabel(inferred || undefined)
  }, [text, column, children, ariaLabelOverride])

  const handleActivate = (el: HTMLElement) => {
    // 1) Si viene `text` -> se lee tal cual
    if (text) {
      speak(text)
      return
    }

    // 2) Si viene `column` -> "column, valor"
    if (column) {
      const val = el.textContent?.trim() || ""
      const payload = val ? `${column}, ${val}` : column
      speak(payload)
      return
    }

    // 3) Inferir encabezado + valor desde la tabla
    const payload = inferHeaderAndValue(el) || undefined
    speak(payload)
  }

  const onClick: React.MouseEventHandler = (e) => {
    if (!voiceEnabled) return
    const el = e.currentTarget as HTMLElement
    handleActivate(el)
  }

  const onKeyDown: React.KeyboardEventHandler = (e) => {
    if (!voiceEnabled) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const el = e.currentTarget as HTMLElement
      handleActivate(el)
    }
  }

  const isInteractive = voiceEnabled

  return (
    <span
      ref={elRef}
      aria-label={ariaLabel}
      // ARIA + foco solo si está activa la voz
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-disabled={!isInteractive}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={className}
      title={title}
    >
      {children}
    </span>
  )
}

export default SpeakOnClick
