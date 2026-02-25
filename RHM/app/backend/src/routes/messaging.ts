import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { dataStore } from '../data/asyncStore.js';
import { Notification } from '../types/index.js';
import { sendMail, emailTemplates } from '../services/email.js';

const router = Router();

// Infos recruteur visibles par le candidat une fois contacté (via conversation)
export interface RecruiterPublicInfo {
  id: string;
  nom: string;
  prenom: string;
  avatarUrl?: string;
  companyName?: string;
}

// Interfaces pour la messagerie
interface Message {
  id: string;
  from: 'candidate' | 'recruiter';
  content: string;
  conversationId: string;
  applicationId?: string;
  type?: 'text' | 'test_invitation' | 'meeting_invitation';
  testId?: string;
  testTitle?: string;
  meetingData?: {
    date: string; // ISO date string
    time: string; // HH:mm format
    address: string;
    instructions?: string;
  };
  createdAt: Date;
}

interface Conversation {
  id: string;
  applicationId: string;
  candidate: string;
  role: string;
  isLocked: boolean;
  lastMessage: {
    content: string;
    time: Date;
  } | null;
  updatedAt: Date;
  /** Renseigné pour les candidats : infos du recruteur (visible car conversation existante) */
  recruiter?: RecruiterPublicInfo;
}

// Stockage temporaire (à remplacer par une vraie DB plus tard)
export const conversationsStore = new Map<string, Conversation>();
export const messagesStore = new Map<string, Message[]>();

// Initialiser les messages pour une conversation
function getConversationMessages(conversationId: string): Message[] {
  if (!messagesStore.has(conversationId)) {
    messagesStore.set(conversationId, []);
  }
  return messagesStore.get(conversationId)!;
}

// Créer une conversation (recruteur uniquement)
router.post('/conversations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    // Seuls les recruteurs peuvent créer des conversations
    if (req.user.role !== 'recruiter') {
      res.status(403).json({
        success: false,
        error: 'Seuls les recruteurs peuvent initier des conversations'
      });
      return;
    }

    const { applicationId } = req.body;

    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ID de candidature requis'
      });
      return;
    }

    // Vérifier que la candidature existe et appartient à une offre du recruteur
    const allApplications = await dataStore.getAllJobApplications();
    const application = allApplications.find(app => app.id === applicationId);
    
    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
      return;
    }

    const jobOffer = await dataStore.getJobOfferById(application.jobOfferId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas accès à cette candidature'
      });
      return;
    }

    const conversationId = `conv-${applicationId}`;
    const candidate = await dataStore.getUserById(application.userId);

    // Créer la conversation si elle n'existe pas déjà
    if (!conversationsStore.has(conversationId)) {
      const conversation: Conversation = {
        id: conversationId,
        applicationId: application.id,
        candidate: candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat',
        role: jobOffer.title || 'Poste',
        isLocked: false,
        lastMessage: null,
        updatedAt: new Date()
      };
      conversationsStore.set(conversationId, conversation);
    }

    const conversation = conversationsStore.get(conversationId)!;

    res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation créée avec succès'
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la conversation'
    });
  }
});

// Récupérer les conversations
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    // Récupérer les candidatures de l'utilisateur
    let applications: any[] = [];
    
    if (req.user.role === 'recruiter') {
      const jobOffers = await dataStore.getJobOffersByRecruiterId(req.user.id);
      const appArrays = await Promise.all(jobOffers.map(offer => dataStore.getApplicationsByJobId(offer.id)));
      applications = appArrays.flat();
    } else {
      // Pour les candidats, récupérer leurs propres candidatures
      applications = await dataStore.getApplicationsByUserId(req.user.id);
    }

    // Créer ou récupérer les conversations
    const conversationResults = await Promise.all(applications.map(async (app) => {
      const conversationId = `conv-${app.id}`;
      const jobOffer = await dataStore.getJobOfferById(app.jobOfferId);
      const candidate = req.user!.role === 'candidate'
        ? req.user
        : await dataStore.getUserById(app.userId);

      if (req.user!.role === 'candidate') {
        const messages = getConversationMessages(conversationId);
        if (messages.length === 0) return null;
      }

      if (!conversationsStore.has(conversationId) && req.user!.role === 'recruiter') {
        const conversation: Conversation = {
          id: conversationId,
          applicationId: app.id,
          candidate: candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat',
          role: jobOffer?.title || 'Poste',
          isLocked: false,
          lastMessage: null,
          updatedAt: new Date()
        };
        conversationsStore.set(conversationId, conversation);
      }

      if (!conversationsStore.has(conversationId)) return null;

      const conv = conversationsStore.get(conversationId)!;
      const messages = getConversationMessages(conversationId);
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        conv.lastMessage = { content: lastMsg.content, time: lastMsg.createdAt };
        conv.updatedAt = lastMsg.createdAt;
      }

      if (req.user!.role === 'candidate' && jobOffer) {
        const recruiter = await dataStore.getUserById(jobOffer.recruiterId);
        if (recruiter) {
          (conv as any).recruiter = {
            id: recruiter.id,
            nom: recruiter.nom,
            prenom: recruiter.prenom,
            avatarUrl: recruiter.avatarUrl,
            companyName: recruiter.recruiterProfile?.companyName
          };
        }
      }
      return conv;
    }));
    const conversations: Conversation[] = conversationResults
      .filter((conv): conv is Conversation => conv !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({
      success: true,
      data: conversations,
      message: 'Conversations récupérées avec succès'
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des conversations'
    });
  }
});

