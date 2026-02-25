import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, getUploadUrl } from '../services/api'
import type { Application, ApplicationDetail } from '../services/api'
import { CandidateProfileModal } from '../components/CandidateProfileModal'
import { toast } from 'sonner'

// Fonction pour exporter les candidatures en CSV
function exportApplicationsToCSV(applications: Application[]): string {
  const headers = ['Rang', 'Candidat', 'Poste', 'Score CV', 'Score Test', 'Score Global', 'Étape', 'Date de candidature']
  const rows = applications.map(app => [
    app.rank?.toString() || '',
    app.candidate,
    app.role,
    (app.cvMatchScore ?? 0).toString(),
    (app.testScore ?? 'Non passé').toString(),
    (app.overallScore ?? app.score ?? 0).toString(),
    app.stage,
    app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR') : ''
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return '\uFEFF' + csvContent // BOM UTF-8 pour Excel
}

export function OfferApplicationsPage() {
  const { offerId } = useParams<{ offerId: string }>()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [offerTitle, setOfferTitle] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)
  const [recruiterNoteDraft, setRecruiterNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [loadingCv, setLoadingCv] = useState(false)
  const [showCandidateProfile, setShowCandidateProfile] = useState(false)
  const [conversations, setConversations] = useState<Set<string>>(new Set())
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [showCustomTestModal, setShowCustomTestModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [customTestPrompt, setCustomTestPrompt] = useState('')
  const [generatingTest, setGeneratingTest] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingAddress, setMeetingAddress] = useState('')
  const [meetingInstructions, setMeetingInstructions] = useState('')
  const [sendingMeeting, setSendingMeeting] = useState(false)
  const [markingFilled, setMarkingFilled] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterScoreMin, setFilterScoreMin] = useState<number>(0)
  const [filterScoreMax, setFilterScoreMax] = useState<number>(100)
  const [applicationHistory, setApplicationHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [hasMeetingProposed, setHasMeetingProposed] = useState(false)
  const [customTestResults, setCustomTestResults] = useState<any[]>([])

  useEffect(() => {
    if (!offerId) return
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [offer, data, conversationsData] = await Promise.all([
          api.getOffer(offerId).catch(() => null),
          api.getOfferApplications(offerId),
          api.getConversations().catch(() => []),
        ])
        setOfferTitle(offer?.title ?? 'Offre')
        setApplications(data)
        if (data.length > 0) setSelectedApp(data[0])
        // Créer un Set des IDs de candidatures qui ont déjà une conversation
        const conversationAppIds = new Set(conversationsData.map((conv: any) => conv.applicationId))
        setConversations(conversationAppIds)
      } catch (error: any) {
        toast.error('Erreur lors du chargement des candidatures')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [offerId])

  useEffect(() => {
    if (!offerId || !selectedApp?.id) {
      setDetail(null)
      setRecruiterNoteDraft('')
      setApplicationHistory([])
      setHasMeetingProposed(false)
      setCustomTestResults([])
      return
    }
    const fetchDetail = async () => {
      try {
        const [d, history] = await Promise.all([
          api.getApplicationDetail(offerId, selectedApp.id),
          api.getApplicationHistory(offerId, selectedApp.id).catch(() => [])
        ])
        setDetail(d)
        setRecruiterNoteDraft(d.recruiterNote ?? '')
        setApplicationHistory(history)
        setHasMeetingProposed(d.hasMeetingProposed ?? false)
        setCustomTestResults(d.customTestResults ?? [])
      } catch {
        setDetail(null)
        setRecruiterNoteDraft('')
        setApplicationHistory([])
        setHasMeetingProposed(false)
        setCustomTestResults([])
      }
    }
    fetchDetail()
  }, [offerId, selectedApp?.id])

  const saveRecruiterNote = async () => {
    if (!offerId || !selectedApp?.id) return
    setSavingNote(true)
    try {
      await api.updateApplicationRecruiterNote(offerId, selectedApp.id, recruiterNoteDraft)
      setDetail((prev) => (prev ? { ...prev, recruiterNote: recruiterNoteDraft } : null))
      toast.success('Note enregistrée')
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingNote(false)
    }
  }

  const openCv = async () => {
    if (!offerId || !selectedApp?.id) return
    setLoadingCv(true)
    try {
      const blob = await api.getApplicationCv(offerId, selectedApp.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      toast.error(e.message || 'Impossible d\'ouvrir le CV')
    } finally {
      setLoadingCv(false)
    }
  }

  const handleContactCandidate = async () => {
    if (!selectedApp?.id) return
    
    // Si la conversation existe déjà, rediriger vers la messagerie
    if (conversations.has(selectedApp.id)) {
      navigate(`/messaging?conversationId=conv-${selectedApp.id}`)
      return
    }

    // Sinon, créer la conversation puis rediriger
    setCreatingConversation(true)
    try {
      await api.createConversation(selectedApp.id)
      setConversations(prev => new Set([...prev, selectedApp.id!]))
      toast.success('Conversation créée')
      navigate(`/messaging?conversationId=conv-${selectedApp.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création de la conversation')
      console.error(error)
    } finally {
      setCreatingConversation(false)
    }
  }

  const handleGenerateCustomTest = async () => {
    if (!offerId || !selectedApp?.id || !customTestPrompt.trim()) {
      toast.error('Veuillez remplir le prompt pour générer le test')
      return
    }

    setGeneratingTest(true)
    try {
      const result = await api.generateCustomTest(offerId, selectedApp.id, customTestPrompt)
      
      // Créer ou récupérer la conversation
      if (!conversations.has(selectedApp.id)) {
        await api.createConversation(selectedApp.id)
        setConversations(prev => new Set([...prev, selectedApp.id!]))
      }

      // Envoyer le test via la messagerie
      await api.sendMessage({
        from: 'recruiter',
        conversationId: `conv-${selectedApp.id}`,
        testId: result.testId,
      })

      toast.success(`Test généré et envoyé au candidat (${result.questionsCount} questions)`)
      setShowCustomTestModal(false)
      setCustomTestPrompt('')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la génération du test')
      console.error(error)
    } finally {
      setGeneratingTest(false)
    }
  }

  const handleSendMeetingInvitation = async () => {
    if (!offerId || !selectedApp?.id || !meetingDate || !meetingTime || !meetingAddress.trim()) {
      toast.error('Veuillez remplir la date, l\'heure et l\'adresse')
      return
    }

    setSendingMeeting(true)
    try {
      // Créer ou récupérer la conversation
      if (!conversations.has(selectedApp.id)) {
        await api.createConversation(selectedApp.id)
        setConversations(prev => new Set([...prev, selectedApp.id!]))
      }

      // Envoyer l'invitation de rendez-vous via la messagerie
      await api.sendMessage({
        from: 'recruiter',
        conversationId: `conv-${selectedApp.id}`,
        meetingData: {
          date: meetingDate,
          time: meetingTime,
          address: meetingAddress,
          instructions: meetingInstructions || undefined,
        },
      })

      toast.success('Invitation de rendez-vous envoyée')
      setShowMeetingModal(false)
      setMeetingDate('')
      setMeetingTime('')
      setMeetingAddress('')
      setMeetingInstructions('')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation')
      console.error(error)
    } finally {
      setSendingMeeting(false)
    }
  }

  const handleMarkOfferAsFilled = async () => {
    if (!offerId) return

    if (!confirm('Êtes-vous sûr de vouloir marquer cette offre comme pourvue ? Cette action peut être annulée plus tard.')) {
      return
    }

    setMarkingFilled(true)
    try {
      await api.updateOffer(offerId, { status: 'filled' })
      toast.success('Offre marquée comme pourvue')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'offre')
      console.error(error)
    } finally {
      setMarkingFilled(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement du classement...</div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
      <section className="space-y-3">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/offers')}
              className="mb-1 text-[11px] text-linkedin hover:underline"
            >
              ← Retour aux offres
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Classement des candidatures
          </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              {offerTitle}
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Scores calculés avec l’IA : matching CV (GPT) et test technique (GPT).
            </p>
          </div>
          <button
            type="button"
            onClick={handleMarkOfferAsFilled}
            disabled={markingFilled}
            className="rounded-full border border-success/60 bg-success/10 px-4 py-2 text-[11px] font-medium text-success hover:bg-success/20 disabled:opacity-50"
          >
            {markingFilled ? 'Mise à jour...' : 'Marquer comme pourvue'}
          </button>
          <button
            type="button"
            onClick={() => {
              const csv = exportApplicationsToCSV(applications)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `candidatures-${offerTitle.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`
              link.click()
              toast.success('Export CSV téléchargé')
            }}
            className="rounded-full border border-linkedin/60 bg-linkedin/10 px-4 py-2 text-[11px] font-medium text-linkedin hover:bg-linkedin/20"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              // Export PDF simple (HTML vers PDF)
              const printWindow = window.open('', '_blank')
              if (!printWindow) return
              
              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Candidatures - ${offerTitle}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; }
                      h1 { color: #0077b5; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f2f2f2; }
                    </style>
                  </head>
                  <body>
                    <h1>Candidatures - ${offerTitle}</h1>
                    <p>Date d'export : ${new Date().toLocaleDateString('fr-FR')}</p>
                    <table>
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Candidat</th>
                          <th>Score CV</th>
                          <th>Score Test</th>
                          <th>Score Global</th>
                          <th>Étape</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${applications.map(app => `
                          <tr>
                            <td>${app.rank || ''}</td>
                            <td>${app.candidate}</td>
                            <td>${app.cvMatchScore ?? 0}%</td>
                            <td>${app.testScore ?? 'Non passé'}</td>
                            <td>${app.overallScore ?? app.score ?? 0}%</td>
                            <td>${app.stage}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </body>
                </html>
              `
              printWindow.document.write(html)
              printWindow.document.close()
              setTimeout(() => {
                printWindow.print()
              }, 250)
              toast.success('Export PDF ouvert')
            }}
            className="rounded-full border border-accent/60 bg-accent/10 px-4 py-2 text-[11px] font-medium text-accent hover:bg-accent/20"
          >
            Export PDF
          </button>
        </header>

        {/* Filtres */}
        <div className="rounded-xl border border-border bg-bg-elevated p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
            <span>Filtres :</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text focus:border-linkedin focus:outline-none"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="reviewed">Examiné</option>
                <option value="shortlisted">Sélectionné</option>
                <option value="rejected">Rejeté</option>
                <option value="hired">Embauché</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Score min</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text focus:border-linkedin focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Score max</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text focus:border-linkedin focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated text-xs shadow-sm">
          <div className="grid grid-cols-[0.5fr_1.2fr_1fr_0.9fr_0.9fr_0.9fr_0.7fr] border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            <span>Rang</span>
            <span>Candidat</span>
            <span>Poste</span>
            <span>Score CV (GPT)</span>
            <span>Score Test (GPT)</span>
            <span>Score Global</span>
            <span>Étape</span>
          </div>

          <div className="divide-y divide-border/80">
            {applications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-text-muted">
                Aucune candidature pour cette offre
              </div>
            ) : (
              applications
                .filter((app) => {
                  // Filtre par statut
                  if (filterStatus !== 'all') {
                    const statusMap: Record<string, string> = {
                      'pending': 'Screening',
                      'reviewed': 'Examiné',
                      'shortlisted': 'Entretien',
                      'rejected': 'Rejeté',
                      'hired': 'Offre'
                    }
                    if (app.stage !== statusMap[filterStatus]) {
                      return false
                    }
                  }
                  // Filtre par score
                  const overallScore = app.overallScore ?? app.score ?? 0
                  if (overallScore < filterScoreMin || overallScore > filterScoreMax) {
                    return false
                  }
                  return true
                })
                .map((app) => {
                const rank = app.rank ?? 0
                const cvScore = app.cvMatchScore ?? 0
                const testScore = app.testScore ?? null
                const overallScore = app.overallScore ?? app.score ?? 0
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className={`grid w-full grid-cols-[0.5fr_1.2fr_1fr_0.9fr_0.9fr_0.9fr_0.7fr] items-center gap-2 px-3 py-2 text-left text-[11px] text-text-muted hover:bg-slate-50 ${
                      selectedApp?.id === app.id ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      {rank === 1 && <span className="text-lg">🥇</span>}
                      {rank === 2 && <span className="text-lg">🥈</span>}
                      {rank === 3 && <span className="text-lg">🥉</span>}
                      {rank > 3 && (
                        <span className="text-xs font-semibold text-text-muted">#{rank}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linkedin text-[11px] font-semibold text-white">
                        {app.candidate.charAt(0)}
                      </span>
                      <span className="text-xs text-text">{app.candidate}</span>
                    </span>
                    <span className="text-xs text-text">{app.role}</span>
                    <span
                      className={`text-xs font-semibold ${
                        cvScore >= 70 ? 'text-success' : cvScore >= 50 ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {cvScore}%
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        testScore !== null
                          ? testScore >= 70
                            ? 'text-success'
                            : testScore >= 50
                              ? 'text-accent'
                              : 'text-text-muted'
                          : 'text-text-muted'
                      }`}
                    >
                      {testScore !== null ? `${testScore}%` : '-'}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        overallScore >= 70 ? 'text-success' : overallScore >= 50 ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {overallScore}%
                    </span>
                    <span className="text-xs text-text">{app.stage}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm"
      >
        <h2 className="text-sm font-semibold text-text">Détails de la candidature</h2>
        {selectedApp ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-3 space-y-2">
              <button
                type="button"
                onClick={() => detail && typeof (detail as any).candidate === 'object' && setShowCandidateProfile(true)}
                className="flex w-full items-center gap-2 text-left hover:opacity-90"
              >
                {detail && typeof (detail as any).candidate === 'object' && (detail as any).candidate?.avatarUrl ? (
                  <img
                    src={getUploadUrl((detail as any).candidate.avatarUrl)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linkedin text-sm font-semibold text-white">
                    {selectedApp.candidate.charAt(0)}
                  </span>
                )}
                <div>
                  <p className="text-xs font-semibold text-text">{selectedApp.candidate}</p>
                  {detail && typeof (detail as any).candidate === 'object' && (detail as any).candidate?.profile?.linkedInUrl && (
                    <span className="text-[11px] text-linkedin">Profil LinkedIn</span>
                  )}
                  <span className="ml-1 text-[10px] text-text-muted">Cliquer pour voir le profil</span>
                </div>
              </button>
              <p className="text-[11px] text-text-muted">
                Score CV : <strong>{selectedApp.cvMatchScore ?? 0}%</strong> — Score Test :{' '}
                <strong>{selectedApp.testScore != null ? `${selectedApp.testScore}%` : 'Non passé'}</strong> — Global :{' '}
                <strong>{selectedApp.overallScore ?? selectedApp.score ?? 0}%</strong> — Étape : {selectedApp.stage}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openCv}
                    disabled={loadingCv || !selectedApp.snapshotId}
                    className="flex-1 rounded-full border border-linkedin/60 bg-linkedin/10 px-3 py-1 text-[11px] font-medium text-linkedin hover:bg-linkedin/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingCv ? 'Chargement...' : selectedApp.snapshotId ? 'Ouvrir le CV' : 'Aucun CV déposé'}
                  </button>
                  <button
                    type="button"
                    onClick={handleContactCandidate}
                    disabled={creatingConversation}
                    className="flex-1 rounded-full bg-linkedin px-3 py-1 text-[11px] font-medium text-white hover:bg-linkedin/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingConversation 
                      ? 'Création...' 
                      : conversations.has(selectedApp.id) 
                        ? 'Ouvrir la conversation' 
                        : 'Contacter'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomTestModal(true)}
                    className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
                  >
                    Nouveau test IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(true)}
                    disabled={hasMeetingProposed}
                    className="rounded-full border border-success/60 bg-success/10 px-3 py-1 text-[11px] font-medium text-success hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={hasMeetingProposed ? 'Un rendez-vous a déjà été proposé' : 'Proposer un rendez-vous'}
                  >
                    {hasMeetingProposed ? 'RDV déjà proposé' : 'Proposer RDV'}
                  </button>
                </div>
              </div>
            </div>

            {detail?.cvNoteFromGpt && (
              <div className="rounded-xl border border-border bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-semibold text-text-muted">Note IA (CV vs offre)</p>
                <p className="text-[11px] text-text whitespace-pre-wrap">{detail.cvNoteFromGpt}</p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold text-text">Votre note sur le candidat</p>
              <textarea
                value={recruiterNoteDraft}
                onChange={(e) => setRecruiterNoteDraft(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                placeholder="Ajoutez une note interne (visible uniquement par les recruteurs)..."
              />
              <button
                type="button"
                onClick={saveRecruiterNote}
                disabled={savingNote}
                className="mt-2 rounded-full bg-linkedin px-3 py-1 text-[11px] font-medium text-white hover:bg-linkedin/90 disabled:opacity-50"
              >
                {savingNote ? 'Enregistrement...' : 'Enregistrer la note'}
              </button>
            </div>

            {detail?.testResultDetail && (
              <div className="rounded-xl border border-border bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold text-text">
                  Résultat du test : {detail.testResultDetail.testTitle} — {detail.testResultDetail.percentage}%
                </p>
                <p className="mb-2 text-[10px] text-text-muted">
                  {detail.testResultDetail.score} / {detail.testResultDetail.maxScore} points
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {detail.testResultDetail.questions.map((q, i) => (
                    <div
                      key={q.questionId}
                      className={`rounded-lg border p-2 text-[11px] ${q.isCorrect ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}
                    >
                      <p className="font-medium text-text">Q{i + 1}. {q.questionText}</p>
                      <p className="mt-1 text-text-muted">
                        Réponse du candidat : {Array.isArray(q.candidateAnswer) ? q.candidateAnswer.join(', ') : String(q.candidateAnswer || '—')}
                      </p>
                      <p className="mt-0.5">
                        {q.isCorrect ? (
                          <span className="text-success">✓ Correct — {q.points}/{q.maxPoints} pts</span>
                        ) : (
                          <span className="text-danger">✗ Faux — {q.points}/{q.maxPoints} pts</span>
                        )}
                      </p>
                      {!q.isCorrect && (q.correctAnswer != null || q.explanation) && (
                        <div className="mt-1 pt-1 border-t border-border/50 text-text-muted">
                          {q.correctAnswer != null && (
                            <p>Réponse attendue : {Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer}</p>
                          )}
                          {q.explanation && <p>Explication : {q.explanation}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedApp && !detail?.testResultDetail && selectedApp.testScore != null && (
              <p className="text-[11px] text-text-muted">Test passé. Chargement du détail...</p>
            )}

            {/* Résultats des tests personnalisés (exclure le test déjà affiché dans testResultDetail) */}
            {customTestResults
              .filter((tr) => !detail?.testResultDetail?.testId || tr.testId !== detail.testResultDetail.testId)
              .map((testResult, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold text-text">
                  Résultat du test personnalisé : {testResult.testTitle} — {testResult.percentage}%
                </p>
                <p className="mb-2 text-[10px] text-text-muted">
                  {testResult.score} / {testResult.maxScore} points
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResult.questions.map((q: any, i: number) => (
                    <div
                      key={q.questionId}
                      className={`rounded-lg border p-2 text-[11px] ${q.isCorrect ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}
                    >
                      <p className="font-medium text-text">Q{i + 1}. {q.questionText}</p>
                      <p className="mt-1 text-text-muted">
                        Réponse du candidat : {Array.isArray(q.candidateAnswer) ? q.candidateAnswer.join(', ') : String(q.candidateAnswer || '—')}
                      </p>
                      <p className="mt-0.5">
                        {q.isCorrect ? (
                          <span className="text-success">✓ Correct — {q.points}/{q.maxPoints} pts</span>
                        ) : (
                          <span className="text-danger">✗ Faux — {q.points}/{q.maxPoints} pts</span>
                        )}
                      </p>
                      {!q.isCorrect && (q.correctAnswer != null || q.explanation) && (
                        <div className="mt-1 pt-1 border-t border-border/50 text-text-muted">
                          {q.correctAnswer != null && (
                            <p>Réponse attendue : {Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer}</p>
                          )}
                          {q.explanation && <p>Explication : {q.explanation}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Historique des actions */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-text">Historique des actions</p>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[10px] text-linkedin hover:underline"
                >
                  {showHistory ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              {showHistory && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {applicationHistory.length === 0 ? (
                    <p className="text-[10px] text-text-muted">Aucun historique disponible</p>
                  ) : (
                    applicationHistory.map((entry) => {
                      const actionLabels: Record<string, string> = {
                        'created': 'Candidature créée',
                        'status_changed': 'Statut modifié',
                        'note_added': 'Note ajoutée',
                        'test_sent': 'Test envoyé',
                        'meeting_proposed': 'Rendez-vous proposé',
                        'cv_viewed': 'CV consulté'
                      }
                      return (
                        <div key={entry.id} className="flex items-start gap-2 text-[10px] border-l-2 border-linkedin/30 pl-2">
                          <span className="text-text-muted">
                            {new Date(entry.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-text">
                            {actionLabels[entry.action] || entry.action}
                            {entry.details?.newStatus && ` → ${entry.details.newStatus}`}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-text-muted">Sélectionnez une candidature</p>
        )}
      </motion.section>

      {showCandidateProfile && detail && typeof (detail as any).candidate === 'object' && (
        <CandidateProfileModal
          candidate={(detail as any).candidate}
          onClose={() => setShowCandidateProfile(false)}
        />
      )}

      {/* Modal pour générer un nouveau test */}
      {showCustomTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-semibold text-text">Générer un nouveau test avec IA</h3>
            <p className="mb-3 text-[11px] text-text-muted">
              Décrivez ce que vous souhaitez tester chez le candidat. L'IA générera un test personnalisé.
            </p>
            <textarea
              value={customTestPrompt}
              onChange={(e) => setCustomTestPrompt(e.target.value)}
              rows={5}
              className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: Tester les compétences en React et TypeScript, avec focus sur les hooks et la gestion d'état..."
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCustomTestModal(false)
                  setCustomTestPrompt('')
                }}
                className="flex-1 rounded-full border border-border px-3 py-2 text-[11px] font-medium text-text hover:bg-bg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleGenerateCustomTest}
                disabled={generatingTest || !customTestPrompt.trim()}
                className="flex-1 rounded-full bg-linkedin px-3 py-2 text-[11px] font-medium text-white hover:bg-linkedin/90 disabled:opacity-50"
              >
                {generatingTest ? 'Génération...' : 'Générer et envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour proposer un rendez-vous */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-semibold text-text">Proposer un rendez-vous</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Date *</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text focus:border-linkedin focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Heure *</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text focus:border-linkedin focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Adresse *</label>
                <input
                  type="text"
                  value={meetingAddress}
                  onChange={(e) => setMeetingAddress(e.target.value)}
                  placeholder="123 Rue Example, 75001 Paris"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Instructions (optionnel)</label>
                <textarea
                  value={meetingInstructions}
                  onChange={(e) => setMeetingInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex: Entrer par l'accueil, se présenter à la réception..."
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMeetingModal(false)
                  setMeetingDate('')
                  setMeetingTime('')
                  setMeetingAddress('')
                  setMeetingInstructions('')
                }}
                className="flex-1 rounded-full border border-border px-3 py-2 text-[11px] font-medium text-text hover:bg-bg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendMeetingInvitation}
                disabled={sendingMeeting || !meetingDate || !meetingTime || !meetingAddress.trim()}
                className="flex-1 rounded-full bg-success px-3 py-2 text-[11px] font-medium text-white hover:bg-success/90 disabled:opacity-50"
              >
                {sendingMeeting ? 'Envoi...' : 'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
