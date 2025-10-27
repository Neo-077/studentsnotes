import type { Request, Response, NextFunction } from "express"

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("❌ Error:", err)

  const status = err.status || 500
  const message = err.message || "Error interno del servidor"
  const details = err.details || null

  res.status(status).json({ message, details })
}
