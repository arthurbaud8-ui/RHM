/**
 * Route admin : consulter la base de données depuis le navigateur.
 * Accès public (non sécurisé) : toute personne avec l'URL peut voir les données.
 */
import { Router, Response, Request } from 'express';
import { getPool } from '../db/client.js';

const router = Router();

const LIMIT_ROWS = 100;
const PAGE_TITLE = 'RHM – Admin Base de données';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cellValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return escapeHtml(JSON.stringify(val).slice(0, 200));
  return escapeHtml(String(val));
}

async function getPublicTables(pool: { query: (q: string) => Promise<{ rows: { tablename: string }[] }> }): Promise<string[]> {
  const r = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return (r.rows || []).map((row: { tablename: string }) => row.tablename);
}

router.get('/db', async (req: Request, res: Response): Promise<void> => {
    if (!process.env.DATABASE_URL) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(`
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${PAGE_TITLE}</title></head>
<body style="font-family: system-ui; max-width: 800px; margin: 2rem auto; padding: 1rem;">
  <h1>Admin DB</h1>
  <p>La base de données PostgreSQL n'est pas utilisée (store en mémoire). Définissez <code>DATABASE_URL</code> pour activer la persistance.</p>
</body>
</html>`);
      return;
    }

    try {
      const pool = getPool();
      const tableNames = await getPublicTables(pool);

      const tablesData: { name: string; count: number; columns: string[]; rows: Record<string, unknown>[] }[] = [];

      for (const tableName of tableNames) {
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS c FROM "${tableName.replace(/"/g, '""')}"`
        );
        const count = (countResult.rows[0] as { c: number })?.c ?? 0;

        let columns: string[] = [];
        let rows: Record<string, unknown>[] = [];

        try {
          const selectResult = await pool.query(
            `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT ${LIMIT_ROWS}`
          );
          rows = (selectResult.rows || []) as Record<string, unknown>[];
          if (rows.length > 0) {
            columns = Object.keys(rows[0]);
          } else if (count > 0) {
            const colResult = await pool.query(
              `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
              [tableName]
            );
            columns = (colResult.rows || []).map((r: { column_name: string }) => r.column_name);
          }
        } catch (e) {
          columns = [];
          rows = [];
        }

        tablesData.push({ name: tableName, count, columns, rows });
      }

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${PAGE_TITLE}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #1a1a2e; color: #eee; }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
    section { margin-bottom: 2rem; }
    h2 { font-size: 1.2rem; margin: 0 0 0.5rem; color: #aaccff; }
    .count { color: #888; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; overflow-x: auto; display: block; }
    th, td { padding: 0.4rem 0.6rem; text-align: left; border: 1px solid #333; }
    th { background: #16213e; color: #aaccff; }
    tr:nth-child(even) { background: #0f0f1a; }
    td { max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
    .empty { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>${PAGE_TITLE}</h1>
  <p class="meta">${tableNames.length} table(s) · Lecture seule</p>

  ${tablesData
    .map(
      (t) => `
  <section>
    <h2>${escapeHtml(t.name)} <span class="count">(${t.count} ligne${t.count !== 1 ? 's' : ''})</span></h2>
    ${
      t.rows.length === 0
        ? '<p class="empty">Aucune ligne</p>'
        : `
    <table>
      <thead><tr>${t.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>
        ${t.rows.map((r) => `<tr>${t.columns.map((c) => `<td>${cellValue(r[c])}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    ${t.count > LIMIT_ROWS ? `<p class="meta">Affichage des ${LIMIT_ROWS} premières lignes sur ${t.count}.</p>` : ''}`
    }
  </section>`
    )
    .join('')}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (err) {
      console.error('Admin DB error:', err);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(`
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${PAGE_TITLE}</title></head>
<body style="font-family: system-ui; margin: 2rem;">
  <h1>Erreur</h1>
  <p>Impossible de lire la base : ${escapeHtml(String(err))}</p>
</body>
</html>`);
    }
  }
);

export default router;
