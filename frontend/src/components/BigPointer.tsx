import React from "react"
import { useAccessibility } from "../store/useAccessibility"

export default function BigPointer() {
    const { bigPointer, pointerSize } = useAccessibility(s => ({ bigPointer: s.bigPointer, pointerSize: s.pointerSize }))
    const { pointerColor } = useAccessibility(s => ({ pointerColor: (s as any).pointerColor }))

    const ref = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        if (!bigPointer) return
        const el = ref.current
        if (!el) return

        // Hide native cursor via inline style to ensure it disappears
        const root = document.documentElement
        const prevCursor = root.style.cursor
        root.style.cursor = 'none'

        const onMove = (ev: MouseEvent) => {
            const x = ev.clientX
            const y = ev.clientY
            // position overlay so its top-left aligns with the real pointer (hotspot 0,0)
            el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }

        window.addEventListener('mousemove', onMove)
        return () => {
            window.removeEventListener('mousemove', onMove)
            // restore cursor
            try { root.style.cursor = prevCursor } catch { }
        }
    }, [bigPointer, pointerSize])

    if (!bigPointer) return null

    // Use the supplied nicer pointer SVG (black and white variants). Keep the original viewBox so
    // the shape scales correctly. We'll set container height to `pointerSize` and compute width
    // by the original aspect ratio so the pointer doesn't distort.
    const makeSvgDataUrl = (color: 'black' | 'white') => {
        const fill = color === 'black' ? '#231F20' : '#FFFFFF'
        const svg = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="1064.7701 445.5539 419.8101 717.0565" xml:space="preserve">\n  <polygon fill="${fill}" points="1283.1857,1127.3097 1406.1421,1077.6322 1314.2406,850.1678 1463.913,852.7823 1093.4828,480.8547 1085.4374,1005.6964 1191.2842,899.8454 "/>\n</svg>`
        try {
            const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg).toString('base64')
            return `data:image/svg+xml;base64,${b64}`
        } catch {
            return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
        }
    }

    const src = pointerColor === 'white' ? makeSvgDataUrl('white') : makeSvgDataUrl('black')
    const aspect = 419.8101 / 717.0565
    const containerWidth = Math.max(8, Math.round(pointerSize * aspect))
    const containerHeight = Math.max(8, pointerSize)

    return (
        <div
            ref={ref}
            aria-hidden
            style={{
                position: 'fixed',
                pointerEvents: 'none',
                top: 0,
                left: 0,
                width: `${containerWidth}px`,
                height: `${containerHeight}px`,
                transform: 'translate3d(-9999px,-9999px,0)',
                transition: 'transform 20ms linear, width 120ms ease, height 120ms ease',
                zIndex: 2147483647
            }}
            className="big-pointer-overlay"
        >
            <img
                src={src}
                alt=""
                draggable={false}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    imageRendering: 'auto'
                }}
            />
        </div>
    )
}
