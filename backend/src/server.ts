import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import { env } from "./config/env.js"
import { requireAuth } from "./middleware/auth.js"

import authRoutes from "./routes/auth.routes.js"
import catalogosRoutes from "./routes/catalogos.routes.js"
import gruposRoutes from "./routes/grupos.routes.js"
import estudiantesRoutes from "./routes/estudiantes.routes.js"
import inscripcionesRoutes from "./routes/inscripciones.routes.js"
import analiticaRoutes from "./routes/analitica.routes.js"
import importRoutes from "./routes/import.routes.js"
import { errorHandler } from "./middleware/error.js"

export const app = express()

app.use(cors())
app.use(helmet())
app.use(morgan("dev"))
app.use(express.json())

// Rutas públicas
app.use("/auth", authRoutes)

// Middleware de autenticación
app.use(requireAuth)

// Rutas protegidas
app.use("/catalogos", catalogosRoutes)
app.use("/grupos", gruposRoutes)
app.use("/estudiantes", estudiantesRoutes)
app.use("/inscripciones", inscripcionesRoutes)
app.use("/analitica", analiticaRoutes)
app.use("/import", importRoutes)

// Endpoint de prueba
app.get("/me", (req, res) => {
  res.json({
    supabase_user: req.authUser,
    app_usuario: req.appUsuario,
  })
})

// Manejo global de errores JSON
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`✅ Backend escuchando en http://localhost:${env.PORT}`)
})
