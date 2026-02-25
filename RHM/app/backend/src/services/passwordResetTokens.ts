/**
 * Stockage des tokens de réinitialisation de mot de passe.
 * Utilise PostgreSQL si DATABASE_URL est défini, sinon une Map en mémoire.
 */
import { getPool } from '../db/client.js';

export interface ResetTokenRow {
  token: string;
  userId: string;
  expiresAt: Date;
}

const memoryTokens = new Map<string, { userId: string; expiresAt: Date }>();

export async function createResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  if (process.env.DATABASE_URL) {
    const pool = getPool();
    await pool.query(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt]
    );
  } else {
    memoryTokens.set(token, { userId, expiresAt });
  }
}

export async function getResetToken(token: string): Promise<ResetTokenRow | null> {
  if (process.env.DATABASE_URL) {
    const pool = getPool();
    const r = await pool.query(
      'SELECT token, user_id AS "userId", expires_at AS "expiresAt" FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    const row = r.rows[0] as { token: string; userId: string; expiresAt: Date } | undefined;
    if (!row) return null;
    return { token: row.token, userId: row.userId, expiresAt: new Date(row.expiresAt) };
  }
  const entry = memoryTokens.get(token);
  if (!entry) return null;
  return { token, userId: entry.userId, expiresAt: entry.expiresAt };
}

export async function deleteResetToken(token: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    const pool = getPool();
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
  } else {
    memoryTokens.delete(token);
  }
}
