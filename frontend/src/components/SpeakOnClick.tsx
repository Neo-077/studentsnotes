import React from "react"
import { useAccessibility } from "../store/useAccessibility"
import { TTS } from "../lib/tts"

type Props = {
    children: React.ReactNode
    text?: string
    className?: string
    title?: string
}

export const SpeakOnClick: React.FC<Props> = ({ children, text, className, title }) => {
    const { voiceEnabled, voiceRate } = useAccessibility(s => ({ voiceEnabled: s.voiceEnabled, voiceRate: s.voiceRate }))

    const speak = (payload?: string) => {
        if (!voiceEnabled) return
        const content = payload || (typeof children === 'string' ? children : undefined)
        // fallback to element textContent via DOM when children not simple string
        if (!content) return
        if (TTS.isSupported()) {
            TTS.speak(content, { rate: voiceRate })
        }
    }

    const onClick: React.MouseEventHandler = (e) => {
        // avoid speaking when clicking interactive children
        const el = e.currentTarget as HTMLElement
        let payload = text
        if (!payload) payload = el.textContent || undefined
        speak(payload)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            const el = e.currentTarget as HTMLElement
            const payload = text || el.textContent || undefined
            speak(payload)
        }
    }

    return (
        <span
            role={voiceEnabled ? "button" : undefined}
            tabIndex={voiceEnabled ? 0 : undefined}
            onClick={onClick}
            onKeyDown={onKeyDown}
            className={className}
            title={title}
        >
            {children}
        </span>
    )
}

export default SpeakOnClick
