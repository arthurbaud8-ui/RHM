/**
 * Client PostgreSQL pour RHM.
 * Utilise DATABASE_URL (ex. postgres://user:pass@host:5432/dbname).
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL doit être défini pour utiliser la base de données.');
    }
    pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => console.error('Pool PostgreSQL:', err));
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Exécute le schéma SQL (migrations). */
export async function runMigrations(): Promise<void> {
  const p = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Fichier schema.sql introuvable: ${schemaPath}. Lancez "npm run build" pour copier les assets.`);
  }
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await p.query(sql);
}

/** Vérifie que la connexion fonctionne. */
export async function healthCheck(): Promise<boolean> {
  try {
    const p = getPool();
    const r = await p.query('SELECT 1');
    return !!r.rows?.[0];
  } catch {
    return false;
  }
}