// Récupérer les messages d'une conversation
router.get('/messages', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { conversationId } = req.query;

    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ID de conversation requis'
      });
      return;
    }

    const messages = getConversationMessages(conversationId);

    // Adapter le format pour le frontend
    const adaptedMessages = messages.map(msg => ({
      id: msg.id,
      from: msg.from,
      content: msg.content,
      time: msg.createdAt.toISOString(),
      type: msg.type || 'text',
      testId: msg.testId,
      testTitle: msg.testTitle,
      meetingData: msg.meetingData
    }));

    res.json({
      success: true,
      data: adaptedMessages,
      message: 'Messages récupérés avec succès'
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des messages'
    });
  }
});

// Envoyer un message (texte ou invitation à un test)
router.post('/messages', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { content, conversationId, applicationId, testId, meetingData } = req.body;

    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'ID de conversation requis'
      });
      return;
    }

    // Vérifier que la conversation existe
    if (!conversationsStore.has(conversationId)) {
      res.status(404).json({
        success: false,
        error: 'Conversation non trouvée'
      });
      return;
    }

    const conversation = conversationsStore.get(conversationId)!;
    const messages = getConversationMessages(conversationId);

    // Pour les candidats : vérifier qu'il y a déjà au moins un message (initié par le recruteur)
    if (req.user.role === 'candidate' && messages.length === 0) {
      res.status(403).json({
        success: false,
        error: 'Vous ne pouvez pas initier une conversation. Seuls les recruteurs peuvent contacter les candidats.'
      });
      return;
    }

    // Vérifier les permissions d'accès à la conversation
    if (req.user.role === 'recruiter') {
      // Le recruteur doit être propriétaire de l'offre liée à la candidature
      const allApps = await dataStore.getAllJobApplications();
      const application = allApps.find(app => app.id === conversation.applicationId);
      if (application) {
        const jobOffer = await dataStore.getJobOfferById(application.jobOfferId);
        if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
          res.status(403).json({
            success: false,
            error: 'Vous n\'avez pas accès à cette conversation'
          });
          return;
        }
      }
    } else {
      // Le candidat doit être propriétaire de la candidature
      const allApps = await dataStore.getAllJobApplications();
      const application = allApps.find(app => app.id === conversation.applicationId);
      if (!application || application.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Vous n\'avez pas accès à cette conversation'
        });
        return;
      }
    }

    const from: 'candidate' | 'recruiter' = req.user.role === 'recruiter' ? 'recruiter' : 'candidate';

    let contentText: string;
    let type: 'text' | 'test_invitation' | 'meeting_invitation' = 'text';
    let testTitle: string | undefined;
    let meetingInfo: { date: string; time: string; address: string; instructions?: string } | undefined;

    // Vérifier si c'est une invitation de rendez-vous (recruteur uniquement)
    if (meetingData && req.user.role === 'recruiter') {
      if (!meetingData.date || !meetingData.time || !meetingData.address) {
        res.status(400).json({
          success: false,
          error: 'date, time et address sont requis pour un rendez-vous'
        });
        return;
      }
      type = 'meeting_invitation';
      meetingInfo = {
        date: meetingData.date,
        time: meetingData.time,
        address: meetingData.address,
        instructions: meetingData.instructions
      };
      const dateObj = new Date(meetingData.date);
      const formattedDate = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      contentText = `Le recruteur vous propose un rendez-vous le ${formattedDate} à ${meetingData.time}.\nAdresse : ${meetingData.address}${meetingData.instructions ? `\n\nInstructions : ${meetingData.instructions}` : ''}`;
    } else if (testId && req.user.role === 'recruiter') {
      const test = await dataStore.getTestById(testId);
      if (!test) {
        res.status(404).json({ success: false, error: 'Test non trouvé' });
        return;
      }
      type = 'test_invitation';
      testTitle = test.title;
      contentText = `Le recruteur vous invite à passer le test : ${test.title}`;
    } else if (content && typeof content === 'string') {
      contentText = content;
    } else {
      res.status(400).json({
        success: false,
        error: 'Contenu du message, testId ou meetingData requis'
      });
      return;
    }

    const message: Message = {
      id: uuidv4(),
      from,
      content: contentText,
      conversationId,
      applicationId,
      type,
      testId: type === 'test_invitation' ? testId : undefined,
      testTitle: type === 'test_invitation' ? testTitle : undefined,
      meetingData: type === 'meeting_invitation' ? meetingInfo : undefined,
      createdAt: new Date()
    };

    messages.push(message);
    messagesStore.set(conversationId, messages);

    // Mettre à jour la conversation
    conversation.lastMessage = {
      content: contentText,
      time: new Date()
    };
    conversation.updatedAt = new Date();
    conversationsStore.set(conversationId, conversation);

    // Créer une notification pour le destinataire
    // conversationId est de la forme "conv-{applicationId}"
    const applicationIdFromConv = conversationId.replace('conv-', '');
    const allApps = await dataStore.getAllJobApplications();
    const application = allApps.find(app => app.id === applicationIdFromConv);
    
    if (application) {
      // Déterminer le destinataire : si le sender est recruteur, le destinataire est le candidat, et vice versa
      const recipientId = req.user.role === 'recruiter' 
        ? application.userId  // Le candidat reçoit la notification
        : (await (async () => {
            const jobOffer = await dataStore.getJobOfferById(application.jobOfferId);
            return jobOffer?.recruiterId || '';
          })());
      
      if (recipientId && recipientId !== req.user.id) {
        let notificationTitle = '';
        let notificationMessage = '';
        
        if (type === 'meeting_invitation' && meetingInfo) {
          notificationTitle = '📅 Nouveau rendez-vous proposé';
          const dateObj = new Date(meetingInfo.date);
          notificationMessage = `Rendez-vous le ${dateObj.toLocaleDateString('fr-FR')} à ${meetingInfo.time}`;
        } else if (type === 'test_invitation') {
          notificationTitle = '📝 Nouveau test à passer';
          notificationMessage = `Test : ${testTitle || 'Test technique'}`;
        } else {
          notificationTitle = '💬 Nouveau message';
          notificationMessage = contentText.length > 50 ? contentText.substring(0, 50) + '...' : contentText;
        }

        const notification: Notification = {
          id: uuidv4(),
          userId: recipientId,
          type: type === 'meeting_invitation' ? 'meeting_invitation' : type === 'test_invitation' ? 'test_invitation' : 'message',
          title: notificationTitle,
          message: notificationMessage,
          conversationId,
          applicationId: applicationIdFromConv,
          testId: type === 'test_invitation' ? testId : undefined,
          meetingData: type === 'meeting_invitation' ? meetingInfo : undefined,
          read: false,
          createdAt: new Date()
        };
        
        await dataStore.createNotification(notification);

        // Email "nouveau message" au destinataire (pour les vrais messages texte uniquement, pas meeting/test)
        const isTextMessage = (type !== 'meeting_invitation' && type !== 'test_invitation') && !!contentText;
        if (isTextMessage) {
          (async () => {
            try {
              const recipient = await dataStore.getUserById(recipientId);
              const senderName = `${req.user!.prenom} ${req.user!.nom}`.trim() || req.user!.email;
              const preview = contentText.length > 120 ? contentText.slice(0, 120) + '...' : contentText;
              if (recipient) {
                await sendMail(
                  recipient.email,
                  'Nouveau message sur RHM',
                  emailTemplates.newMessage(recipient.prenom, senderName, preview, conversationId)
                );
              }
            } catch (e) {
              console.error('Email nouveau message:', e);
            }
          })();
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        from: message.from,
        content: message.content,
        time: message.createdAt.toISOString(),
        type: message.type,
        testId: message.testId,
        testTitle: message.testTitle,
        meetingData: message.meetingData
      },
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message'
    });
  }
});

