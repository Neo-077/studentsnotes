// src/lib/tts.ts
export const TTS = (() => {
  const synth =
    typeof window !== "undefined"
      ? (window.speechSynthesis as SpeechSynthesis)
      : null

  let currentUtterance: SpeechSynthesisUtterance | null = null

  function isSupported() {
    return !!synth
  }

  function stop() {
    if (!synth) return
    synth.cancel()
    currentUtterance = null
  }

  function speak(
    text: string,
    options?: { lang?: string; rate?: number; pitch?: number; voiceName?: string }
  ) {
    if (!synth || !text) return
    try {
      stop()
      const u = new SpeechSynthesisUtterance(text)

      if (options?.lang) u.lang = options.lang
      if (options?.rate) u.rate = options.rate
      if (options?.pitch) u.pitch = options.pitch

      if (options?.voiceName) {
        const v = synth
          .getVoices()
          .find(
            (x) =>
              x.name === options.voiceName ||
              x.voiceURI === options.voiceName
          )
        if (v) u.voice = v
      }

      currentUtterance = u
      synth.speak(u)
    } catch {
      try {
        const u = new SpeechSynthesisUtterance(text)
        currentUtterance = u
        synth!.speak(u)
      } catch {
        // noop
      }
    }
  }

  function getVoices() {
    if (!synth) return [] as SpeechSynthesisVoice[]
    return synth.getVoices()
  }

  return { isSupported, speak, stop, getVoices }
})()
