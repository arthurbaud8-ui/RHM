import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api, API_BASE_URL } from '../services/api'
import type { Offer } from '../services/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

function statusLabel(status: string) {
  switch (status) {
    case 'live':
      return 'En cours'
    case 'paused':
      return 'En pause'
    default:
      return 'Brouillon'
  }
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    contractType: '',
    experience: '',
    skills: '',
  })
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [hasExistingCv, setHasExistingCv] = useState(false)
  const [isUploadingCv, setIsUploadingCv] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer le rôle de l'utilisateur
        const profile = await api.getProfile()
        setUserRole(profile.role)

        // Si recruteur, récupérer ses propres offres, sinon les offres publiques
        const data = profile.role === 'recruiter'
          ? await api.getRecruiterOffers()
          : await api.getOffers(filters)
        setOffers(data)
      } catch (error: any) {
        toast.error('Erreur lors du chargement des offres')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [filters])

  // Charger le CV existant (profil) quand le modal de candidature s'ouvre
  useEffect(() => {
    if (showApplyModal && userRole === 'candidate') {
      const checkExistingCv = async () => {
        try {
          const full = await api.getFullProfile()
          if (full.cv) {
            setHasExistingCv(true)
            setResumeUrl(full.cv)
          } else {
            setHasExistingCv(false)
            setResumeUrl(null)
          }
        } catch (error) {
          setHasExistingCv(false)
          setResumeUrl(null)
        }
      }
      checkExistingCv()
    }
  }, [showApplyModal, userRole])

  const handleCvUpload = async (file: File) => {
    setIsUploadingCv(true)
    try {
      const formData = new FormData()
      formData.append('cv', file)
      
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/uploads/cv`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du CV')
      }

      const result = await response.json()
      setResumeUrl(result.data.path)
      setHasExistingCv(true)
      toast.success('CV uploadé avec succès')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'upload du CV')
    } finally {
      setIsUploadingCv(false)
    }
  }

  const handleApply = async () => {
    if (!selectedOffer) return

    try {
      const result = await api.applyToOffer(selectedOffer.id, {
        coverLetter,
        resumeUrl: resumeUrl || undefined,
      })
      
      if (result.requiresTest && result.testId) {
        toast.success('Candidature envoyée ! Vous devez maintenant passer le test technique.')
        setShowApplyModal(false)
        setCoverLetter('')
        setSelectedOffer(null)
        // Rediriger vers le test
        window.location.href = `/tests?testId=${result.testId}&applicationId=${result.id}`
      } else {
        toast.success('Candidature envoyée avec succès !')
        setShowApplyModal(false)
        setCoverLetter('')
        setSelectedOffer(null)
        // Recharger les offres
        const profile = await api.getProfile()
        const data = profile.role === 'recruiter'
          ? await api.getRecruiterOffers()
          : await api.getOffers(filters)
        setOffers(data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la candidature')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des offres...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Offres
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {userRole === 'recruiter' ? 'Mes offres' : 'Offres d\'emploi'}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            {userRole === 'recruiter'
              ? 'Pilotez vos offres.'
              : 'Découvrez les meilleures opportunités qui correspondent à votre profil.'}
          </p>
        </div>
        {userRole === 'recruiter' && (
          <button
            type="button"
            onClick={() => navigate('/offers/new')}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
          >
            <span>Publier une offre</span>
          </button>
        )}
      </header>

      {userRole !== 'recruiter' && (
        <div className="rounded-2xl border border-border bg-bg-elevated p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
            />
            <input
              type="text"
              placeholder="Localisation"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
            />
            <select
              value={filters.contractType}
              onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-linkedin focus:outline-none"
            >
              <option value="">Type de contrat</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
              <option value="Freelance">Freelance</option>
            </select>
            <select
              value={filters.experience}
              onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-linkedin focus:outline-none"
            >
              <option value="">Niveau d'expérience</option>
              <option value="Junior">Junior</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Senior">Senior</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>
      )}

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-elevated p-8 text-center">
          <p className="text-sm font-semibold text-text">
            {userRole === 'recruiter' 
              ? 'Aucune offre créée pour le moment' 
              : 'Aucune offre disponible pour le moment'}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {userRole === 'recruiter'
              ? 'Créez votre première offre d\'emploi pour commencer à recruter.'
              : 'Les offres publiées apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer, index) => (
          <motion.article
            key={offer.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex flex-col justify-between rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {offer.companyLogo && (
                    <img
                      src={offer.companyLogo.startsWith('http') ? offer.companyLogo : `${API_BASE_URL}${offer.companyLogo.startsWith('/') ? '' : '/'}${offer.companyLogo}`}
                      alt={offer.companyName || 'Entreprise'}
                      className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-text">
                      {offer.title}
                    </h2>
                    {offer.companyName && (
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        {offer.companyName}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-text-muted">
                      {offer.location || '—'} {offer.contractType ? `• ${offer.contractType}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    offer.status === 'live'
                      ? 'bg-success/10 text-success'
                      : offer.status === 'paused'
                        ? 'bg-text-muted/10 text-text-muted'
                        : 'bg-linkedin/10 text-linkedin',
                  ].join(' ')}
                >
                  {statusLabel(offer.status)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  {offer.tokensPerMonth > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] text-accent">
                      {offer.tokensPerMonth} tokens / mois
                    </span>
                  )}
                  <span className="text-text-muted">
                    {offer.applicants} candidature{offer.applicants !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px]">
              {userRole === 'recruiter' ? (
                <>
                  <div className="flex gap-2">
                    {offer.status === 'draft' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.updateOffer(offer.id, { status: 'live' })
                            toast.success('Offre publiée avec succès !')
                            // Recharger les offres
                            const profile = await api.getProfile()
                            const data = profile.role === 'recruiter'
                              ? await api.getRecruiterOffers()
                              : await api.getOffers(filters)
                            setOffers(data)
                          } catch (error: any) {
                            toast.error('Erreur lors de la publication de l\'offre')
                            console.error(error)
                          }
                        }}
                        className="rounded-full bg-success px-3 py-1 text-[11px] font-medium text-white hover:bg-success/90"
                      >
                        Publier
                      </button>
                    )}
                    {offer.status === 'live' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.updateOffer(offer.id, { status: 'paused' })
                            toast.success('Offre mise en pause')
                            // Recharger les offres
                            const profile = await api.getProfile()
                            const data = profile.role === 'recruiter'
                              ? await api.getRecruiterOffers()
                              : await api.getOffers(filters)
                            setOffers(data)
                          } catch (error: any) {
                            toast.error('Erreur lors de la mise en pause')
                            console.error(error)
                          }
                        }}
                        className="rounded-full bg-text-muted px-3 py-1 text-[11px] font-medium text-white hover:bg-text-muted/90"
                      >
                        Mettre en pause
                      </button>
                    )}
                    {offer.status === 'paused' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.updateOffer(offer.id, { status: 'live' })
                            toast.success('Offre reprise avec succès')
                            // Recharger les offres
                            const profile = await api.getProfile()
                            const data = profile.role === 'recruiter'
                              ? await api.getRecruiterOffers()
                              : await api.getOffers(filters)
                            setOffers(data)
                          } catch (error: any) {
                            toast.error('Erreur lors de la reprise de l\'offre')
                            console.error(error)
                          }
                        }}
                        className="rounded-full bg-success px-3 py-1 text-[11px] font-medium text-white hover:bg-success/90"
                      >
                        Reprendre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/offers/${offer.id}/applications`)}
                      className="rounded-full border border-linkedin/60 bg-white px-3 py-1 text-[11px] font-medium text-linkedin hover:bg-slate-50"
                    >
                      Voir les candidatures
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/offers/${offer.id}/edit`)}
                      className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-text hover:bg-slate-50"
                    >
                      Modifier
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] text-text-muted hover:text-text"
                  >
                    Dupliquer
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/offers/${offer.id}`)}
                    className="rounded-full border border-linkedin/60 bg-white px-3 py-1 text-[11px] font-medium text-linkedin hover:bg-slate-50"
                  >
                    Voir les détails
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOffer(offer)
                      setShowApplyModal(true)
                    }}
                    className="w-full rounded-full bg-linkedin px-3 py-1 text-[11px] font-medium text-white hover:bg-linkedin/90"
                  >
                    Postuler
                  </button>
                </>
              )}
            </div>
          </motion.article>
          ))}
        </section>
      )}

      {showApplyModal && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Postuler à : {selectedOffer.title}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Lettre de motivation
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                  placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste..."
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  CV
                </label>
                {hasExistingCv && resumeUrl ? (
                  <div className="mb-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-text">
                    <p className="font-medium text-success">✓ CV du profil utilisé</p>
                    <p className="text-xs text-text-muted mt-1">{resumeUrl.split('/').pop()}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setHasExistingCv(false)
                        setResumeUrl(null)
                      }}
                      className="mt-2 text-xs text-linkedin hover:underline"
                    >
                      Utiliser un autre CV
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text hover:border-linkedin">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleCvUpload(file)
                        }}
                        disabled={isUploadingCv}
                        className="hidden"
                        id="cv-upload"
                      />
                      <span className="text-xs">
                        {isUploadingCv ? 'Upload en cours...' : '📄 Télécharger un CV'}
                      </span>
                    </label>
                    <p className="text-xs text-text-muted">
                      Formats acceptés : PDF, DOC, DOCX (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  className="flex-1 rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white hover:bg-linkedin/90"
                >
                  Envoyer la candidature
                </button>
                <button
                  onClick={() => {
                    setShowApplyModal(false)
                    setCoverLetter('')
                    setResumeUrl(null)
                    setSelectedOffer(null)
                  }}
                  className="flex-1 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text hover:bg-bg-elevated"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

