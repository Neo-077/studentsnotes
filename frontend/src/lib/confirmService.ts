type ConfirmOptions = {
    titleKey?: string
    descriptionKey?: string
    confirmLabelKey?: string
    cancelLabelKey?: string
    danger?: boolean
    // allow raw text fallbacks
    titleText?: string
    descriptionText?: string
    confirmLabelText?: string
    cancelLabelText?: string
}

type Pending = {
    id: number
    opts: ConfirmOptions
    resolve: (v: boolean) => void
}

const listeners: Array<(p: Pending | null) => void> = []
let seq = 1

export function onConfirmRequest(cb: (p: Pending | null) => void) {
    listeners.push(cb)
    return () => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
    }
}

export function requestConfirm(opts: ConfirmOptions): Promise<boolean> {
    // If no listener is mounted (e.g. app root not ready), avoid dangling promise
    if (listeners.length === 0) {
        // auto-confirm so actions aren't blocked; log a warning for developers
        // Consumers may rely on confirmation; ensure the app mounts the modal in App.tsx
        // during normal operation.
        // eslint-disable-next-line no-console
        console.warn('[confirmService] no confirm listeners - auto-confirming')
        return Promise.resolve(true)
    }

    const id = seq++
    return new Promise((resolve) => {
        const p: Pending = { id, opts, resolve }
        // notify listeners
        for (const l of listeners) l(p)
    })
}

export function clearRequest() {
    for (const l of listeners) l(null)
}

export default { requestConfirm, onConfirmRequest, clearRequest }
