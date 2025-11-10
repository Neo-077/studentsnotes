import { Request, Response } from 'express'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import bcrypt from 'bcrypt'

export async function registerDocente(req: Request, res: Response) {
    let authUserId: string | null = null

    try {
        console.log('📥 Body recibido:', JSON.stringify(req.body, null, 2))

        const { email, password, full_name, nombre, ap_paterno, ap_materno, rfc, id_genero } = req.body

        // Validar campos básicos
        if (!email) {
            return res.status(400).json({ error: { message: 'Email requerido' } })
        }
        if (!password) {
            return res.status(400).json({ error: { message: 'Contraseña requerida' } })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: { message: 'La contraseña debe tener al menos 6 caracteres' } })
        }

        const emailLower = email.toLowerCase().trim()

        console.log('🔍 Verificando si el correo existe en la tabla docente...')

        // PRIMERO: Verificar que el correo existe en la tabla docente
        // Solo se pueden crear cuentas para correos que ya están pre-registrados como docentes
        const { data: existingDocente, error: errorDocente } = await supabaseAdmin
            .from('docente')
            .select('id_docente, nombre, ap_paterno, ap_materno, rfc, correo, id_genero')
            .eq('correo', emailLower)
            .maybeSingle()

        if (errorDocente && errorDocente.code !== 'PGRST116') {
            console.error('❌ Error verificando docente:', errorDocente)
            return res.status(500).json({ error: { message: 'Error al verificar docente' } })
        }

        if (!existingDocente) {
            console.log('❌ Correo no autorizado para crear cuenta:', emailLower)
            return res.status(403).json({
                error: { message: 'Este correo no está autorizado para crear una cuenta. Contacta al administrador.' }
            })
        }

        console.log('✅ Docente encontrado:', existingDocente.id_docente)

        // SEGUNDO: Verificar si ya existe un usuario con este correo
        const { data: existingUser, error: errorUser } = await supabaseAdmin
            .from('usuario')
            .select('id_usuario, id_docente')
            .eq('email', emailLower)
            .maybeSingle()

        if (errorUser && errorUser.code !== 'PGRST116') {
            console.error('❌ Error verificando usuario:', errorUser)
            return res.status(500).json({ error: { message: 'Error al verificar usuario' } })
        }

        if (existingUser) {
            console.log('❌ Email ya tiene una cuenta registrada:', emailLower)
            return res.status(409).json({
                error: { message: 'Este correo ya tiene una cuenta registrada. Inicia sesión con tu contraseña.' }
            })
        }

        // TERCERO: Usar los datos del docente existente
        const nombreFinal = existingDocente.nombre || nombre || 'Docente'
        const apPaternoFinal = existingDocente.ap_paterno || ap_paterno || 'Usuario'
        const apMaternoFinal = existingDocente.ap_materno || ap_materno || null
        const rfcToUse = existingDocente.rfc || rfc || 'RFC000000'
        const idGeneroFinal = existingDocente.id_genero || id_genero || null
        const idDocenteExistente = existingDocente.id_docente

        console.log('✅ Datos del docente a usar:', {
            id_docente: idDocenteExistente,
            nombre: nombreFinal,
            ap_paterno: apPaternoFinal,
            rfc: rfcToUse
        })

        // 1. Crear usuario en Supabase Auth primero
        console.log('🔐 Creando usuario en Supabase Auth...')
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailLower,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name || `${nombreFinal} ${apPaternoFinal}`,
                role: 'maestro'
            }
        })

        if (authError) {
            console.error('❌ Error creando usuario en Auth:', authError)
            if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                return res.status(409).json({
                    error: { message: 'Este correo ya está registrado' }
                })
            }
            return res.status(500).json({
                error: { message: `Error al crear usuario: ${authError.message}` }
            })
        }

        authUserId = authUser.user.id
        console.log('✅ Usuario creado en Auth:', authUserId)

        // Hash de contraseña para la tabla local
        console.log('🔒 Generando hash...')
        const password_hash = await bcrypt.hash(password, 10)

        // 2. Crear usuario en tabla local (el docente ya existe)
        console.log('👥 Creando usuario en tabla local...')
        const { data: usuario, error: usuarioError } = await supabaseAdmin
            .from('usuario')
            .insert({
                id_docente: idDocenteExistente,
                email: emailLower,
                password_hash,
                rol: 'maestro',
                activo: true
            })
            .select('id_usuario')
            .single()

        if (usuarioError) {
            console.error('❌ Error creando usuario:', usuarioError)
            // Rollback: eliminar usuario de Auth
            await supabaseAdmin.auth.admin.deleteUser(authUserId)
            return res.status(500).json({
                error: { message: `No se pudo crear el usuario: ${usuarioError.message}` }
            })
        }

        console.log('✅ Usuario creado:', usuario.id_usuario)
        console.log('🎉 Registro exitoso completo')

        return res.status(201).json({
            message: 'Cuenta creada exitosamente',
            id_usuario: usuario.id_usuario,
            id_docente: idDocenteExistente,
            email: emailLower
        })

    } catch (error: any) {
        console.error('💥 Error fatal en registro:', error)

        // Rollback de Auth si existe
        if (authUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(authUserId)
                console.log('🔄 Usuario de Auth eliminado por rollback')
            } catch (rollbackError) {
                console.error('❌ Error en rollback de Auth:', rollbackError)
            }
        }

        return res.status(500).json({
            error: { message: error?.message || 'Error interno del servidor' }
        })
    }
}
