// src/lib/labels.ts
import i18n from 'i18next'
import dynamicLabels from './dynamicLabels'

type AnyObj = Record<string, any> | null | undefined

export function getCareerLabel(carrera: AnyObj): string {
    if (!carrera) return ''
    const lng = i18n.language || 'es'
    // prefer language-specific fields if provided by backend
    const rawName = carrera.nombre || carrera.label || ''
    // try dynamic labels first when english requested
    let name: string | undefined = undefined
    if (String(lng).startsWith('en')) {
        const key = String(rawName || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase()
        const found = dynamicLabels.find(d => d.type === 'career' && String(d.es || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase() === key)
        if (found && found.en) name = found.en
    }
    name = name || ((lng && String(lng).startsWith('en') ? carrera.nombre_en : undefined) || carrera.nombre_en || carrera.nombre || carrera.label || '')
    const clave = carrera.clave ? `${carrera.clave} — ` : ''
    return `${clave}${name}`.trim()
}

export function getSubjectLabel(materia: AnyObj): string {
    if (!materia) return ''
    const lng = i18n.language || 'es'
    const rawName = materia.nombre || materia.label || ''
    let name: string | undefined = undefined
    if (String(lng).startsWith('en')) {
        const key = String(rawName || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase()
        const found = dynamicLabels.find(d => d.type === 'subject' && String(d.es || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase() === key)
        if (found && found.en) name = found.en
    }
    name = name || ((lng && String(lng).startsWith('en') ? materia.nombre_en : undefined) || materia.nombre_en || materia.nombre || materia.label || '')
    const clave = materia.clave ? `${materia.clave} — ` : ''
    return `${clave}${name}`.trim()
}

export function getGenericLabel(obj: AnyObj): string {
    if (!obj) return ''
    const lng = i18n.language || 'es'
    const rawName = obj.nombre || obj.label || ''
    let name: string | undefined = undefined
    if (String(lng).startsWith('en')) {
        const key = String(rawName || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase()
        const found = dynamicLabels.find(d => d.type === 'modality' && String(d.es || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase() === key)
        if (found && found.en) name = found.en
    }
    return (name) || ((lng && String(lng).startsWith('en') ? obj.nombre_en : undefined) || obj.nombre_en || obj.nombre || obj.label || '')
}

export function getTermLabel(term: AnyObj): string {
    if (!term) return ''
    const lng = i18n.language || 'es'
    const raw = `${term.anio} ${String(term.periodo || '').toUpperCase()}`.trim()
    if (String(lng).startsWith('en')) {
        const key = String(raw || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase()
        const found = dynamicLabels.find(d => d.type === 'term' && String(d.es || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase() === key)
        if (found && found.en) return found.en
    }
    return raw
}

export function getGenderLabel(genero: AnyObj): string {
    if (!genero) return ''
    const lng = i18n.language || 'es'
    const raw = String(genero.descripcion || genero.nombre || genero.label || genero.clave || '').trim()
    const norm = String(raw || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase()

    // Known mappings for common Spanish labels
    const mapEn: Record<string, string> = {
        'FEMENINO': i18n.t('gender.female'),
        'FEMALE': i18n.t('gender.female'),
        'MASCULINO': i18n.t('gender.male'),
        'MALE': i18n.t('gender.male'),
        'OTRO': i18n.t('gender.other'),
        'OTHER': i18n.t('gender.other'),
        'NO ESPECIFICADO': i18n.t('gender.unspecified')
    }

    if (String(lng).startsWith('en')) {
        // try dynamic labels first
        const found = dynamicLabels.find(d => d.type === 'gender' && String(d.es || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase() === norm)
        if (found && found.en) return found.en
        if (mapEn[norm]) return mapEn[norm]
        // try clave shortcuts
        const clave = String(genero.clave || '').toUpperCase()
        if (clave === 'M') return i18n.t('gender.male')
        if (clave === 'F') return i18n.t('gender.female')
        return raw
    }

    return raw
}

// Shorten a label to the first N words (default 2), preserving empty fallback
export function shortLabel(raw: string | undefined | null, words = 2): string {
    const s = (raw || '').toString().trim()
    if (!s) return ''
    const parts = s.split(/\s+/)
    if (parts.length <= words) return s
    return parts.slice(0, words).join(' ')
}

// Translate schedule strings like "LUN-VIE 07:00-08:00" into the current UI language.
export function formatHorario(horario?: any): string {
    if (!horario || typeof horario !== 'string') return horario || ''
    const map: Record<string, string> = {
        LUN: i18n.t('days.monShort'),
        MAR: i18n.t('days.tueShort'),
        MIE: i18n.t('days.wedShort'),
        JUE: i18n.t('days.thuShort'),
        VIE: i18n.t('days.friShort'),
        SAB: i18n.t('days.satShort'),
        DOM: i18n.t('days.sunShort'),
    }
    // Replace tokens preserving separators like '-' and ',' and surrounding text
    return horario.replace(/\b(LUN|MAR|MIE|JUE|VIE|SAB|DOM)\b/gi, (m) => {
        return map[(m || '').toUpperCase()] || m
    })
}

export default { getCareerLabel, getSubjectLabel, getGenericLabel, getTermLabel, getGenderLabel, shortLabel }
