import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { dataStore } from '../data/asyncStore.js';
import { User, RegisterRequest, LoginRequest } from '../types/index.js';
import { sendMail, emailTemplates } from '../services/email.js';
import * as passwordResetTokens from '../services/passwordResetTokens.js';

const router = Router();

const RESET_TOKEN_EXPIRES_MINUTES = 60;

// Validation schemas
const registerSchema = Joi.object({
  nom: Joi.string().required().trim().min(2).max(50),
  prenom: Joi.string().required().trim().min(2).max(50),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).max(100),
  role: Joi.string().valid('candidate', 'recruiter').default('candidate')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().length(64),
  newPassword: Joi.string().min(6).max(100).required()
});

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    const { nom, prenom, email, password, role }: RegisterRequest = value;

    // Check if user already exists
    const existingUser = await dataStore.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà'
      });
      return;
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = password ? await bcrypt.hash(password, 12) : '';

    const newUser: User = {
      id: userId,
      nom,
      prenom,
      email,
      password: hashedPassword,
      role: role || 'candidate',
      profile: {
        skills: [],
        experience: '',
        education: '',
        testResults: [],
        jobPreferences: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdUser = await dataStore.createUser(newUser);

    // Email de bienvenue (non bloquant)
    sendMail(createdUser.email, 'Bienvenue sur RHM', emailTemplates.welcome(createdUser.prenom, createdUser.role)).catch(() => {});

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign(
      { userId: createdUser.id },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = createdUser;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Compte créé avec succès'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du compte'
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    const { email, password }: LoginRequest = value;

    // Find user
    const user = await dataStore.getUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Connexion réussie'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// Mot de passe oublié : envoi d'un lien de réinitialisation par email
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    const { email } = value;
    const user = await dataStore.getUserByEmail(email);
    // On ne révèle pas si l'email existe ou non (sécurité)
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);
      await passwordResetTokens.createResetToken(user.id, token, expiresAt);
      const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;
      await sendMail(user.email, 'Réinitialisation de votre mot de passe', emailTemplates.resetPassword(user.prenom, resetLink, RESET_TOKEN_EXPIRES_MINUTES));
    }
    res.json({
      success: true,
      message: 'Si cet email est associé à un compte, vous recevrez un lien pour réinitialiser votre mot de passe.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de la demande.' });
  }
});

// Réinitialisation du mot de passe avec le token reçu par email
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    const { token, newPassword } = value;
    const row = await passwordResetTokens.getResetToken(token);
    if (!row) {
      res.status(400).json({ success: false, error: 'Lien invalide ou expiré.' });
      return;
    }
    if (new Date() > new Date(row.expiresAt)) {
      await passwordResetTokens.deleteResetToken(token);
      res.status(400).json({ success: false, error: 'Lien expiré. Veuillez refaire une demande.' });
      return;
    }
    const user = await dataStore.getUserById(row.userId);
    if (!user) {
      res.status(400).json({ success: false, error: 'Utilisateur introuvable.' });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await dataStore.updateUser(user.id, { password: hashedPassword });
    await passwordResetTokens.deleteResetToken(token);
    res.json({ success: true, message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de la réinitialisation.' });
  }
});

export default router;