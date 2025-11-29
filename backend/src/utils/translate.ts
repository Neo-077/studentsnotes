import fs from 'fs'
import path from 'path'
import https from 'https'
import { Request } from 'express'

type Translations = Record<string, { es?: string; en?: string }>

let translations: Translations = {}

// import manual dynamic labels if present
let dynamicLabels: any[] = []
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dl = require(path.join(__dirname, '..', 'config', 'dynamicLabels'))
    dynamicLabels = dl?.dynamicLabels || dl?.default || []
} catch (e) {
    dynamicLabels = []
}

function loadTranslations() {
    try {
        const file = path.join(__dirname, '..', 'config', 'translations.json')
        const raw = fs.readFileSync(file, { encoding: 'utf8' })
        translations = JSON.parse(raw || '{}')
    } catch (e) {
        translations = {}
    }
}

loadTranslations()

function normalizeKey(v: string) {
    return String(v || '').trim().toUpperCase()
}

export function translateDynamic(value: unknown, lang: 'es' | 'en' = 'es') {
    if (typeof value !== 'string') return value
    const key = normalizeKey(value)
    const entry = translations[key]
    if (entry && entry[lang]) return entry[lang]
    // check manual dynamicLabels mapping (user-provided CSV translations)
    if (dynamicLabels && dynamicLabels.length) {
        const found = dynamicLabels.find((d: any) => String(d.es || '').toUpperCase().trim() === key)
        if (found && found.en && lang === 'en') return found.en
    }
    return value
}

async function callLibreTranslate(text: string, target: 'en' | 'es') {
    const url = process.env.TRANSLATE_URL || 'https://libretranslate.com'
    const apiKey = process.env.TRANSLATE_API_KEY || ''
    try {
        const endpoint = `${url.replace(/\/$/, '')}/translate`
        return await new Promise<string | null>((resolve) => {
            try {
                const u = new URL(endpoint)
                const payload = JSON.stringify({ q: text, source: 'es', target, format: 'text', api_key: apiKey })
                const opts: any = {
                    hostname: u.hostname,
                    path: u.pathname + u.search,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
                }
                const req = https.request(opts, (res) => {
                    let buf = ''
                    res.setEncoding('utf8')
                    res.on('data', (c) => (buf += c))
                    res.on('end', () => {
                        try {
                            const j = JSON.parse(buf)
                            resolve((j?.translatedText) || (j?.translation) || null)
                        } catch (err) {
                            resolve(null)
                        }
                    })
                })
                req.on('error', () => resolve(null))
                req.write(payload)
                req.end()
            } catch (e) {
                resolve(null)
            }
        })
    } catch (e) {
        return null
    }
}

export async function translateDynamicAsync(value: unknown, lang: 'es' | 'en' = 'es') {
    if (typeof value !== 'string') return value
    const key = normalizeKey(value)
    const entry = translations[key]
    if (entry && entry[lang]) return entry[lang]

    // prefer manual mapping first
    if (dynamicLabels && dynamicLabels.length) {
        const found = dynamicLabels.find((d: any) => String(d.es || '').toUpperCase().trim() === key)
        if (found && found.en && lang === 'en') return found.en
    }

    const provider = (process.env.TRANSLATE_PROVIDER || '').toLowerCase()
    if (lang === 'en' && provider === 'libretranslate') {
        const translated = await callLibreTranslate(value, 'en')
        if (translated) {
            translations[key] = translations[key] || {}
            translations[key].en = translated
            try {
                const file = path.join(__dirname, '..', 'config', 'translations.json')
                fs.writeFileSync(file, JSON.stringify(translations, null, 2), { encoding: 'utf8' })
            } catch (e) {
                // ignore
            }
            return translated
        }
    }
    return value
}

// Translate specific fields in an object/array recursively.
// Enhanced behavior:
// - If an object has `nombre_en` and requested lang is 'en', prefer that for `nombre`.
// - For known keys we run the translation catalog lookup.
// - Recurse into objects and arrays, but avoid translating obvious technical fields (ids, emails, codes).
const KEYS_TO_TRANSLATE = new Set([
    'nombre', 'titulo', 'descripcion', 'periodo', 'modalidad', 'clave', 'carrera_nombre', 'materia_nombre', 'label', 'status', 'tipo'
])

