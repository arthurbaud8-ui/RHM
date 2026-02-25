/**
 * Tests API (health, auth, job-offers).
 * Exécution : npm run test:api (tsx)
 */
import request from 'supertest';
import app from '../app.js';

const base = (path: string) => path.startsWith('/') ? path : `/api/${path}`;

async function run(): Promise<void> {
  // —— Health ——
  const health = await request(app).get('/health');
  if (health.status !== 200) {
    throw new Error(`GET /health: attendu 200, reçu ${health.status}`);
  }
  if (!health.body?.status || health.body.status !== 'OK') {
    throw new Error(`GET /health: body.status attendu "OK", reçu ${JSON.stringify(health.body)}`);
  }

  // —— Offres publiques (sans auth) ——
  const offers = await request(app).get(base('job-offers'));
  if (offers.status !== 200) {
    throw new Error(`GET /api/job-offers: attendu 200, reçu ${offers.status}`);
  }
  if (!offers.body?.data?.offers || !Array.isArray(offers.body.data.offers)) {
    throw new Error(`GET /api/job-offers: body.data.offers attendu (array), reçu ${JSON.stringify(offers.body?.data)}`);
  }

  // —— Auth login (compte seed) ——
  const login = await request(app)
    .post(base('auth/login'))
    .send({ email: 'marie.dupont@example.com', password: 'password123' });
  if (login.status !== 200) {
    throw new Error(`POST /api/auth/login: attendu 200, reçu ${login.status} - ${login.body?.error || login.text}`);
  }
  if (!login.body?.data?.accessToken) {
    throw new Error(`POST /api/auth/login: accessToken attendu, reçu ${JSON.stringify(login.body?.data)}`);
  }

  const token = login.body.data.accessToken;

  // —— Profil utilisateur (authentifié) ——
  const profile = await request(app)
    .get(base('users/profile'))
    .set('Authorization', `Bearer ${token}`);
  if (profile.status !== 200) {
    throw new Error(`GET /api/users/profile: attendu 200, reçu ${profile.status}`);
  }
  if (!profile.body?.data?.email) {
    throw new Error(`GET /api/users/profile: body.data.email attendu`);
  }

  // —— 401 sans token ——
  const noAuth = await request(app).get(base('users/profile'));
  if (noAuth.status !== 401) {
    throw new Error(`GET /api/users/profile sans token: attendu 401, reçu ${noAuth.status}`);
  }

  console.log('✅ Tous les tests API sont passés.');
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
