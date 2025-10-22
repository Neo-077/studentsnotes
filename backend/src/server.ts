<<<<<<< HEAD
<<<<<<< HEAD

import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { studentsRouter } from './routes/students.js'
import { logsRouter } from './routes/logs.js'
import { exportRouter } from './routes/export.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (_req, res)=> res.json({ ok:true, name: 'StudentsNotes API' }))
app.use('/api/students', studentsRouter)
app.use('/api/logs', logsRouter)
app.use('/api/export', exportRouter)

const port = process.env.PORT || 4000
app.listen(port, ()=> console.log(`API on http://localhost:${port}`))
=======
=======
>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import { env } from './config/env.js'
import { requireAuth } from './middleware/auth.js'
    
import authRoutes from './routes/auth.routes.js'
import catalogosRoutes from './routes/catalogos.routes.js'
import gruposRoutes from './routes/grupos.routes.js'
import estudiantesRoutes from './routes/estudiantes.routes.js'
import inscripcionesRoutes from './routes/inscripciones.routes.js'
import analiticaRoutes from './routes/analitica.routes.js'
import importRoutes from './routes/import.routes.js'

export const app = express()
app.use(cors())
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

// Rutas públicas (si quieres dejar /auth/login como proxy o healthcheck)
app.use('/auth', authRoutes)

// Middleware de auth a partir de aquí:
app.use(requireAuth)

// Rutas protegidas
app.use('/catalogos', catalogosRoutes)
app.use('/grupos', gruposRoutes)
app.use('/estudiantes', estudiantesRoutes)
app.use('/inscripciones', inscripcionesRoutes)
app.use('/analitica', analiticaRoutes)
app.use('/import', importRoutes)

// Endpoint útil de depuración
app.get('/me', (req, res) => {
  res.json({
    supabase_user: req.authUser,
    app_usuario: req.appUsuario
  })
})

app.listen(env.PORT, () => {
  console.log(`backend listening on http://localhost:${env.PORT}`)
})
<<<<<<< HEAD
>>>>>>> d2eb161 (Proyecto StudentsNotes: frontend y backend iniciales)
=======
>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
