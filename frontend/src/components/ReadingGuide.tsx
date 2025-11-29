import { useEffect, useState } from "react";

type Props = {
    enabled: boolean;
    thickness?: number; // px
    color?: string; // css color
    opacity?: number; // 0..1
};

export default function ReadingGuide({ enabled, thickness = 2, color = "#ffbf00", opacity = 0.9 }: Props) {
    const [y, setY] = useState<number>(typeof window !== "undefined" ? Math.floor(window.innerHeight / 2) : 0);

    // Solo registrar listeners cuando está habilitada; liberar scroll normal salvo Alt+Wheel
    useEffect(() => {
        if (!enabled) return; // evita suscripciones innecesarias cuando está apagada

        function onPointer(e: PointerEvent) {
            // seguir siempre el puntero sin necesidad de click
            setY(e.clientY);
        }
        function onTouch(e: TouchEvent) {
            if (e.touches && e.touches.length) {
                setY(e.touches[0].clientY);
            }
        }
        function onWheel(e: WheelEvent) {
            // Ajustar solo si usuario mantiene ALT; sino permitir scroll natural
            if (!e.altKey) return;
            e.preventDefault();
            const delta = Math.sign(e.deltaY) * 8; // paso de 8px
            setY((prev) => {
                const next = prev + delta;
                return Math.max(0, Math.min(next, window.innerHeight));
            });
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const delta = e.key === "ArrowUp" ? -6 : 6;
                setY((prev) => {
                    const next = prev + delta;
                    return Math.max(0, Math.min(next, window.innerHeight));
                });
            }
        }
        function onResize() {
            setY((prev) => (prev === 0 ? Math.floor(window.innerHeight / 2) : Math.min(prev, window.innerHeight - 1)));
        }
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("touchmove", onTouch, { passive: true });
        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("resize", onResize, { passive: true });
        onResize();
        return () => {
            window.removeEventListener("pointermove", onPointer);
            window.removeEventListener("touchmove", onTouch);
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", onResize);
        };
    }, [enabled]);

    if (!enabled) return null;

    const styleLine: React.CSSProperties = {
        position: "fixed",
        top: Math.max(0, y - thickness / 2),
        left: 0,
        right: 0,
        height: thickness,
        backgroundColor: color,
        opacity,
        pointerEvents: "none",
        zIndex: 10000,
        boxShadow: `0 0 0.5px 0 ${color}`,
    };

    return <div style={styleLine} aria-hidden="true" />;
}
