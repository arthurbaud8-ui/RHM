import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, API_BASE_URL } from '../services/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface JobOfferDetail {
  id: string
  title: string
  description: string
  requirements: string[]
  location: string
  salary?: string
  contractType: string
  experience: string
  skills: string[]
  benefits?: string[]
  createdAt: string
  applicationsCount: number
  companyName?: string
  companyLogo?: string
}

export function JobOfferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [offer, setOffer] = useState<JobOfferDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [hasExistingCv, setHasExistingCv] = useState(false)
  const [isUploadingCv, setIsUploadingCv] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await api.getProfile()
        setUserRole(profile.role)

        const response = await fetch(`${API_BASE_URL}/job-offers/${id}`)
        if (!response.ok) {
          throw new Error('Offre non trouvée')
        }
        const result = await response.json()
        const offerData = result.data

        setOffer(offerData)
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors du chargement de l\'offre')
        navigate('/offers')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, navigate])

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
    if (!offer) return

    try {
      const result = await api.applyToOffer(offer.id, {
        coverLetter,
        resumeUrl: resumeUrl || undefined,
      })
      
      if (result.requiresTest && result.testId) {
        toast.success('Candidature envoyée ! Vous devez maintenant passer le test technique.')
        navigate(`/tests?testId=${result.testId}&applicationId=${result.id}`)
      } else {
        toast.success('Candidature envoyée avec succès !')
        navigate('/applications')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la candidature')
    }
  }

  const getUploadUrl = (path: string) => {
    if (path.startsWith('http')) return path
    return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement de l'offre...</div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="rounded-2xl border border-border bg-bg-elevated p-8 text-center">
        <p className="text-sm font-semibold text-text">Offre non trouvée</p>
        <Link to="/offers" className="mt-4 inline-block text-sm text-linkedin hover:underline">
          Retour aux offres
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Link to="/offers" className="text-xs text-linkedin hover:underline mb-2 inline-block">
            ← Retour aux offres
          </Link>
          <div className="flex items-start gap-4 mt-2">
            {offer.companyLogo && (
              <img
                src={getUploadUrl(offer.companyLogo)}
                alt={offer.companyName || 'Entreprise'}
                className="h-16 w-16 rounded-lg object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {offer.title}
              </h1>
              {offer.companyName && (
                <p className="mt-1 text-sm text-text-muted">{offer.companyName}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                <span>{offer.location}</span>
                <span>•</span>
                <span>{offer.contractType}</span>
                {offer.salary && (
                  <>
                    <span>•</span>
                    <span>{offer.salary}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {userRole === 'candidate' && (
          <button
            type="button"
            onClick={() => {
              const profile = api.getProfile()
              profile.then(p => {
                if (p.role === 'candidate') {
                  setShowApplyModal(true)
                  // Charger le CV existant
                  api.getFullProfile().then(full => {
                    if (full.cv) {
                      setHasExistingCv(true)
                      setResumeUrl(full.cv)
                    }
                  }).catch(() => {})
                }
              })
            }}
            className="rounded-full bg-linkedin px-6 py-2 text-sm font-semibold text-white hover:bg-linkedin/90"
          >
            Postuler
          </button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-bg-elevated p-6"
          >
            <h2 className="text-lg font-semibold text-text mb-4">Description du poste</h2>
            <div className="prose prose-sm max-w-none text-text">
              <p className="whitespace-pre-wrap text-sm text-text-muted">{offer.description}</p>
            </div>
          </motion.section>

          {offer.requirements && offer.requirements.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-bg-elevated p-6"
            >
              <h2 className="text-lg font-semibold text-text mb-4">Exigences</h2>
              <ul className="space-y-2">
                {offer.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="text-linkedin mt-1">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {offer.skills && offer.skills.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-bg-elevated p-6"
            >
              <h2 className="text-lg font-semibold text-text mb-4">Compétences requises</h2>
              <div className="flex flex-wrap gap-2">
                {offer.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-linkedin/10 px-3 py-1 text-xs font-medium text-linkedin"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.section>
          )}

          {offer.benefits && offer.benefits.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-bg-elevated p-6"
            >
              <h2 className="text-lg font-semibold text-text mb-4">Avantages</h2>
              <ul className="space-y-2">
                {offer.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="text-success mt-1">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
        </div>

        <div className="lg:col-span-1">
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-bg-elevated p-6 space-y-4"
          >
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Informations
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-muted">Type de contrat :</span>
                  <span className="ml-2 font-medium text-text">{offer.contractType}</span>
                </div>
                <div>
                  <span className="text-text-muted">Niveau d'expérience :</span>
                  <span className="ml-2 font-medium text-text">{offer.experience}</span>
                </div>
                {offer.salary && (
                  <div>
                    <span className="text-text-muted">Salaire :</span>
                    <span className="ml-2 font-medium text-text">{offer.salary}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-muted">Localisation :</span>
                  <span className="ml-2 font-medium text-text">{offer.location}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-muted">
                {offer.applicationsCount} candidature{offer.applicationsCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Publiée le {new Date(offer.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </motion.aside>
        </div>
      </div>

      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Postuler à : {offer.title}
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
