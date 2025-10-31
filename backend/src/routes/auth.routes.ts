import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../utils/supabaseClient.js'
import { requireAuth } from '../middleware/jwt.js'
import { requireAuth as requireSupabaseAuth } from '../middleware/auth.js'
import multer from 'multer'
const upload = multer()

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

router.post('/login', async (req, res)=>{
  const parse = loginSchema.safeParse(req.body);
  if(!parse.success) return res.status(400).json({ error: { message: 'Payload inválido' }});
  const { email, password } = parse.data
  // buscar usuario app
  const { data: users, error } = await supabaseAdmin
    .from('usuario')
    .select('id_usuario, email, password_hash, rol, activo, id_docente')
    .eq('email', email)
    .limit(1)
  if(error) return res.status(500).json({ error: { message: error.message } })
  const user = users?.[0]
  if(!user || (user.rol !== 'maestro' && user.rol !== 'admin') || user.activo === false) return res.status(401).json({ error: { message: 'Credenciales inválidas' } })
  if(!user.password_hash) return res.status(401).json({ error: { message: 'Usuario sin contraseña configurada' } })
  const ok = await bcrypt.compare(password, user.password_hash)
  if(!ok) return res.status(401).json({ error: { message: 'Credenciales inválidas' } })
  const role: 'admin' | 'maestro' = user.rol === 'admin' ? 'admin' : 'maestro'
  const payload = { sub: user.id_usuario, email: user.email, rol: role, id_docente: user.id_docente ?? null }
  const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' })
  return res.json({ access_token, user: payload })
});

router.get('/me', requireAuth, async (req, res)=>{
  const u = req.userJwt!
  // opcional: hidratar docente básico
  let docente: any = null
  if(u.id_docente){
    const { data } = await supabaseAdmin.from('docente').select('id_docente, nombre, ap_paterno, ap_materno, correo').eq('id_docente', u.id_docente).limit(1)
    docente = data?.[0] ?? null
  }
  res.json({ user: u, docente })
})

// Supabase auth → devuelve usuario de la app (rol, id_docente) mapeado por email
router.get('/whoami', requireSupabaseAuth, async (req, res)=>{
  try{
    // No-cache para evitar 304 y clientes con cuerpo vacío
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    const email = req.authUser?.email
    if(!email) return res.status(401).json({ error: { message: 'No autorizado' } })
    const { data: users, error } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, email, rol, activo, id_docente, avatar_url')
      .eq('email', email)
      .limit(1)
    if(error) return res.status(500).json({ error: { message: error.message } })
    let u = users?.[0] || null
    // Si no existe fila (caso típico admin), créala con rol admin
    if (!u) {
      const ins = await supabaseAdmin
        .from('usuario')
        .insert({ email, rol: 'admin', activo: true })
        .select('id_usuario, email, rol, activo, id_docente, avatar_url')
        .limit(1)
      if (ins.error) return res.status(500).json({ error: { message: ins.error.message } })
      u = ins.data?.[0] || null
    }
    // Si avatar_url es una URL http(s), devuélvela tal cual (compatibilidad). Si no, es un path en bucket público `images` → generar publicUrl
    let avatar_signed: string | null = null
    if (u?.avatar_url) {
      if (/^https?:\/\//i.test(u.avatar_url)) {
        avatar_signed = u.avatar_url
      } else {
        const { data: pub } = await supabaseAdmin.storage
          .from('images')
          .getPublicUrl(String(u.avatar_url))
        avatar_signed = pub?.publicUrl ?? null
      }
    }
    // Evita ETag/304 en esta respuesta específica
    res.set('ETag', String(Date.now()))
    res.json({ user: { ...u, avatar_url: avatar_signed } })
  }catch(e:any){ res.status(500).json({ error: { message: 'Error' } }) }
})