// Récupérer les notifications de l'utilisateur
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const notifications = await dataStore.getNotificationsByUserId(req.user.id);
    
    res.json({
      success: true,
      data: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        conversationId: n.conversationId,
        applicationId: n.applicationId,
        testId: n.testId,
        meetingData: n.meetingData,
        read: n.read,
        createdAt: n.createdAt.toISOString()
      })),
      message: 'Notifications récupérées avec succès'
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notifications'
    });
  }
});

// Récupérer le nombre de notifications non lues
router.get('/notifications/unread-count', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const count = await dataStore.getUnreadNotificationsCount(req.user.id);
    
    res.json({
      success: true,
      data: { count },
      message: 'Nombre de notifications non lues récupéré'
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du nombre de notifications'
    });
  }
});

// Marquer une notification comme lue
router.patch('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const success = await dataStore.markNotificationAsRead(id, req.user.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification marquée comme lue'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage de la notification'
    });
  }
});

// Marquer toutes les notifications comme lues
router.patch('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const count = await dataStore.markAllNotificationsAsRead(req.user.id);
    
    res.json({
      success: true,
      data: { count },
      message: `${count} notification(s) marquée(s) comme lue(s)`
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage des notifications'
    });
  }
});

// Supprimer une notification
router.delete('/notifications/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const success = await dataStore.deleteNotification(id, req.user.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification supprimée'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la notification'
    });
  }
});

export default router;
