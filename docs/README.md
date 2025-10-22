# studentsnotes — Sistema Académico con Analytics de Calidad

## Requisitos
- Node 18+
- Cuenta Supabase (URL + keys)

## Pasos
1. **Crear proyecto en Supabase** y ejecutar `docs/schema.sql`.
2. **Configurar RLS** siguiendo `docs/RLS.md`.
3. **Crear usuario maestro** en Supabase Auth. Asegura que su email exista en tabla `usuario` y apunte a un `docente`.
4. **Configurar variables**:
   - `backend/.env`:
     ```env
     PORT=4000
     SUPABASE_URL=YOUR_URL
     SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE
     NODE_ENV=development
     JWT_SECRET=dev-secret-change
     ```
   - `frontend/.env`:
     ```env
     VITE_SUPABASE_URL=YOUR_URL
     VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
     ```
5. **Instalar dependencias y correr**:
   - Backend:
     ```bash
     cd backend
     npm i
     npm run dev
     ```
   - Frontend:
     ```bash
     cd frontend
     npm i
     npm run dev
     ```
6. **Datos semilla** (opcional):
   ```bash
   cd backend
   npm run seed
   ```

## Estructura de rutas (frontend)
- `/login` → autenticación de maestro
- `/dashboard` → KPIs y tickers
- `/pareto`, `/dispersion`, `/control`, `/pastel`
- `/inscripciones` → flujo carrera → grupo → alumno → inscribir

## Exportar / Importar
- Botón **Exportar** abre diálogo **Exportar Datos y Gráficos** con Excel/CSV/PDF.
- Import **CSV/Excel** → *staging* en lowdb → confirmar → persistir a Supabase.
