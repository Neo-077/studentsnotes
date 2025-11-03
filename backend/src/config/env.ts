// src/config/env.ts
export const env = {
  PORT: process.env.PORT ?? '4000',
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
}

;['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].forEach((k) => {
  if (!(env as any)[k]) {
    console.error(`Falta variable de entorno: ${k}`)
    process.exit(1)
  }
})
