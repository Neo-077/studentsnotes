export default function formatApiError(err: any, opts?: { entity?: string; action?: 'delete' | 'create' | 'update' | 'read' }) {
    const raw = err?.response?.data?.error?.message || err?.message || String(err || '')
    const lower = String(raw).toLowerCase()

    // Foreign key / related records preventing delete
    if (
        /violates foreign key constraint/.test(lower) ||
        /foreign key constraint/.test(lower) ||
        /a foreign key constraint fails/.test(lower) ||
        /cannot delete or update a parent row/.test(lower) ||
        /no puede eliminar/.test(lower)
    ) {
        if (opts?.action === 'delete') {
            return opts?.entity
                ? `No se puede eliminar ${opts.entity} porque existen registros relacionados.`
                : 'No se puede eliminar porque existen registros relacionados.'
        }
        return 'No se puede completar la operación porque existen registros relacionados.'
    }

    // Unique / duplicate
    if (/duplicate key value violates unique constraint/.test(lower) || /already exists/.test(lower) || /unique constraint/.test(lower)) {
        return opts?.entity ? `Ya existe ${opts.entity} con los mismos datos.` : 'Ya existe un registro con los mismos datos.'
    }

    // Permission denied
    if (/permission denied/.test(lower) || /no tiene permisos/.test(lower)) {
        return 'No tienes permisos para realizar esta acción.'
    }

    // Timeout / network
    if (/timeout|tiempo de espera|timed out|abort/i.test(lower)) {
        return 'Tiempo de espera o error de red. Intenta de nuevo.'
    }

    // Validation / bad input
    if (/invalid input syntax/.test(lower) || /invalid value/.test(lower)) {
        return 'Datos inválidos. Revisa los campos y vuelve a intentarlo.'
    }

    // Fallback: try to return a short, safe message
    const clean = String(raw).replace(/\s+/g, ' ').trim()
    if (clean.length > 0 && clean.length < 200) return clean
    return 'Ocurrió un error. Intenta de nuevo.'
}
