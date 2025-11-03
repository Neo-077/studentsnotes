declare namespace NodeJS {
  interface ProcessEnv {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
  }
}
