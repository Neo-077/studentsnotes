// src/routes/auth.routes.ts
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { env } from '../config/env.js'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import { requireAuth } from '../middleware/jwt.js'
import { requireAuth as requireSupabaseAuth } from '../middleware/auth.js'
import { registerDocente } from '../controllers/authController.js'
import multer from 'multer'

const upload = multer()
const router = Router()

/* =========================
   Validaciones
========================= */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
})

/* =========================
   Login por tabla usuario (JWT propio)
========================= */
router.post('/login', async (req, res) => {
  try {
    const parse = loginSchema.safeParse(req.body)
    if (!parse.success) return res.status(400).json({ error: { message: 'Payload inválido' } })
    const { email, password } = parse.data

    const { data: users, error } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, email, password_hash, rol, activo, id_docente')
      .eq('email', email)
      .limit(1)

    if (error) return res.status(500).json({ error: { message: error.message } })
    const user = users?.[0]
    if (!user || (user.rol !== 'maestro' && user.rol !== 'admin') || user.activo === false) {
      return res.status(401).json({ error: { message: 'Credenciales inválidas' } })
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: { message: 'Usuario sin contraseña configurada' } })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: { message: 'Credenciales inválidas' } })

    const role: 'admin' | 'maestro' = user.rol === 'admin' ? 'admin' : 'maestro'
    const payload = { sub: user.id_usuario, email: user.email, rol: role, id_docente: user.id_docente ?? null }
    const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' })
    return res.json({ access_token, user: payload })
  } catch {
    return res.status(500).json({ error: { message: 'Error del servidor' } })
  }
})

/* =========================
   Me (JWT propio)
========================= */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const u = req.userJwt!
    let docente: any = null
    if (u.id_docente) {
      const { data } = await supabaseAdmin
        .from('docente')
        .select('id_docente, nombre, ap_paterno, ap_materno, correo')
        .eq('id_docente', u.id_docente)
        .limit(1)
      docente = data?.[0] ?? null
    }
    res.json({ user: u, docente })
  } catch {
    res.status(500).json({ error: { message: 'Error del servidor' } })
  }
})

/* =========================
   WhoAmI (Auth de Supabase)
========================= */
router.get('/whoami', requireSupabaseAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')

    const email = req.authUser?.email
    if (!email) return res.status(401).json({ error: { message: 'No autorizado' } })

    const { data: users, error } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, email, rol, activo, id_docente, avatar_url')
      .eq('email', email)
      .limit(1)
    if (error) return res.status(500).json({ error: { message: error.message } })

    let u = users?.[0] || null
    if (!u) {
      const ins = await supabaseAdmin
        .from('usuario')
        .insert({ email, rol: 'admin', activo: true })
        .select('id_usuario, email, rol, activo, id_docente, avatar_url')
        .limit(1)
      if (ins.error) return res.status(500).json({ error: { message: ins.error.message } })
      u = ins.data?.[0] || null
    }

    let avatar_signed: string | null = null
    if (u?.avatar_url) {
      if (/^https?:\/\//i.test(u.avatar_url)) {
        avatar_signed = u.avatar_url
      } else {
        const { data: pub } = await supabaseAdmin.storage.from('images').getPublicUrl(String(u.avatar_url))
        avatar_signed = pub?.publicUrl ?? null
      }
    }

    res.set('ETag', String(Date.now()))
    res.json({ user: { ...u, avatar_url: avatar_signed } })
  } catch {
    res.status(500).json({ error: { message: 'Error' } })
  }
})

/* =========================
   Avatar (PUT / DELETE) — Supabase Auth
========================= */
router.put('/avatar', requireSupabaseAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: { message: 'Archivo requerido' } })
    const email = req.authUser?.email
    if (!email) return res.status(401).json({ error: { message: 'No autorizado' } })

    const sel = await supabaseAdmin.from('usuario').select('id_usuario').eq('email', email).limit(1)
    if (sel.error) return res.status(500).json({ error: { message: sel.error.message } })
    let idUsuario = sel.data?.[0]?.id_usuario as number | undefined
    if (!idUsuario) {
      const ins = await supabaseAdmin.from('usuario').insert({ email, rol: 'admin', activo: true }).select('id_usuario').limit(1)
      if (ins.error) return res.status(500).json({ error: { message: ins.error.message } })
      idUsuario = ins.data?.[0]?.id_usuario
    }

    const ext = (req.file.mimetype || '').includes('png')
      ? 'png'
      : (req.file.mimetype || '').includes('webp')
        ? 'webp'
        : 'jpg'
    const path = `avatars/${idUsuario}.${ext}`

    const { error: upErr } = await supabaseAdmin.storage
      .from('images')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype || 'image/jpeg', upsert: true as any })
    if (upErr) return res.status(500).json({ error: { message: upErr.message } })

    await supabaseAdmin.from('usuario').update({ avatar_url: path }).eq('email', email)
    const { data: pub } = await supabaseAdmin.storage.from('images').getPublicUrl(path)
    return res.json({ url: pub?.publicUrl ?? null })
  } catch {
    return res.status(500).json({ error: { message: 'Error subiendo avatar' } })
  }
})

