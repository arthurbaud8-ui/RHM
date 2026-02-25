import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Charger .env du dossier backend en priorité (puis surcharge avec cwd)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

// Migrations PostgreSQL si DATABASE_URL est défini
if (process.env.DATABASE_URL) {
  try {
    const { runMigrations } = await import('./db/client.js');
    await runMigrations();
    console.log('✅ Base de données : migrations OK');
  } catch (err) {
    console.error('❌ Erreur migrations DB:', err);
    process.exit(1);
  }
}

const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
const isUnsafeSecret = !process.env.JWT_SECRET || jwtSecret === 'fallback-secret-key' || jwtSecret === 'change-me-in-production';
if (process.env.NODE_ENV === 'production' && isUnsafeSecret) {
  console.error('❌ Refusal to start: NODE_ENV=production requires a secure JWT_SECRET.');
  console.error('❌ Please set JWT_SECRET environment variable.');
  console.error('❌ Current JWT_SECRET:', jwtSecret.substring(0, 10) + '...');
  process.exit(1);
}

// Écouter sur 0.0.0.0 pour être accessible depuis nginx dans le même container
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RHM Backend API is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
});

export default app;
