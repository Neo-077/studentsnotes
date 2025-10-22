import type { Request, Response, NextFunction } from "express";

// Handler de errores centralizado
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === "number" ? err.status : 500;
  const code = err?.code ?? "INTERNAL_ERROR";
  const message = err?.message ?? "Error interno del servidor";

  // Log simple; ajusta a tu logger si tienes
  if (status >= 500) {
    console.error("[ERROR]", err);
  } else {
    console.warn("[WARN]", err);
  }

  res.status(status).json({ error: { code, message } });
}
