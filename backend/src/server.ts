
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
