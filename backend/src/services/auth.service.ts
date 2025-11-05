import { supabase } from '../utils/supabaseClient.js'
import bcrypt from 'bcrypt'

interface RegisterDocenteInput {
    email: string
    password: string
    nombre?: string
    ap_paterno?: string
    ap_materno?: string
    id_genero?: number
}

interface RegisterDocenteOutput {
    id_usuario: number
    id_docente: number
    email: string
}

export class AuthService {
    async registerDocente(input: RegisterDocenteInput): Promise<RegisterDocenteOutput> {
        const email = String(input.email || '').toLowerCase().trim()
        const passwordHash = await bcrypt.hash(String(input.password), 10)

        const { data, error } = await supabase
            .rpc('register_docente', {
                p_email: email,
                p_password_hash: passwordHash,
                p_nombre: input.nombre || null,
                p_ap_paterno: input.ap_paterno || null,
                p_ap_materno: input.ap_materno || null,
                p_id_genero: input.id_genero || null
            })

        if (error) {
            // Email unique constraint violation
            if (error.code === '23505') {
                const err: any = new Error('Este correo ya está registrado')
                err.status = 409
                throw err
            }

            // Other database errors
            const err: any = new Error(error.message || 'Error al registrar docente')
            err.status = 500
            err.details = error
            throw err
        }

        if (!data?.[0]) {
            const err: any = new Error('No se pudo crear el registro')
            err.status = 500
            throw err
        }

        return data[0] as RegisterDocenteOutput
    }

    // Add other auth methods here...
}

// Export singleton instance
export const authService = new AuthService()
