/**
 * Service d'envoi d'emails transactionnels (bienvenue, reset password, candidature, message).
 * Utilise SMTP (nodemailer). Si SMTP n'est pas configuré, les envois sont loggés et ignorés.
 */
import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
const MAIL_FROM = process.env.MAIL_FROM || 'RHM <noreply@rhm.local>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port) {
    console.warn('⚠️  SMTP non configuré (SMTP_HOST, SMTP_PORT). Les emails ne seront pas envoyés.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const trans = getTransporter();
  if (!trans) {
    console.log('[Email] (SMTP désactivé)', { to, subject });
    return false;
  }
  try {
    await trans.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[Email] Erreur envoi:', err);
    return false;
  }
}

const layout = (body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px; }
  a { color: #0a66c2; }
  .btn { display: inline-block; padding: 10px 20px; background: #0a66c2; color: #fff !important; text-decoration: none; border-radius: 6px; margin-top: 12px; }
  .footer { margin-top: 32px; font-size: 12px; color: #666; }
</style></head>
<body>${body}<p class="footer">— RHM, plateforme de recrutement</p></body>
</html>`;

export const emailTemplates = {
  welcome(prenom: string, role: string) {
    const roleLabel = role === 'recruiter' ? 'recruteur' : 'candidat';
    return layout(`
      <h2>Bienvenue sur RHM</h2>
      <p>Bonjour ${escapeHtml(prenom)},</p>
      <p>Votre compte ${roleLabel} a été créé avec succès. Vous pouvez vous connecter et commencer à utiliser la plateforme.</p>
      <p><a href="${FRONTEND_URL}/login" class="btn">Se connecter</a></p>
    `);
  },

  resetPassword(prenom: string, resetLink: string, expiresMinutes: number) {
    return layout(`
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Bonjour ${escapeHtml(prenom)},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous (valable ${expiresMinutes} minutes) :</p>
      <p><a href="${resetLink}" class="btn">Réinitialiser mon mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `);
  },

  applicationReceived(candidatePrenom: string, offerTitle: string, companyName: string) {
    return layout(`
      <h2>Candidature bien reçue</h2>
      <p>Bonjour ${escapeHtml(candidatePrenom)},</p>
      <p>Nous avons bien reçu votre candidature pour le poste <strong>${escapeHtml(offerTitle)}</strong>${companyName ? ` chez ${escapeHtml(companyName)}` : ''}.</p>
      <p>Le recruteur examinera votre profil et vous recontactera en cas de suite favorable.</p>
      <p><a href="${FRONTEND_URL}/applications" class="btn">Voir mes candidatures</a></p>
    `);
  },

  newApplicationToRecruiter(recruiterPrenom: string, offerTitle: string, candidateName: string, applicationId: string, offerId: string) {
    const link = `${FRONTEND_URL}/recruiter/offers/${offerId}/applications`;
    return layout(`
      <h2>Nouvelle candidature</h2>
      <p>Bonjour ${escapeHtml(recruiterPrenom)},</p>
      <p>Vous avez reçu une nouvelle candidature pour l'offre <strong>${escapeHtml(offerTitle)}</strong> de la part de <strong>${escapeHtml(candidateName)}</strong>.</p>
      <p><a href="${link}" class="btn">Voir les candidatures</a></p>
    `);
  },

  applicationStatusChange(candidatePrenom: string, offerTitle: string, newStatus: string, companyName?: string) {
    const statusLabels: Record<string, string> = {
      reviewed: 'examinée',
      shortlisted: 'mise en shortlist / sélectionnée pour un entretien',
      rejected: 'refusée',
      hired: 'acceptée — vous êtes embauché(e) !',
    };
    const label = statusLabels[newStatus] || newStatus;
    return layout(`
      <h2>Mise à jour de votre candidature</h2>
      <p>Bonjour ${escapeHtml(candidatePrenom)},</p>
      <p>Votre candidature pour le poste <strong>${escapeHtml(offerTitle)}</strong>${companyName ? ` chez ${escapeHtml(companyName)}` : ''} a été <strong>${escapeHtml(label)}</strong>.</p>
      <p><a href="${FRONTEND_URL}/applications" class="btn">Voir mes candidatures</a></p>
    `);
  },

  newMessage(recipientPrenom: string, senderName: string, preview: string, conversationId: string) {
    const link = `${FRONTEND_URL}/messaging`;
    return layout(`
      <h2>Nouveau message</h2>
      <p>Bonjour ${escapeHtml(recipientPrenom)},</p>
      <p><strong>${escapeHtml(senderName)}</strong> vous a envoyé un message :</p>
      <p>${escapeHtml(preview)}</p>
      <p><a href="${link}" class="btn">Voir la conversation</a></p>
    `);
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
