# api-contracts.md

Todas las respuestas en JSON; errores estándar `{ error: { code, message, details } }`.

## Auth
- `POST /auth/login` → delega con Supabase (opcional) o verifica token enviado.
  - Request: `{ email, password }`
  - Response: `{ access_token, user }`

## Catálogos
- `GET /catalogos/carreras|generos|materias|docentes|terminos|modalidades`

## Grupos
- `GET /grupos?carrera_id=&termino_id=`

## Estudiantes
- `GET /estudiantes?carrera_id=&q=`

## Inscripciones
- `POST /inscripciones` body `{ id_estudiante, id_grupo }`
  - Valida duplicado y cupo.

## Analítica
- `GET /analitica/kpis?carrera_id=&termino_id=`
- `GET /analitica/pareto?scope=...`
- `GET /analitica/dispersion?carrera_id=&materia_id=&unidad=`
- `GET /analitica/control?tipo=xbar|p&...`

## Import/Export
- `POST /import` (archivo) → staging lowdb
- `POST /import/commit` → persiste a Supabase
- `POST /export` (opcional server-side)
