<<<<<<< HEAD
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
=======
# 🎓 StudentsNotes

**StudentsNotes** es una aplicación web desarrollada para el seguimiento académico y análisis de desempeño de estudiantes.  
Combina herramientas de visualización (gráficas, KPIs y análisis de calidad) con un sistema de registro conectado a **Supabase** como backend.

---

## 🧱 Estructura del Proyecto

```

studentsnotes/
├─ frontend/     → Interfaz web (React + Vite + TypeScript + Tailwind)
├─ backend/      → Lógica del servidor / API (Node, Express o Supabase Functions)
└─ .gitignore    → Configuración global de exclusiones

````

---

## 🚀 Tecnologías Principales

| Componente | Tecnología / Herramienta |
|-------------|--------------------------|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| Backend | Node.js / Express (o Supabase Functions) |
| Base de Datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Estilo y UI | TailwindCSS 4.1 |
| Control de versiones | Git + GitHub |

---

## ⚙️ Instalación

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/Neo-077/studentsnotes.git
cd studentsnotes
````

### 2️⃣ Instalar dependencias

#### Frontend

```bash
cd frontend
npm install
```

#### Backend

```bash
cd ../backend
npm install
```

---

## 🔑 Variables de entorno

Crea un archivo `.env` **en cada carpeta** (`frontend/` y `backend/`) con tus claves de Supabase.

### 📁 frontend/.env

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 📁 backend/.env

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
PORT=3000
```

## 🧩 Scripts disponibles

### 🔹 Frontend

```bash
# Iniciar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa del build
npm run preview
```

### 🔹 Backend

```bash
# Iniciar el servidor
npm run start
```

---

## 📊 Funcionalidades principales

* 📋 Registro de estudiantes y factores de riesgo.
* 📈 Dashboard con indicadores: total, aprobados, reprobados y deserción estimada.
* 🥧 Gráficas (Pareto, dispersión, pastel) para análisis visual.
* 💾 Exportación de datos y métricas académicas.
* 🔐 Autenticación segura con Supabase Auth.

---

## 🧠 Estructura visual (UI base)

Inspirada en los lineamientos del **Instituto Tecnológico de Tijuana (TecNM)**, la interfaz muestra:

* Panel principal con métricas de calidad educativa.
* Secciones para registrar estudiantes, analizar factores y generar reportes visuales.
* Integración con gráficos SVG y KPIs dinámicos conectados a la base de datos.

---

## 🛠️ Mejores prácticas aplicadas

* Cumplimiento con principios **SOLID** y diseño modular.
* Control de calidad y validaciones en la base de datos.
* Uso de `.gitignore` global para proteger entornos.
* Arquitectura **separada por capas** (frontend / backend).
* Integración continua mediante Git + GitHub.


---

## 🧾 Licencia

Este proyecto se distribuye con fines educativos y académicos,
bajo la licencia MIT. Puedes modificarlo y adaptarlo libremente.

---

## 🛰️ Repositorio

📦 [https://github.com/Neo-077/studentsnotes](https://github.com/Neo-077/studentsnotes)


## 🏠 Base de datos

<img width="1522" height="866" alt="supabase-schema-tlijmmcrmqorqsprslpi" src="https://github.com/user-attachments/assets/b8da5b2a-fa9a-45ff-a920-34197f34c77d" />

>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
