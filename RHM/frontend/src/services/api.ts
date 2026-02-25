export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/** URL complète pour un fichier uploadé (ex: photo de profil) */
export function getUploadUrl(path: string | undefined): string {
  if (!path) return ''
  const base = (API_BASE_URL || '').replace(/\/api\/?$/, '')
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  nom: string
  prenom: string
  email: string
  password: string
  role?: 'candidate' | 'recruiter'
}

export type LoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
    fullName: string
    role: string
    tenantId: string | null
  }
}

export type Offer = {
  id: string
  title: string
  status: 'draft' | 'live' | 'paused' | 'filled'
  tokensPerMonth: number
  applicants: number
  location?: string
  contractType?: string
  companyName?: string
  companyLogo?: string
}

export type Application = {
  id: string
  jobOfferId?: string
  candidate: string
  role: string
  score: number
  stage: string
  snapshotId?: string
  cvMatchScore?: number
  testScore?: number | null
  overallScore?: number
  rank?: number
  cvNoteFromGpt?: string
  recruiterNote?: string
  appliedAt?: string
  testId?: string // ID du test technique associé à l'offre
  testResultId?: string // ID du résultat du test si déjà passé
}

export type ApplicationDetailQuestion = {
  questionId: string
  questionText: string
  type: string
  candidateAnswer: string | string[]
  isCorrect: boolean
  points: number
  maxPoints: number
  correctAnswer?: string | string[]
  explanation?: string
}

export type ApplicationDetail = Application & {
  cvNoteFromGpt?: string
  recruiterNote?: string
  hasMeetingProposed?: boolean
  testResultDetail?: {
    testId?: string
    testTitle: string
    score: number
    maxScore: number
    percentage: number
    completedAt?: string
    questions: ApplicationDetailQuestion[]
  }
  customTestResults?: Array<{
    testId: string
    testTitle: string
    score: number
    maxScore: number
    percentage: number
    completedAt?: string
    questions: ApplicationDetailQuestion[]
  }>
}

export type Message = {
  id: string
  from: 'candidate' | 'recruiter'
  content: string
  time: string
  type?: 'text' | 'test_invitation' | 'meeting_invitation'
  testId?: string
  testTitle?: string
  meetingData?: {
    date: string
    time: string
    address: string
    instructions?: string
  }
}

export type RecruiterPublicInfo = {
  id: string
  nom: string
  prenom: string
  avatarUrl?: string
  companyName?: string
}

export type Conversation = {
  id: string
  applicationId: string
  candidate: string
  role: string
  isLocked: boolean
  lastMessage: {
    content: string
    time: Date
  } | null
  updatedAt: Date
  recruiter?: RecruiterPublicInfo
}

export type WalletEntry = {
  id: string
  type: 'credit' | 'debit'
  label: string
  amount: number
  provider: string
  createdAt: string
}

export type QcmQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export type DashboardOverview = {
  tokensBalance: number
  activeOffers: number
  applicationsInReview: number
}

export type RecruiterProfileData = {
  companyName?: string
  companySize?: string
  industry?: string
  description?: string
  website?: string
  logo?: string
}

export type Profile = {
  id: string
  email: string
  fullName: string
  name: string
  role: string
  tenantId: string | null
  createdAt: Date
  avatarUrl?: string
  recruiterProfile?: RecruiterProfileData
  profile?: { linkedInUrl?: string; [key: string]: any }
}

