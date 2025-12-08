# Sistema de Temas Centralizado - StudentNotes

## 🎨 Arquitectura

El sistema de temas ha sido completamente refactorizado para ser **centralizado, consistente y fácil de mantener**.

### Flujo de Datos

```
User Action (AccessibilityMenu)
    ↓
useAccessibility.setContrastMode() / setCustomColorsEnabled() / etc.
    ↓
applyThemeToDocument() (llamada automáticamente en Zustand)
    ↓
CSS Variables aplicadas al <html> + Clases CSS aplicadas
    ↓
Toda la app reacciona (CSS heredado)
```

## 🗂️ Ficheros Clave

### 1. `src/store/useAccessibility.ts`

**Responsabilidad**: Gestionar estado de accesibilidad + aplicar temas.

**Funciones principales**:

- `applyThemeToDocument(state)`: Función centralizada que:
  1. Determina la paleta correcta (custom > high > dark > default)
  2. Aplica clases CSS al `<html>` (`.dark`, `.high-contrast`, `.dyslexic-font`)
  3. Establece CSS variables en el documento
  4. Gestiona localStorage

**Paletas definidas**:

- `DEFAULT_PALETTE`: Tema claro original
- `DARK_PALETTE`: Tema oscuro
- `HIGH_CONTRAST_PALETTE`: Alto contraste
- Colores personalizados (paletas daltonismo) vienen del estado

**Métodos que disparan `applyThemeToDocument`**:

- `setContrastMode()`: Siempre
- `setCustomColorsEnabled()`: Siempre
- `setCustomBgColor()`, `setCustomTextColor()`, etc.: Solo si `customColorsEnabled === true`

### 2. `src/styles/globals.css`

**Responsabilidad**: Definir CSS variables base y estilos globales.

**Variables definidas en**:

- `:root`: Tema claro (default)
- `html.dark`: Tema oscuro
- `html.high-contrast`: Alto contraste

**Variables que se controlan**:

```
--bg, --surface, --card, --text, --muted, --border,
--primary, --primary-ctr, --sidebar-bg, --sidebar-fg,
--danger-bg, --danger-fg
```

### 3. `src/components/AccessibilityMenu.tsx`

**Responsabilidad**: UI para seleccionar temas/colores.

**Cambios clave**:

- `handleContrastChange()` es simple: solo llama a `setContrastMode()`
- El store se encarga del resto
- Las paletas de daltonismo (`applyDaltonismPalette()`) establecen `customColorsEnabled = true` + los colores custom

### 4. `src/main.tsx`

**Responsabilidad**: Inicializar el tema al cargar la app.

**En el componente `Root`**:

```typescript
// Al montar, aplicar el tema del store (por si se cargó del localStorage)
React.useEffect(() => {
  const state = useAccessibility.getState();
  applyThemeToDocument(state);
}, []);

// Aplicar cambios de accesibilidad NO tema
React.useEffect(() => {
  // Clases para: fontSize, focusMode, bigPointer, interactiveHighlight, dyslexicFont
}, [fontSize, focusMode, bigPointer, interactiveHighlight, dyslexicFont]);
```

### 5. `src/App.tsx`

**Simplificación**: Se eliminaron todos los `useEffect` que manajaban temas.

- Ahora solo gestiona estado de autenticación, navegación, etc.
- El tema se maneja completamente en el store + globals.css

## 🎯 Flujo de Cambio de Tema

### Ejemplo 1: Cambiar a Modo Oscuro

```
User clicks "Oscuro" button
→ handleContrastChange("dark")
→ setContrastMode("dark")
→ Zustand state actualizado
→ applyThemeToDocument() llamado automáticamente
  - Determina: customColorsEnabled=false → usa DARK_PALETTE
  - Aplica: root.classList.add("dark")
  - Setea: todas las CSS variables a valores oscuros
  - localStorage.setItem("sn_high_contrast", "dark")
→ Tailwind + CSS globales reaccionan a variables
→ App actualizada visualmente
```

### Ejemplo 2: Activar Modo Daltonismo (Protanopia)

