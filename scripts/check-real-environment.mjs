import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ quiet: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await db.connect();
  for (const [name, sql] of [
    ['profiles', 'SELECT role, count(*)::int AS count FROM "UserProfile" GROUP BY role'],
    ['organizations', 'SELECT count(*)::int AS count FROM "Organization"'],
    ['migrations', 'SELECT count(*)::int AS applied FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'],
    ['buckets', 'SELECT id, public, allowed_mime_types FROM storage.buckets'],
    ['storage_policies', "SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'"],
    ['public_tables_rls', "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'"],
  ]) console.log(name, JSON.stringify((await db.query(sql)).rows));
  console.log('service_role_configured', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));
} catch (error) {
  console.error('Environment check failed:', error.code || 'CONNECTION_ERROR');
  process.exitCode = 1;
} finally { await db.end(); }
