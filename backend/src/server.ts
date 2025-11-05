// src/server.ts
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import 'dotenv/config'
import './server.js'

// Routers (los que sí exportan default)
import analiticaRouter from './routes/analitica.routes.js'
import authRouter from './routes/auth.routes.js'
import catalogosRouter from './routes/catalogos.routes.js'
import estudiantesRouter from './routes/estudiantes.routes.js'
import docentesRouter from './routes/docentes.routes.js'
import materiasRouter from './routes/materias.routes.js'
import gruposRouter from './routes/grupos.routes.js'
import materiaCarreraRouter from './routes/materiaCarrera.routes.js'
import importRouter from './routes/import.routes.js'
import inscripcionesRouter from './routes/inscripciones.routes.js'
import bajaMateriaRouter from './routes/bajaMateria.routes.js'
import dashboardRouter from './routes/dashboard.routes.js'

// Routers con **export nombrado**
import { exportRouter } from './routes/export.js'
import { logsRouter } from './routes/logs.js'

// Error middleware
import { errorHandler } from './middleware/error.js'

const app = express()

app.use(
  cors({
    origin: [/localhost:\d+$/, /\.vercel\.app$/], // ajusta tus orígenes permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/analitica', analiticaRouter)
app.use('/auth', authRouter)
app.use('/catalogos', catalogosRouter)
app.use('/estudiantes', estudiantesRouter)
app.use('/docentes', docentesRouter)
app.use('/materias', materiasRouter)
app.use('/export', exportRouter)          // ← ahora sí, export nombrado
app.use('/grupos', gruposRouter)
app.use('/materia-carrera', materiaCarreraRouter)
app.use('/import', importRouter)
app.use('/inscripciones', inscripcionesRouter)
app.use('/logs', logsRouter)              // ← export nombrado
app.use('/baja-materia', bajaMateriaRouter)
app.use('/dashboard', dashboardRouter)

app.use((_req, res) => res.status(404).json({ error: { message: 'Not Found' } }))
app.use(errorHandler)

const port = Number(env.PORT ?? 4000)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
