import { Request, Response } from 'express'
import { authService } from '../services/auth.service.js'

export async function registerDocente(req: Request, res: Response) {
    const { email, password, nombre, ap_paterno, ap_materno, id_genero } = req.body || {}
    if (!email || !password) {
        return res.status(400).json({ message: 'email y password son requeridos' })
    }
    try {
        const result = await authService.registerDocente({ email, password, nombre, ap_paterno, ap_materno, id_genero })
        return res.status(201).json({ ok: true, ...result })
    } catch (e: any) {
        if (e.status === 409) return res.status(409).json({ message: 'Email ya registrado' })
        console.error('registerDocente error:', e)
        return res.status(500).json({ message: 'Error del servidor' })
    }
}
