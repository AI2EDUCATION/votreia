// Global test setup
// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54322/postgres";
process.env.ANTHROPIC_API_KEY = "test-api-key";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
