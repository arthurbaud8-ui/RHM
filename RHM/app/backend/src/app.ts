/**
 * Application Express (sans démarrage du serveur).
 * Utilisé par server.ts en prod et par les tests API (supertest).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import opportunityRoutes from './routes/opportunities.js';
import testRoutes from './routes/tests.js';
import uploadRoutes from './routes/uploads.js';
import recruiterRoutes from './routes/recruiters.js';
import jobOfferRoutes from './routes/jobOffers.js';
import walletRoutes from './routes/wallet.js';
import messagingRoutes from './routes/messaging.js';
import applicationsRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuration CORS améliorée pour Fly.io
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
console.log(`🔐 CORS Origin configuré: ${corsOrigin}`);

app.use(cors({
  origin: (origin, callback) => {
    // Si pas d'origine (requêtes depuis le même domaine via nginx proxy), accepter
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Accepter si l'origine correspond ou contient fly.dev
    if (origin.includes('fly.dev') || corsOrigin.includes(origin) || corsOrigin === '*' || origin === corsOrigin) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // En développement, accepter toutes les origines
      callback(null, true);
    } else {
      // En production, accepter quand même pour éviter les problèmes (mais logger)
      console.warn(`⚠️  CORS: Origine non standard acceptée: ${origin}, attendu: ${corsOrigin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    });
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/job-offers', jobOfferRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