const SKIP_KEY_PATTERNS = [/^id_?/, /^num_?/, /_id$/, /^email$/i, /^no_control$/i, /^grupo_codigo$/i, /^fecha_/, /^hora/]

function shouldSkipKey(key: string) {
    for (const re of SKIP_KEY_PATTERNS) if (re.test(key)) return true
    return false
}

export function translateObjectFields<T>(data: T, lang: 'es' | 'en' = 'es'): T {
    if (Array.isArray(data)) {
        return data.map((x) => translateObjectFields(x, lang)) as unknown as T
    }
    if (data && typeof data === 'object') {
        const out: any = Array.isArray(data) ? [] : {}
        for (const k of Object.keys(data as any)) {
            const val = (data as any)[k]
            if (val == null) {
                out[k] = val
                continue
            }

            // never touch numeric or boolean values
            if (typeof val === 'number' || typeof val === 'boolean') {
                out[k] = val
                continue
            }

            // skip obvious technical keys
            if (shouldSkipKey(k)) {
                out[k] = val
                continue
            }

            // If this is an object and has its own nombre/nombre_en, prefer internal translation
            if (val && typeof val === 'object' && ('nombre' in val || 'nombre_en' in val)) {
                const inner: any = translateObjectFields(val, lang)
                // prefer nombre_en if available for en
                if (lang === 'en' && inner.nombre_en) {
                    inner.nombre = inner.nombre_en
                }
                out[k] = inner
                continue
            }

            if (typeof val === 'object') {
                out[k] = translateObjectFields(val, lang)
                continue
            }

            // val is a string here
            if (typeof val === 'string') {
                // if the key suggests a translatable label, use catalog lookup
                if (KEYS_TO_TRANSLATE.has(k.toLowerCase())) {
                    out[k] = translateDynamic(val, lang)
                    continue
                }

                // fallback: if it's the generic 'nombre' field at root level
                if (k.toLowerCase() === 'nombre') {
                    out[k] = translateDynamic(val, lang)
                    continue
                }

                // otherwise keep as-is
                out[k] = val
                continue
            }

            out[k] = val
        }
        return out
    }
    return data
}

export async function translateObjectFieldsAsync<T>(data: T, lang: 'es' | 'en' = 'es'): Promise<T> {
    if (Array.isArray(data)) {
        const arr = [] as any[]
        for (const it of data as any[]) arr.push(await translateObjectFieldsAsync(it, lang))
        return arr as unknown as T
    }
    if (data && typeof data === 'object') {
        const out: any = Array.isArray(data) ? [] : {}
        for (const k of Object.keys(data as any)) {
            const val = (data as any)[k]
            if (val == null) { out[k] = val; continue }
            if (typeof val === 'number' || typeof val === 'boolean') { out[k] = val; continue }
            if (shouldSkipKey(k)) { out[k] = val; continue }
            if (val && typeof val === 'object' && ('nombre' in val || 'nombre_en' in val)) {
                const inner: any = await translateObjectFieldsAsync(val, lang)
                if (lang === 'en' && inner.nombre_en) inner.nombre = inner.nombre_en
                out[k] = inner
                continue
            }
            if (typeof val === 'object') { out[k] = await translateObjectFieldsAsync(val, lang); continue }
            if (typeof val === 'string') {
                if (KEYS_TO_TRANSLATE.has(k.toLowerCase())) { out[k] = await translateDynamicAsync(val, lang); continue }
                if (k.toLowerCase() === 'nombre') { out[k] = await translateDynamicAsync(val, lang); continue }
                out[k] = val
                continue
            }
            out[k] = val
        }
        return out
    }
    return data
}

export function detectLangFromReq(req: Request): 'es' | 'en' {
    const q = req.query?.lang
    if (q && String(q).toLowerCase().startsWith('en')) return 'en'
    const al = String(req.headers['accept-language'] || '')
    if (al.toLowerCase().startsWith('en')) return 'en'
    return 'es'
}

export default { translateDynamic, translateObjectFields, translateDynamicAsync, translateObjectFieldsAsync, detectLangFromReq }