router.delete('/avatar', requireSupabaseAuth, async (req, res) => {
  try {
    const email = req.authUser?.email
    if (!email) return res.status(401).json({ error: { message: 'No autorizado' } })

    const sel = await supabaseAdmin.from('usuario').select('avatar_url').eq('email', email).limit(1)
    if (sel.error) return res.status(500).json({ error: { message: sel.error.message } })
    const current = sel.data?.[0]?.avatar_url as string | null

    let path: string | null = current || null
    if (path && /^https?:\/\//i.test(path)) {
      const idx = path.indexOf('/images/')
      if (idx >= 0) path = path.substring(idx + '/images/'.length)
    }

    if (path) {
      const { error: delErr } = await supabaseAdmin.storage.from('images').remove([path])
      if (delErr) return res.status(500).json({ error: { message: delErr.message } })
    }

    const up = await supabaseAdmin.from('usuario').update({ avatar_url: null }).eq('email', email)
    if (up.error) return res.status(500).json({ error: { message: up.error.message } })

    return res.json({ ok: true })
  } catch {
    return res.status(500).json({ error: { message: 'Error eliminando avatar' } })
  }
})

/* =========================
   Registro de docente
========================= */
router.post('/register-docente', registerDocente)

/* =========================
   Cambiar contraseña (solo DOCENTES) — Supabase Auth
========================= */
router.post('/change-password', requireSupabaseAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')

    const email = req.authUser?.email
    if (!email) return res.status(401).json({ message: 'No autorizado' })

    const selUser = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, rol, password_hash')
      .eq('email', email)
      .limit(1)
      .single()

    if (selUser.error || !selUser.data) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    if (selUser.data.rol !== 'maestro') {
      return res.status(403).json({ message: 'Solo docentes pueden cambiar contraseña' })
    }

    const { old_password, new_password } = req.body || {}
    if (!old_password || !new_password || String(new_password).length < 6) {
      return res.status(400).json({ message: 'Parámetros inválidos' })
    }
    if (String(old_password) === String(new_password)) {
      return res.status(400).json({ message: 'La nueva contraseña debe ser distinta' })
    }

    const currentHash = selUser.data.password_hash as string | null
    if (!currentHash) return res.status(400).json({ message: 'Usuario sin contraseña configurada' })

    const ok = await bcrypt.compare(String(old_password), currentHash)
    if (!ok) return res.status(401).json({ message: 'Contraseña actual incorrecta' })

    const newHash = await bcrypt.hash(String(new_password), 10)
    const upd = await supabaseAdmin
      .from('usuario')
      .update({ password_hash: newHash })
      .eq('id_usuario', selUser.data.id_usuario)
      .select('id_usuario')
      .single()

    if (upd.error) return res.status(500).json({ message: upd.error.message })
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ message: 'Error del servidor' })
  }
})

/* =========================
   Solicitar enlace (simulado) — Supabase Auth
========================= */
router.post('/request-password-reset', requireSupabaseAuth, async (req, res) => {
  try {
    const email = req.authUser?.email
    if (!email) return res.status(401).json({ message: 'No autorizado' })

    const sel = await supabaseAdmin
      .from('usuario')
      .select('rol')
      .eq('email', email)
      .single()

    if (sel.error || !sel.data) return res.status(404).json({ message: 'Usuario no encontrado' })
    if (sel.data.rol !== 'maestro') {
      return res.status(403).json({ message: 'Solo docentes pueden solicitar el enlace' })
    }

    return res.status(200).json({ ok: true, message: 'Si tu cuenta es válida, recibirás un enlace al correo.' })
  } catch {
    return res.status(500).json({ message: 'Error del servidor' })
  }
})

export default router

