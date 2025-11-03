# 🎓 StudentsNotes

**StudentsNotes** es una aplicación web desarrollada para el **seguimiento académico** y **análisis de desempeño estudiantil**.
Combina herramientas de visualización (gráficas, KPIs y análisis de calidad) con un sistema de registro conectado a **Supabase** como backend.

---

## 🧱 Estructura del Proyecto

```
studentsnotes/
├─ frontend/     → Interfaz web (React + Vite + TypeScript + Tailwind)
├─ backend/      → Lógica del servidor / API (Node, Express o Supabase Functions)
└─ .gitignore    → Configuración global de exclusiones
```

---

## 🚀 Tecnologías Principales

| Componente           | Tecnología / Herramienta                 |
| -------------------- | ---------------------------------------- |
| Frontend             | React + Vite + TypeScript + TailwindCSS  |
| Backend              | Node.js / Express (o Supabase Functions) |
| Base de Datos        | Supabase (PostgreSQL)                    |
| Autenticación        | Supabase Auth                            |
| Estilo y UI          | TailwindCSS 4.1                          |
| Control de versiones | Git + GitHub                             |

---

## ⚙️ Instalación y Uso

### 🧩 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/Neo-077/studentsnotes.git
cd studentsnotes
```

---

### ⚙️ 2️⃣ Variables de entorno

#### 📁 frontend/.env

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

#### 📁 backend/.env

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
PORT=3000
```

---

### 💻 3️⃣ Frontend — React + Vite + TypeScript + Tailwind

#### 🧩 Instalar dependencias

```bash
cd frontend
npm install
```

#### ⚡ Correr en desarrollo

```bash
npm run dev
```

📍 Esto abrirá la app en:
👉 [http://localhost:5173](http://localhost:5173)

#### 📦 Instalación explícita en carpeta frontend ambos y en backend solo primer línea (dependencias)

```bash
npm install @hookform/resolvers @supabase/supabase-js @tailwindcss/vite chart.js html2canvas jspdf multer papaparse react react-dom react-hook-form react-router-dom recharts sheetjs xlsx zod zustand

npm install -D @tailwindcss/postcss @types/multer @types/papaparse @types/react @types/react-dom @vitejs/plugin-react autoprefixer postcss tailwindcss typescript vite
```

#### 🏗️ Compilar y previsualizar

```bash
npm run build
npm run preview
```

#### 🎨 Configuración de Tailwind

Importar en tu CSS principal:

```css
@import "tailwindcss";
```

#### ⚙️ Configuración de Vite (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

### 🧠 4️⃣ Backend — Node + Express + TypeScript

#### 🧩 Instalar dependencias

```bash
cd ../backend
npm install
```

#### ⚡ Correr en desarrollo

```bash
npm run dev
```

📍 El servidor se ejecutará en:
👉 [http://localhost:3000](http://localhost:3000)

#### 📦 Instalación explícita (dependencias opcionales)

```bash
npm install @supabase/supabase-js bcrypt cors dotenv express express-rate-limit helmet jsonwebtoken lowdb morgan multer pdf-lib xlsx zod

npm install -D @types/cors @types/express @types/jsonwebtoken @types/morgan @types/multer @types/xlsx ts-node ts-node-dev tsx typescript
```

#### 🏗️ Producción (compilar y ejecutar)

```bash
npm run build
npm run start
```

---

### 🌐 5️⃣ Rutas locales por defecto

| Servicio           | URL                                            |
| ------------------ | ---------------------------------------------- |
| Frontend (dev)     | [http://localhost:5173](http://localhost:5173) |
| Frontend (preview) | [http://localhost:4173](http://localhost:4173) |
| Backend (API)      | [http://localhost:3000](http://localhost:3000) |

---

### ✅ Estado del Proyecto

Incluye todo lo necesario para:

* Clonar el proyecto
* Configurar las variables `.env`
* Instalar dependencias
* Ejecutar tanto frontend como backend
* Compilar para producción
* Configurar correctamente Tailwind y Vite

---

## 📊 Funcionalidades principales

* 📋 Registro de estudiantes y factores de riesgo.
* 📈 Dashboard con indicadores (total, aprobados, reprobados, deserción estimada).
* 🥧 Gráficas (Pareto, dispersión, pastel) para análisis visual.
* 💾 Exportación de datos y métricas académicas.
* 🔐 Autenticación segura con Supabase Auth.

---

## 🧠 Estructura visual (UI base)

Inspirada en los lineamientos del **Instituto Tecnológico de Tijuana (TecNM)**:

* Panel principal con métricas de calidad educativa.
* Secciones para registrar estudiantes, analizar factores y generar reportes visuales.
* Integración con gráficos SVG y KPIs dinámicos conectados a la base de datos.

---

## 🛠️ Mejores prácticas aplicadas

* Principios **SOLID** y arquitectura modular.
* Validaciones de datos en backend y base de datos.
* Uso de `.gitignore` global y separación de entornos.
* Arquitectura **por capas** (frontend / backend).
* Integración continua mediante Git + GitHub.

---

## 🏠 Base de datos (Supabase)

<img width="1522" height="866" alt="supabase-schema-tlijmmcrmqorqsprslpi" src="https://github.com/user-attachments/assets/b8da5b2a-fa9a-45ff-a920-34197f34c77d" />

---

## 🛰️ Repositorio

📦 [https://github.com/Neo-077/studentsnotes](https://github.com/Neo-077/studentsnotes)