router.put('/avatar', requireSupabaseAuth, upload.single('file'), async (req, res) => {
  try{
    if (!req.file?.buffer) return res.status(400).json({ error: { message: 'Archivo requerido' } })
    const email = req.authUser?.email
    if (!email) return res.status(401).json({ error: { message: 'No autorizado' } })

    // Asegurar fila en usuario y obtener id_usuario
    const sel = await supabaseAdmin.from('usuario').select('id_usuario').eq('email', email).limit(1)
    if (sel.error) return res.status(500).json({ error: { message: sel.error.message } })
    let idUsuario = sel.data?.[0]?.id_usuario as number | undefined
    if (!idUsuario) {
      const ins = await supabaseAdmin.from('usuario').insert({ email, rol: 'admin', activo: true }).select('id_usuario').limit(1)
      if (ins.error) return res.status(500).json({ error: { message: ins.error.message } })
      idUsuario = ins.data?.[0]?.id_usuario
    }

    const ext = (req.file.mimetype || '').includes('png') ? 'png' : (req.file.mimetype || '').includes('webp') ? 'webp' : 'jpg'
    const path = `avatars/${idUsuario}.${ext}`
    // Subir a bucket público existente `images`
    const { error: upErr } = await supabaseAdmin.storage.from('images').upload(path, req.file.buffer, { contentType: req.file.mimetype || 'image/jpeg', upsert: true as any })
    if (upErr) return res.status(500).json({ error: { message: upErr.message } })

    // Guarda el path en DB; el cliente recibirá publicUrl
    await supabaseAdmin.from('usuario').update({ avatar_url: path }).eq('email', email)
    const { data: pub } = await supabaseAdmin.storage.from('images').getPublicUrl(path)
    return res.json({ url: pub?.publicUrl ?? null })
  }catch(e:any){
    return res.status(500).json({ error: { message: 'Error subiendo avatar' } })
  }
})

// Eliminar avatar del usuario autenticado
router.delete('/avatar', requireSupabaseAuth, async (req, res) => {
  try{
    const email = req.authUser?.email
    if (!email) return res.status(401).json({ error: { message: 'No autorizado' } })

    // Obtener path actual desde DB
    const sel = await supabaseAdmin.from('usuario').select('avatar_url').eq('email', email).limit(1)
    if (sel.error) return res.status(500).json({ error: { message: sel.error.message } })
    const current = sel.data?.[0]?.avatar_url as string | null

    // Si hay URL completa, intentar derivar el path después del bucket
    let path: string | null = current || null
    if (path && /^https?:\/\//i.test(path)) {
      // ejemplo: https://<project>.supabase.co/storage/v1/object/public/images/avatars/123.jpg
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
  }catch(e:any){
    return res.status(500).json({ error: { message: 'Error eliminando avatar' } })
  }
})

export default router;

// Registro de docentes: crea cuenta con correo existente en tabla docente
router.post('/register-docente', async (req, res) => {
  try{
    const body = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body)
    const email = body.email.toLowerCase()
    // 1) Verificar que exista docente con ese correo
    const { data: docs, error: dErr } = await supabaseAdmin
      .from('docente')
      .select('id_docente, correo')
      .eq('correo', email)
      .limit(1)
    if (dErr) return res.status(500).json({ error: { message: dErr.message } })
    const docente = docs?.[0]
    if (!docente) return res.status(404).json({ error: { message: 'Correo no asignado a ningún docente' } })

    // 2) Hashear contraseña
    const hash = await bcrypt.hash(body.password, 10)

    // 3) Upsert en tabla usuario (rol maestro)
    const { data: usersSel } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .limit(1)
    const exists = usersSel && usersSel.length > 0
    const payload = {
      email,
      password_hash: hash,
      rol: 'maestro',
      activo: true,
      id_docente: docente.id_docente
    }
    if (exists) {
      const { error: upErr } = await supabaseAdmin.from('usuario').update(payload).eq('email', email)
      if (upErr) return res.status(500).json({ error: { message: upErr.message } })
    } else {
      const { error: insErr } = await supabaseAdmin.from('usuario').insert(payload)
      if (insErr) return res.status(500).json({ error: { message: insErr.message } })
    }

    // 4) Crear/actualizar usuario en Supabase Auth (email/password)
    // Buscar usuario en auth por email
    const listed: any = await (supabaseAdmin.auth as any).admin.listUsers({ page: 1, perPage: 1000 })
    const existing = listed?.data?.users?.find((u: any) => (u.email || '').toLowerCase() === email)
    if (!existing) {
      const { error: cErr } = await (supabaseAdmin.auth as any).admin.createUser({ email, password: body.password, email_confirm: true })
      if (cErr) return res.status(500).json({ error: { message: cErr.message } })
    } else {
      // actualizar password si existe
      const { error: uErr } = await (supabaseAdmin.auth as any).admin.updateUserById(existing.id, { password: body.password })
      if (uErr) return res.status(500).json({ error: { message: uErr.message } })
    }

    return res.status(201).json({ ok: true })
  }catch(e:any){
    if (e?.errors) return res.status(400).json({ error: { message: 'Datos inválidos' } })
    return res.status(500).json({ error: { message: 'Error registrando docente' } })
  }
})
