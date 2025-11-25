type Notify = {
    id: number
    type: 'success' | 'error' | 'info'
    title?: string
    message: string
}

type Listener = (n: Notify | null) => void
const listeners: Listener[] = []
let seq = 1

export function onNotify(cb: Listener) {
    listeners.push(cb)
    return () => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
    }
}

export function notify(opts: { type?: 'success' | 'error' | 'info'; title?: string; message: string }) {
    const n: Notify = { id: seq++, type: opts.type || 'info', title: opts.title, message: opts.message }
    for (const l of listeners) l(n)
}

export function clearNotify() {
    for (const l of listeners) l(null)
}

export default { onNotify, notify, clearNotify }