export type CvSnapshot = {
  id: string
  filename: string
  domain: string
  createdAt: Date
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token invalide ou expiré - nettoyer et rediriger
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
          throw new Error('Non autorisé')
        }
        if (response.status === 429) {
          // Rate limit - ne pas rediriger, juste afficher une erreur
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Trop de requêtes. Veuillez patienter quelques instants.')
        }
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Erreur API: ${errorText}`)
      }

      return response.json()
    } catch (error: any) {
      // Gérer les NetworkError et autres erreurs de réseau
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('NetworkError:', error)
        throw new Error('Erreur de connexion au serveur. Vérifiez votre connexion internet.')
      }
      throw error
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Faire la requête sans utiliser this.request pour éviter la vérification du token
    const token = this.getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Erreur de connexion: ${errorText}`)
    }

    const data = await response.json()
    
    // Adapter la réponse du nouveau backend
    const adaptedResponse: LoginResponse = {
      accessToken: data.data.token,
      user: {
        id: data.data.user.id,
        email: data.data.user.email,
        fullName: `${data.data.user.prenom} ${data.data.user.nom}`,
        role: data.data.user.role,
        tenantId: null,
      }
    }
    
    // Stocker le token IMMÉDIATEMENT après le login
    if (adaptedResponse.accessToken) {
      localStorage.setItem('auth_token', adaptedResponse.accessToken)
      // Attendre un peu pour s'assurer que le token est bien stocké
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    return adaptedResponse
  }

  async register(data: RegisterRequest): Promise<{success: boolean, message: string}> {
    const response = await this.request<{success: boolean, data: {user: any, token: string}, message: string}>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    // Si l'inscription réussit, on peut automatiquement connecter l'utilisateur
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
    }
    
    return {
      success: response.success,
      message: response.message || 'Compte créé avec succès'
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    return { success: true, message: response.message ?? 'Si cet email est associé à un compte, vous recevrez un lien par email.' }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message?: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
    return { success: true, message: response.message ?? 'Mot de passe mis à jour.' }
  }

  // Offers - Adapter pour le nouveau backend
  async getOffers(filters?: {
    location?: string
    contractType?: string
    experience?: string
    skills?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<Offer[]> {
    const params = new URLSearchParams()
    if (filters?.location) params.append('location', filters.location)
    if (filters?.contractType) params.append('contractType', filters.contractType)
    if (filters?.experience) params.append('experience', filters.experience)
    if (filters?.skills) params.append('skills', filters.skills)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const url = `/job-offers${params.toString() ? '?' + params.toString() : ''}`
    const response = await this.request<{success: boolean, data: {offers: any[]}}>(url)
    // Le backend ne renvoie que les offres publiées ; sans champ status, on considère tout en "live"
    return response.data.offers.map((offer: any) => ({
      id: offer.id,
      title: offer.title,
      status: offer.status === 'published' ? 'live' : offer.status === 'paused' ? 'paused' : offer.status === 'closed' ? 'paused' : offer.status === 'filled' ? 'filled' : 'draft',
      tokensPerMonth: 0,
      applicants: offer.applicationsCount || 0,
      location: offer.location,
      contractType: offer.contractType,
      companyName: offer.companyName,
      companyLogo: offer.companyLogo,
    }))
  }

  async getRecruiterOffers(): Promise<Offer[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/recruiters/job-offers')
    return response.data.map((offer: any) => ({
      id: offer.id,
      title: offer.title,
      status: offer.status === 'published' ? 'live' : offer.status === 'paused' ? 'paused' : offer.status === 'closed' ? 'paused' : offer.status === 'filled' ? 'filled' : 'draft',
      tokensPerMonth: 0,
      applicants: offer.applicationsCount ?? 0,
      location: offer.location,
      contractType: offer.contractType,
    }))
  }

  async getOfferApplications(offerId: string): Promise<Application[]> {
    const response = await this.request<{success: boolean, data: any[]}>(`/recruiters/job-offers/${offerId}/applications`)
    return response.data.map((app: any) => ({
      id: app.id,
      candidate: app.candidate ? `${app.candidate.prenom} ${app.candidate.nom}` : 'Candidat',
      role: app.jobTitle || app.jobOfferId || 'Poste',
      score: app.overallScore ?? app.cvMatchScore ?? 0,
      stage: app.status,
      snapshotId: app.resumeUrl,
      cvMatchScore: app.cvMatchScore ?? 0,
      testScore: app.testScore ?? null,
      overallScore: app.overallScore ?? 0,
      rank: app.rank ?? 0,
      cvNoteFromGpt: app.cvNoteFromGpt,
      recruiterNote: app.recruiterNote,
    }))
  }

  async applyToOffer(offerId: string, data: {
    coverLetter?: string
    resumeUrl?: string
  }): Promise<any> {
    const response = await this.request<{success: boolean, data: any}>(`/job-offers/${offerId}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getMyApplications(): Promise<Application[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/job-offers/my/applications')
    return response.data.map((app: any) => ({
      id: app.id,
      jobOfferId: app.jobOfferId,
      candidate: app.candidate,
      role: app.jobOffer?.title ?? app.role ?? 'Offre',
      score: app.overallScore ?? 0,
      stage: app.status,
      snapshotId: app.resumeUrl,
      appliedAt: app.appliedAt ? new Date(app.appliedAt).toISOString() : undefined,
      testId: app.jobOffer?.testId, // Inclure le testId pour permettre au candidat de passer le test
      testResultId: app.testResultId, // Inclure le testResultId pour savoir si le test a déjà été passé
    }))
  }

  async getOffer(id: string): Promise<Offer> {
    const response = await this.request<{success: boolean, data: any}>(`/job-offers/${id}`)
    const offer = response.data
    return {
      id: offer.id,
      title: offer.title,
      status: offer.status === 'published' ? 'live' : offer.status === 'paused' ? 'paused' : offer.status === 'closed' ? 'paused' : offer.status === 'filled' ? 'filled' : 'draft',
      tokensPerMonth: 0,
      applicants: offer.applicationsCount || 0,
    }
  }

  async publishOffer(offerId: string): Promise<void> {
    await this.request(`/recruiters/job-offers/${offerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'published' }),
    })
  }

  async createOffer(data: {
    title: string
    description?: string
    status?: 'draft' | 'live' | 'paused'
    tokensPerMonth?: number
  }): Promise<Offer> {
    const response = await this.request<{success: boolean, data: any}>('/recruiters/job-offers', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        description: data.description || '',
        requirements: [],
        location: 'Paris',
        contractType: 'CDI',
        experience: 'Confirmé',
        skills: [],
      }),
    })
    const offer = response.data
    return {
      id: offer.id,
      title: offer.title,
      status: offer.status === 'published' ? 'live' : offer.status === 'closed' ? 'paused' : offer.status === 'filled' ? 'filled' : 'draft',
      tokensPerMonth: data.tokensPerMonth || 0,
      applicants: 0,
    }
  }

  async createJobOffer(data: {
    title: string
    description: string
    requirements: string[]
    location: string
    salary?: string
    contractType: 'CDI' | 'CDD' | 'Stage' | 'Freelance'
    experience: 'Junior' | 'Confirmé' | 'Senior' | 'Expert'
    skills: string[]
    benefits?: string[]
    /** Ce que vous souhaitez tester en priorité chez le candidat (influence la génération du test) */
    testInstructions?: string
  }): Promise<any> {
    const response = await this.request<{success: boolean, data: any}>('/recruiters/job-offers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getApplicationDetail(offerId: string, applicationId: string): Promise<ApplicationDetail> {
    const response = await this.request<{ success: boolean; data: ApplicationDetail }>(
      `/recruiters/job-offers/${offerId}/applications/${applicationId}`
    )
    return response.data
  }

  async updateApplicationRecruiterNote(offerId: string, applicationId: string, recruiterNote: string): Promise<void> {
    await this.request(`/recruiters/job-offers/${offerId}/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ recruiterNote }),
    })
  }

  /** Télécharge le CV d'un candidat (recruteur). Retourne le blob pour affichage ou téléchargement. */
  async getApplicationCv(offerId: string, applicationId: string): Promise<Blob> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(`${API_BASE_URL}/recruiters/job-offers/${offerId}/applications/${applicationId}/cv`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) throw new Error('Aucun CV disponible pour cette candidature')
      throw new Error('Erreur lors du chargement du CV')
    }
    return response.blob()
  }

  async updateOffer(
    id: string,
    data: {
      title?: string
      description?: string
      requirements?: string[]
      location?: string
      salary?: string
      contractType?: 'CDI' | 'CDD' | 'Stage' | 'Freelance'
      experience?: 'Junior' | 'Confirmé' | 'Senior' | 'Expert'
      skills?: string[]
      benefits?: string[]
      status?: 'draft' | 'live' | 'paused' | 'filled'
      tokensPerMonth?: number
    }
  ): Promise<Offer> {
    // Si seulement le statut change, utiliser l'endpoint de statut
    if (data.status && Object.keys(data).length === 1) {
      const statusMap: Record<string, string> = {
        'live': 'published',
        'paused': 'paused',
        'draft': 'draft',
        'filled': 'filled'
      }
      await this.request(`/recruiters/job-offers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusMap[data.status] || data.status }),
      })
    } else {
      // Sinon, utiliser l'endpoint PUT pour mettre à jour l'offre complète
      const updateData: any = { ...data }
      if (updateData.status) {
        const statusMap: Record<string, string> = {
          'live': 'published',
          'paused': 'paused',
          'draft': 'draft',
          'filled': 'filled'
        }
        updateData.status = statusMap[updateData.status] || updateData.status
      }
      delete updateData.tokensPerMonth // Ce champ n'existe pas dans le backend
      await this.request(`/recruiters/job-offers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
    }
    return this.getOffer(id)
  }

  async deleteOffer(id: string): Promise<void> {
    // Le nouveau backend n'a pas encore d'endpoint DELETE
    // Pour l'instant, on ferme l'offre
    await this.request(`/recruiters/job-offers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    })
  }

  // Applications - Adapter pour le nouveau backend
  async getApplications(): Promise<Application[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/applications')
    return response.data.map((app: any) => ({
      id: app.id,
      jobOfferId: app.jobOfferId,
      candidate: app.candidate,
      role: app.role,
      score: app.overallScore ?? app.score ?? 0,
      stage: app.stage,
      snapshotId: app.snapshotId,
      cvMatchScore: app.cvMatchScore,
      testScore: app.testScore,
      overallScore: app.overallScore,
      rank: app.rank,
      cvNoteFromGpt: app.cvNoteFromGpt,
      recruiterNote: app.recruiterNote,
    }))
  }

  // Dashboard - Adapter pour le nouveau backend
  async getDashboard(): Promise<DashboardOverview> {
    try {
      // Essayer d'abord le dashboard recruteur
      const response = await this.request<{success: boolean, data: {stats: any}}>('/recruiters/dashboard')
      const stats = response.data.stats
      return {
        tokensBalance: 0, // À ajouter dans le backend
        activeOffers: stats.activeJobOffers || 0,
        applicationsInReview: stats.newApplications || 0,
      }
    } catch (error: any) {
      // Si l'utilisateur n'est pas recruteur (403), retourner des valeurs par défaut
      if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
        return {
          tokensBalance: 0,
          activeOffers: 0,
          applicationsInReview: 0,
        }
      }
      // Fallback pour autres erreurs
      return {
        tokensBalance: 0,
        activeOffers: 0,
        applicationsInReview: 0,
      }
    }
  }

  // Wallet - À implémenter dans le backend
  async getWalletLedger(): Promise<WalletEntry[]> {
    // Endpoint à créer dans le backend
    try {
      return this.request<WalletEntry[]>('/wallet/ledger')
    } catch {
      return []
    }
  }

  async getWalletBalance(): Promise<number> {
    // Endpoint à créer dans le backend
    try {
      return this.request<number>('/wallet/balance')
    } catch {
      return 0
    }
  }

  async purchaseTokens(data: {
    amount: number
    provider: string
  }): Promise<WalletEntry> {
    // Endpoint à créer dans le backend
    return this.request<WalletEntry>('/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Messaging - Adapter pour le nouveau backend
  async createConversation(applicationId: string): Promise<Conversation> {
    const response = await this.request<{success: boolean, data: any}>('/messaging/conversations', {
      method: 'POST',
      body: JSON.stringify({ applicationId }),
    })
    return {
      id: response.data.id,
      applicationId: response.data.applicationId,
      candidate: response.data.candidate,
      role: response.data.role,
      isLocked: response.data.isLocked,
      lastMessage: response.data.lastMessage ? {
        content: response.data.lastMessage.content,
        time: new Date(response.data.lastMessage.time),
      } : null,
      updatedAt: new Date(response.data.updatedAt),
      recruiter: response.data.recruiter,
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await this.request<{success: boolean, data: any[]}>('/messaging/conversations')
      return response.data.map((conv: any) => ({
        id: conv.id,
        applicationId: conv.applicationId,
        candidate: conv.candidate,
        role: conv.role,
        isLocked: conv.isLocked,
        lastMessage: conv.lastMessage ? {
          content: conv.lastMessage.content,
          time: new Date(conv.lastMessage.time),
        } : null,
        updatedAt: new Date(conv.updatedAt),
        recruiter: conv.recruiter,
      }))
    } catch {
      return []
    }
  }

  async getMessages(conversationId?: string): Promise<Message[]> {
    try {
      if (!conversationId) {
        return []
      }
      const url = `/messaging/messages?conversationId=${conversationId}`
      const response = await this.request<{success: boolean, data: any[]}>(url)
      return response.data.map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        content: msg.content,
        time: msg.time,
        type: msg.type || 'text',
        testId: msg.testId,
        testTitle: msg.testTitle,
        meetingData: msg.meetingData,
      }))
    } catch {
      return []
    }
  }

  async sendMessage(data: {
    content?: string
    from: 'candidate' | 'recruiter'
    conversationId: string
    testId?: string
    meetingData?: {
      date: string
      time: string
      address: string
      instructions?: string
    }
  }): Promise<Message> {
    const response = await this.request<{success: boolean, data: any}>('/messaging/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: data.content,
        conversationId: data.conversationId,
        testId: data.testId,
        meetingData: data.meetingData,
      }),
    })
    return {
      id: response.data.id,
      from: response.data.from,
      content: response.data.content,
      time: response.data.time,
      type: response.data.type,
      testId: response.data.testId,
      testTitle: response.data.testTitle,
      meetingData: response.data.meetingData,
    }
  }

  async generateCustomTest(jobOfferId: string, applicationId: string, customPrompt: string): Promise<{ testId: string; testTitle: string; questionsCount: number }> {
    const response = await this.request<{success: boolean, data: any}>('/tests/generate-custom', {
      method: 'POST',
      body: JSON.stringify({
        jobOfferId,
        applicationId,
        customPrompt,
      }),
    })
    return response.data
  }

  async getApplicationHistory(offerId: string, applicationId: string): Promise<any[]> {
    const response = await this.request<{success: boolean, data: any[]}>(`/recruiters/job-offers/${offerId}/applications/${applicationId}/history`)
    return response.data
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/messaging/notifications')
    return response.data
  }

  async getUnreadNotificationsCount(): Promise<number> {
    const response = await this.request<{success: boolean, data: {count: number}}>('/messaging/notifications/unread-count')
    return response.data.count
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.request(`/messaging/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.request('/messaging/notifications/read-all', {
      method: 'PATCH',
    })
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.request(`/messaging/notifications/${notificationId}`, {
      method: 'DELETE',
    })
  }

  // Tests - Adapter pour le nouveau backend
  async getTests(): Promise<any[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/tests')
    return response.data
  }

  async getTest(id: string): Promise<any> {
    const response = await this.request<{success: boolean, data: any}>(`/tests/${id}`)
    return response.data
  }

  async startTest(testId: string): Promise<{testResultId: string, test: any}> {
    const response = await this.request<{success: boolean, data: {testResultId: string, test: any}}>(`/tests/${testId}/start`, {
      method: 'POST',
    })
    return response.data
  }

  async submitTest(testId: string, data: {
    testResultId: string
    answers: Array<{questionId: string, answer: string | string[]}>
    applicationId?: string
  }): Promise<{result: any, passed: boolean}> {
    const response = await this.request<{success: boolean, data: {result: any, passed: boolean}}>(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  // Profile - Adapter pour le nouveau backend
  async getProfile(): Promise<Profile> {
    const response = await this.request<{success: boolean, data: any}>('/users/profile')
    const user = response.data
    return {
      id: user.id,
      email: user.email,
      fullName: `${user.prenom} ${user.nom}`,
      name: `${user.prenom} ${user.nom}`,
      role: user.role,
      tenantId: null,
      createdAt: new Date(user.createdAt),
      avatarUrl: user.avatarUrl,
      recruiterProfile: user.recruiterProfile,
      profile: user.profile,
    }
  }

  // Méthode helper pour récupérer le profil complet avec analyse et CV
  async getFullProfile(): Promise<{profile: Profile, cvAnalysis?: any, cv?: string}> {
    const response = await this.request<{success: boolean, data: any}>('/users/profile')
    const user = response.data
    const profile: Profile = {
      id: user.id,
      email: user.email,
      fullName: `${user.prenom} ${user.nom}`,
      name: `${user.prenom} ${user.nom}`,
      role: user.role,
      tenantId: null,
      createdAt: new Date(user.createdAt),
      avatarUrl: user.avatarUrl,
      recruiterProfile: user.recruiterProfile,
      profile: user.profile,
    }
    return {
      profile,
      cvAnalysis: user.profile?.cvAnalysis || null,
      cv: user.profile?.cv || undefined,
    }
  }

  async updateProfile(data: {
    nom?: string
    prenom?: string
    profile?: {
      skills?: string[]
      experience?: string
      education?: string
      jobPreferences?: string[]
      linkedInUrl?: string
    }
    recruiterProfile?: RecruiterProfileData
  }): Promise<Profile> {
    const response = await this.request<{success: boolean, data: any}>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const user = response.data
    return {
      id: user.id,
      email: user.email,
      fullName: `${user.prenom} ${user.nom}`,
      name: `${user.prenom} ${user.nom}`,
      role: user.role,
      tenantId: null,
      createdAt: new Date(user.createdAt),
      avatarUrl: user.avatarUrl,
      recruiterProfile: user.recruiterProfile,
      profile: user.profile,
    }
  }

  /** Upload photo de profil (recruteur ou candidat). Retourne la nouvelle avatarUrl. */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    const token = this.getAuthToken()
    const res = await fetch(`${API_BASE_URL}/uploads/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erreur lors de l\'upload de la photo')
    }
    const data = await res.json()
    return { avatarUrl: data.data?.avatarUrl || data.data?.user?.avatarUrl }
  }

  async getTestResults(): Promise<any[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/users/test-results')
    return response.data
  }

  async getSnapshots(): Promise<(CvSnapshot & { analysis?: any })[]> {
    // Le nouveau backend stocke le CV dans le profil utilisateur
    try {
      const response = await this.request<{success: boolean, data: any}>('/users/profile')
      const user = response.data
      if (user.profile?.cv) {
        return [{
          id: 'cv-1',
          filename: user.profile.cv.split('/').pop() || 'cv.pdf',
          domain: 'Général',
          createdAt: new Date(),
          analysis: user.profile.cvAnalysis || null,
        }]
      }
      return []
    } catch {
      return []
    }
  }

  async uploadSnapshot(file: File): Promise<CvSnapshot & { analysis?: any }> {
    const formData = new FormData()
    formData.append('cv', file)

    const token = this.getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/uploads/cv`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        throw new Error('Non autorisé')
      }
      if (response.status === 429) {
        throw new Error('Trop de requêtes. Veuillez patienter quelques instants.')
      }
      throw new Error(`Erreur API: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      id: 'cv-1',
      filename: result.data.filename,
      domain: 'Général',
      createdAt: new Date(),
      analysis: result.data.analysis || null,
    }
  }

  async analyzeCv(): Promise<any> {
    const response = await this.request<{success: boolean, data: {analysis: any, profile: any}}>('/uploads/cv/analyze', {
      method: 'POST',
    })
    return response.data
  }

  async uploadApplicationDocuments(files: File[]): Promise<any> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('documents', file)
    })

    const token = this.getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/uploads/application`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        throw new Error('Non autorisé')
      }
      if (response.status === 429) {
        throw new Error('Trop de requêtes. Veuillez patienter quelques instants.')
      }
      throw new Error(`Erreur API: ${response.statusText}`)
    }

    return response.json()
  }

  // Opportunities
  async getOpportunities(): Promise<any[]> {
    const response = await this.request<{success: boolean, data: any[]}>('/opportunities')
    return response.data
  }

  async updateOpportunityStatus(opportunityId: string, status: string): Promise<any> {
    const response = await this.request<{success: boolean, data: any}>(`/opportunities/${opportunityId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return response.data
  }

  logout(): void {
    // Supprimer tous les tokens et données d'authentification
    localStorage.removeItem('auth_token')
    
    // Nettoyer toutes les autres données potentiellement stockées
    // (au cas où d'autres clés seraient utilisées)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Rediriger vers la page de login
    window.location.href = '/login'
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}

export const api = new ApiService()
