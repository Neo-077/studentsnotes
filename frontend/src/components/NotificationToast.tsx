import React, { useEffect, useState } from 'react'
import notifyService, { onNotify } from '../lib/notifyService'

export default function NotificationToast() {
    const [note, setNote] = useState<any | null>(null)
    useEffect(() => {
        const off = onNotify((n) => setNote(n))
        return off
    }, [])

    useEffect(() => {
        if (!note) return
        const t = setTimeout(() => setNote(null), 7000)
        return () => clearTimeout(t)
    }, [note])

    if (!note) return null

    const bg = note.type === 'success' ? 'bg-emerald-600 dark:bg-emerald-500 ring-emerald-400' : note.type === 'error' ? 'bg-red-600 dark:bg-red-500 ring-red-400' : 'bg-slate-700 dark:bg-slate-600 ring-slate-400'

    return (
        <div className="fixed bottom-6 right-6" style={{ zIndex: 9999 }}>
            <div className={`${bg} text-white rounded-md shadow-md p-3 max-w-sm ring-1 ring-offset-1`} role="status" aria-live="polite" aria-atomic="true">
                {note.title ? <div className="font-semibold mb-1">{note.title}</div> : null}
                <div className="text-sm">{note.message}</div>
            </div>
        </div>
    )
}
