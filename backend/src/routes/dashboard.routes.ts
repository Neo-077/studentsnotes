import { Router } from 'express'
import { requireAuth as requireSupabaseAuth } from '../middleware/auth.js'
import { getDashboardData } from '../services/dashboard.service.js'

const router = Router()

// GET /dashboard — obtener datos del dashboard según rol
router.get('/', requireSupabaseAuth, async (req, res, next) => {
    try {
        const appUsuario = (req as any).appUsuario as { rol?: string; id_docente?: number } | null

        // Si es maestro, filtrar por sus grupos. Si es admin, obtener todos los datos
        const id_docente = appUsuario?.rol === 'maestro' && appUsuario?.id_docente
            ? appUsuario.id_docente
            : null

        const data = await getDashboardData(id_docente)
        res.json(data)
    } catch (e) {
        next(e)
    }
})

export default router

