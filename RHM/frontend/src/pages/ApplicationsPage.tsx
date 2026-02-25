import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getUploadUrl } from '../services/api'
import type { Application, ApplicationDetail } from '../services/api'
import { CandidateProfileModal } from '../components/CandidateProfileModal'
import { toast } from 'sonner'

export function ApplicationsPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetail | null>(null)
  const [recruiterNoteDraft, setRecruiterNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showCandidateProfile, setShowCandidateProfile] = useState(false)

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true)
        // Récupérer le rôle de l'utilisateur
        const profile = await api.getProfile()
        setUserRole(profile.role)

        // Si candidat, récupérer ses propres candidatures, sinon toutes les candidatures (recruteur)
        const data = profile.role === 'candidate'
          ? await api.getMyApplications()
          : await api.getApplications()
        setApplications(data)
        if (data.length > 0) {
          setSelectedApp(data[0])
        }
      } catch (error: any) {
        toast.error('Erreur lors du chargement des candidatures')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchApplications()
  }, [])

  // Recruteur : charger le détail (note GPT, test) quand une candidature est sélectionnée et qu'on a jobOfferId
  useEffect(() => {
    if (userRole !== 'recruiter' || !selectedApp?.jobOfferId || !selectedApp?.id) {
      setSelectedDetail(null)
      setRecruiterNoteDraft('')
      return
    }
    let cancelled = false
    api.getApplicationDetail(selectedApp.jobOfferId, selectedApp.id).then((detail) => {
      if (!cancelled) {
        setSelectedDetail(detail)
        setRecruiterNoteDraft(detail.recruiterNote ?? '')
      }
    }).catch(() => {
      if (!cancelled) setSelectedDetail(null)
    })
    return () => { cancelled = true }
  }, [userRole, selectedApp?.id, selectedApp?.jobOfferId])

  const handleOpenCv = async () => {
    if (!selectedApp?.jobOfferId || !selectedApp?.id) return
    try {
      const blob = await api.getApplicationCv(selectedApp.jobOfferId, selectedApp.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (e: any) {
      toast.error(e.message || 'Impossible d\'ouvrir le CV')
    }
  }

  const handleSaveRecruiterNote = async () => {
    if (!selectedApp?.jobOfferId || !selectedApp?.id) return
    setSavingNote(true)
    try {
      await api.updateApplicationRecruiterNote(selectedApp.jobOfferId, selectedApp.id, recruiterNoteDraft)
      setSelectedDetail((d) => d ? { ...d, recruiterNote: recruiterNoteDraft } : null)
      toast.success('Note enregistrée')
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingNote(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des candidatures...</div>
      </div>
    )
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
      <section className="space-y-3">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Candidatures
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {userRole === 'candidate' ? 'Mes candidatures' : 'Pipeline de candidatures'}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            {userRole === 'candidate'
              ? 'Suivez l\'état de vos candidatures'
              : 'Vue consolidée des candidatures avec score IA et statut des snapshots CV.'}
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated text-xs shadow-sm">
          <div className={`grid ${userRole === 'candidate' ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[0.5fr_1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.7fr]'} border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted`}>
            {userRole === 'candidate' ? (
              <>
                <span>Offre</span>
                <span>Statut</span>
                <span>Date</span>
              </>
            ) : (
              <>
                <span>Rang</span>
                <span>Candidat</span>
                <span>Poste</span>
                <span>Score CV (GPT)</span>
                <span>Score Test (GPT)</span>
                <span>Score Global</span>
                <span>Étape</span>
              </>
            )}
          </div>

          <div className="divide-y divide-border/80">
            {applications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-text-muted">
                Aucune candidature pour le moment
              </div>
            ) : (
              applications.map((app, index) => {
                const appAny = app as any
                const rank = appAny.rank || index + 1
                const cvScore = appAny.cvMatchScore || 0
                const testScore = appAny.testScore !== null && appAny.testScore !== undefined ? appAny.testScore : null
                const overallScore = appAny.overallScore || app.score || 0
                
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className={`grid w-full ${userRole === 'candidate' ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[0.5fr_1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.7fr]'} items-center gap-2 px-3 py-2 text-left text-[11px] text-text-muted hover:bg-slate-50 ${
                      selectedApp?.id === app.id ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    {userRole === 'candidate' ? (
                      <>
                        <span className="text-xs text-text">{app.role}</span>
                        <span className="text-xs text-text">{app.stage}</span>
                        <span className="text-xs text-text-muted">
                          {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center justify-center">
                          {rank === 1 && (
                            <span className="text-lg">🥇</span>
                          )}
                          {rank === 2 && (
                            <span className="text-lg">🥈</span>
                          )}
                          {rank === 3 && (
                            <span className="text-lg">🥉</span>
                          )}
                          {rank > 3 && (
                            <span className="text-xs font-semibold text-text-muted">#{rank}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linkedin text-[11px] font-semibold text-white">
                            {app.candidate.charAt(0)}
                          </span>
                          <span className="text-xs text-text">{app.candidate}</span>
                        </span>
                        <span className="text-xs text-text">{app.role}</span>
                        <span className={`text-xs font-semibold ${cvScore >= 70 ? 'text-success' : cvScore >= 50 ? 'text-accent' : 'text-text-muted'}`}>
                          {cvScore}%
                        </span>
                        <span className={`text-xs font-semibold ${testScore !== null ? (testScore >= 70 ? 'text-success' : testScore >= 50 ? 'text-accent' : 'text-text-muted') : 'text-text-muted'}`}>
                          {testScore !== null ? `${testScore}%` : '-'}
                        </span>
                        <span className={`text-xs font-bold ${overallScore >= 70 ? 'text-success' : overallScore >= 50 ? 'text-accent' : 'text-text-muted'}`}>
                          {overallScore}%
                        </span>
                        <span className="text-xs text-text">{app.stage}</span>
                      </>
                    )}
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
        className="space-y-3 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text">
              Détails de la candidature
            </h2>
            <p className="text-[11px] text-text-muted">
              Prévisualisation du snapshot CV (PDF) en modal, immuable pour
              garantir la traçabilité.
            </p>
          </div>
          {userRole === 'recruiter' && selectedApp?.jobOfferId && (
            <button
              type="button"
              onClick={handleOpenCv}
              className="rounded-full border border-linkedin/60 bg-linkedin/10 px-3 py-1 text-[11px] font-medium text-linkedin hover:bg-linkedin/20"
            >
              Ouvrir le snapshot
            </button>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-white p-3">
          {selectedApp ? (
            <>
              {userRole === 'recruiter' && selectedDetail && typeof (selectedDetail as any).candidate === 'object' ? (
                <button
                  type="button"
                  onClick={() => setShowCandidateProfile(true)}
                  className="flex w-full items-center gap-2 text-left hover:opacity-90"
                >
                  {(selectedDetail as any).candidate?.avatarUrl ? (
                    <img
                      src={getUploadUrl((selectedDetail as any).candidate.avatarUrl)}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linkedin text-[11px] font-semibold text-white">
                      {selectedApp.candidate.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-text">
                      {selectedApp.candidate}
                      {selectedApp.role && ` • ${selectedApp.role}`}
                    </p>
                    <span className="text-[10px] text-text-muted">Cliquer pour voir le profil</span>
                  </div>
                </button>
              ) : (
                <p className="text-xs font-semibold text-text">
                  {selectedApp.candidate}
                  {selectedApp.role && ` • ${selectedApp.role}`}
                </p>
              )}
              <p className="text-[11px] text-text-muted">
                Score IA {selectedApp.score}%.
                {selectedDetail?.cvMatchScore != null && ` CV : ${selectedDetail.cvMatchScore}%`}
                {selectedDetail?.testResultDetail != null && ` Test : ${selectedDetail.testResultDetail.percentage}%`}
              </p>
              {userRole === 'candidate' && selectedApp.jobOfferId && (
                <button
                  type="button"
                  onClick={() => navigate(`/offers/${selectedApp.jobOfferId}`)}
                  className="mt-2 w-full rounded-full border border-linkedin/60 bg-linkedin/10 px-3 py-1.5 text-[11px] font-medium text-linkedin hover:bg-linkedin/20"
                >
                  Voir les détails de l'offre
                </button>
              )}
              {userRole === 'recruiter' && selectedDetail?.cvNoteFromGpt && (
                <div className="mt-2 rounded-lg border border-border/60 bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold uppercase text-text-muted">Note IA (CV / offre)</p>
                  <p className="mt-0.5 text-[11px] text-text">{selectedDetail.cvNoteFromGpt}</p>
                </div>
              )}
              {userRole === 'recruiter' && selectedDetail?.testResultDetail && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold uppercase text-text-muted">Détail test : {selectedDetail.testResultDetail.testTitle}</p>
                  <p className="mt-0.5 text-[11px] text-text">
                    {selectedDetail.testResultDetail.questions?.map((q, i) => (
                      <span key={q.questionId}>
                        Q{i + 1} : {q.isCorrect ? '✓' : '✗'} ({q.points}/{q.maxPoints} pts)
                        {i < (selectedDetail.testResultDetail!.questions.length - 1) ? ' · ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {userRole === 'candidate' && selectedApp && selectedApp.testId && !selectedApp.testResultId && (
                <div className="mt-2 rounded-lg border border-linkedin/60 bg-linkedin/10 p-3">
                  <p className="text-[11px] font-semibold text-linkedin mb-1">
                    ⚠️ Test technique requis
                  </p>
                  <p className="text-[11px] text-text-muted mb-2">
                    Vous devez passer le test technique pour compléter votre candidature.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/tests?testId=${selectedApp.testId}&applicationId=${selectedApp.id}`)}
                    className="w-full rounded-full bg-linkedin px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-linkedin/90"
                  >
                    Passer le test maintenant
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-text-muted">Sélectionnez une candidature</p>
          )}
        </div>

        {userRole === 'recruiter' && (
          <div className="space-y-2 rounded-xl border border-border bg-white p-3">
            <p className="text-xs font-semibold text-text">Notes internes</p>
            <p className="text-[11px] text-text-muted">
              Ces notes ne sont pas exposées au candidat.
            </p>
            <textarea
              value={recruiterNoteDraft}
              onChange={(e) => setRecruiterNoteDraft(e.target.value)}
              onBlur={handleSaveRecruiterNote}
              className="mt-2 h-24 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
            placeholder="Ex : très bon fit produit, vérifier niveau d’anglais et expérience en scale-up."
          />
            <button
              type="button"
              onClick={handleSaveRecruiterNote}
              disabled={savingNote}
              className="rounded-full border border-linkedin/60 bg-linkedin/10 px-3 py-1 text-[11px] font-medium text-linkedin hover:bg-linkedin/20 disabled:opacity-50"
            >
              {savingNote ? 'Enregistrement…' : 'Enregistrer la note'}
            </button>
          </div>
        )}
      </motion.section>

      {showCandidateProfile && userRole === 'recruiter' && selectedDetail && typeof (selectedDetail as any).candidate === 'object' && (
        <CandidateProfileModal
          candidate={(selectedDetail as any).candidate}
          onClose={() => setShowCandidateProfile(false)}
        />
      )}
    </div>
  )
}

