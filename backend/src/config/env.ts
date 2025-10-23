import 'dotenv/config'

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Falta variable de entorno ${name}`)
  return v
}

export const env = {
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change',
}
