import { useEffect, useState } from "react";

type Props = {
    enabled: boolean;
    height: number; // in pixels
    opacity: number; // 0..1
    color: string; // css color
};

export default function ReadingMask({ enabled, height, opacity, color }: Props) {
    const [y, setY] = useState<number>(0);

    useEffect(() => {
        function onMove(e: MouseEvent) {
            setY(e.clientY);
        }
        function onScroll() {
            // keep position roughly centered on viewport when scrolling via keyboard
            // no-op: mousemove will update when mouse moves again
        }
        window.addEventListener("mousemove", onMove, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    if (!enabled) return null;

    const bandTop = Math.max(0, y - height / 2);
    const bandBottom = Math.max(0, window.innerHeight - (y + height / 2));
    const overlayColor = `${color}`;
    const styleTop: React.CSSProperties = {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: bandTop,
        backgroundColor: overlayColor,
        opacity,
        pointerEvents: "none",
        zIndex: 9999,
    };
    const styleBottom: React.CSSProperties = {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: bandBottom,
        backgroundColor: overlayColor,
        opacity,
        pointerEvents: "none",
        zIndex: 9999,
    };

    return (
        <>
            <div style={styleTop} aria-hidden="true" />
            <div style={styleBottom} aria-hidden="true" />
        </>
    );
}
