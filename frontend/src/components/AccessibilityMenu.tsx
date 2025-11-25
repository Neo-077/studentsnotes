import { useAccessibility } from "../store/useAccessibility"

export function AccessibilityMenu() {
  const {
    fontSize,
    contrastMode,
    focusMode,
    bigPointer,
    setFontSize,
    setContrastMode,
    toggleFocusMode,
    toggleBigPointer,
  } = useAccessibility();

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
          <section aria-labelledby="acc-fuente" className="mb-2">
            <h2 id="acc-fuente" className="text-sm font-semibold">
              Tamaño de texto
            </h2>
            <div className="flex gap-2 mt-1">
              {(["small", "medium", "large"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`px-2 py-1 border rounded text-xs ${
                    fontSize === size ? "bg-slate-200 dark:bg-slate-700" : ""
                  }`}
                  onClick={() => setFontSize(size)}
                >
                  {size === "small" && "A-"}
                  {size === "medium" && "A"}
                  {size === "large" && "A+"}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="acc-contraste" className="mb-2">
            <h2 id="acc-contraste" className="text-sm font-semibold">
              Contraste
            </h2>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className={`px-2 py-1 border rounded text-xs ${
                  contrastMode === "default" ? "bg-slate-200 dark:bg-slate-700" : ""
                }`}
                onClick={() => setContrastMode("default")}
              >
                Normal
              </button>
              <button
                type="button"
                className={`px-2 py-1 border rounded text-xs ${
                  contrastMode === "dark" ? "bg-slate-200 dark:bg-slate-700" : ""
                }`}
                onClick={() => setContrastMode("dark")}
              >
                Oscuro
              </button>
              <button
                type="button"
                className={`px-2 py-1 border rounded text-xs ${
                  contrastMode === "high" ? "bg-slate-200 dark:bg-slate-700" : ""
                }`}
                onClick={() => setContrastMode("high")}
              >
                Alto contraste
              </button>
            </div>
          </section>

          <section aria-labelledby="acc-otros" className="space-y-1">
            <h2 id="acc-otros" className="text-sm font-semibold">
              Otras opciones
            </h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={focusMode}
                onChange={toggleFocusMode}
              />
              Modo enfoque (interfaz simplificada)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={bigPointer}
                onChange={toggleBigPointer}
              />
              Puntero grande
            </label>
          </section>
        </div>
      </details>
    </div>
  );
}