```
User clicks "Protanopia"
→ applyDaltonismPalette("protanopia")
→ setCustomColorsEnabled(true)
→ setCustomBgColor("#FFFFFF")
→ setCustomTextColor("#000000")
→ setCustomPrimaryColor("#0072E3")
→ setCustomSidebarBgColor("#003D7A")
→ setCustomSidebarFgColor("#FFFFFF")
→ Cada setter llama a applyThemeToDocument() automáticamente
→ customColorsEnabled=true → usa colores custom
→ CSS variables aplicadas
→ App se ve con paleta segura para daltonismo
```

### Ejemplo 3: Volver a Normal

```
User clicks "Deshabilitado" en opciones daltonismo
→ setCustomColorsEnabled(false)
→ applyThemeToDocument()
  - customColorsEnabled=false → usa DEFAULT_PALETTE
  - Limpia localStorage["sn_high_contrast"] si contrastMode=="default"
→ App vuelve a diseño original
```

## ✅ Jerarquía de Prioridad

```
1. customColorsEnabled === true   → Usa colores custom
2. contrastMode === "high"        → Usa HIGH_CONTRAST_PALETTE
3. contrastMode === "dark"        → Usa DARK_PALETTE
4. contrastMode === "default"     → Usa DEFAULT_PALETTE
```

**Nota**: Si `customColorsEnabled === true`, **NO se respeta `contrastMode`**. El usuario ha elegido colores específicos, así que se usan esos.

## 🎨 Paletas WCAG AAA

Todas las paletas se han diseñado con:

- Contraste mínimo AA para textos
- Colores accesibles para daltónicos

### Paleta Default (Claro)

- Fondo: `#FFFFFF`
- Texto: `#1E3452` (ratio 15.6:1)
- Sidebar: Azul `#1E3452` con texto blanco `#E9EEF5`

### Paleta Dark

- Fondo: `#071428`
- Texto: `#E9EEF5` (ratio ~14:1)
- Sidebar: Azul oscuro `#0F2431` con texto claro

### Paleta High Contrast

- Fondo: `#000000`
- Texto: `#FFFFFF` (ratio 21:1)
- Primario: `#FFBF00` (amarillo vivo)

## 🔧 Cómo Agregar Nuevas CSS Variables

1. **Definir en `:root` de globals.css**:

```css
:root {
  --my-new-color: #somevalue;
}
```

2. **Actualizar todas las paletas en useAccessibility.ts**:

```typescript
const DEFAULT_PALETTE = {
  // ...
  "my-new-color": "#somevalue",
};
const DARK_PALETTE = {
  // ...
  "my-new-color": "#darkversionvalue",
};
// etc.
```

3. **Usar en componentes con Tailwind**:

```tsx
<div style={{ color: "var(--my-new-color)" }}>
  // o className="bg-[var(--my-new-color)]"
</div>
```

## 🐛 Debugging

### Verificar tema actual

```javascript
// En DevTools Console
const root = document.documentElement;
console.log(getComputedStyle(root).getPropertyValue("--bg"));
console.log(root.classList); // Ver clases: .dark, .high-contrast, etc.
```

### Resetear tema

```javascript
useAccessibility.getState().setContrastMode("default");
```

### Ver estado completo del store

```javascript
console.log(useAccessibility.getState());
```

## 📦 Testing

### Cambios a Verificar:

1. **Default mode**: Sidebar azul oscuro, contenido blanco, textos legibles
2. **Dark mode**: Todo oscuro, textos claros, sidebar oscuro
3. **High contrast**: Negro + blanco + amarillo, máximo contraste
4. **Daltonismo (3 tipos)**: Colores específicos, sin rojo-verde, etc.
5. **Reset button**: Vuelve todo a default, localStorage limpio
6. **Reload page**: El tema se mantiene (localStorage)
7. **Dyslexic font**: Se aplica OpenDyslexic cuando está activado

## 🚀 Performance

- **Sin re-renders innecesarios**: `applyThemeToDocument` es rápido, solo setea CSS variables
- **localStorage**: Mínimo, solo `sn_high_contrast` cuando NO está en default
- **Persist**: Zustand automáticamente persiste en localStorage, recupera al reload

---

**Última actualización**: 2025-12-07
**Versión**: 1.0 (Centralizada)
