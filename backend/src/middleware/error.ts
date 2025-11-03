// src/middleware/error.ts
import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err.status || err.statusCode || 500)
  const payload = {
    error: {
      message: err.message || 'Error interno',
      details: err.details ?? err.hint ?? err.code ?? undefined,
    },
  }
  if (status >= 500) {
    // Logea errores de servidor
    console.error('[ERROR]', err)
  }
  res.status(status).json(payload)
}
