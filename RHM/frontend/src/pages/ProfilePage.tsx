import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api, getUploadUrl } from '../services/api'
import type { Profile, CvSnapshot, RecruiterProfileData } from '../services/api'
import { toast } from 'sonner'

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [snapshots, setSnapshots] = useState<CvSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [cvAnalysis, setCvAnalysis] = useState<any | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    linkedInUrl: '',
    recruiterProfile: {} as RecruiterProfileData,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [profileData, snapshotsData] = await Promise.all([
          api.getProfile(),
          api.getSnapshots(),
        ])
        setProfile(profileData)
        setSnapshots(snapshotsData)
        
        // Charger l'analyse depuis le profil utilisateur
        try {
          const fullProfile = await api.getFullProfile()
          if (fullProfile.cvAnalysis) {
            setCvAnalysis(fullProfile.cvAnalysis)
          } else if (snapshotsData.length > 0 && (snapshotsData[0] as any).analysis) {
            setCvAnalysis((snapshotsData[0] as any).analysis)
          }
        } catch (error) {
          // Ignorer l'erreur si l'analyse n'est pas disponible
        }
        
        // Initialiser le formulaire d'édition
        const [prenom, ...nomParts] = profileData.fullName.split(' ')
        setEditForm({
          prenom: prenom || '',
          nom: nomParts.join(' ') || '',
          linkedInUrl: profileData.profile?.linkedInUrl || '',
          recruiterProfile: profileData.recruiterProfile || {},
        })
      } catch (error: any) {
        toast.error('Erreur lors du chargement du profil')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSaveProfile = async () => {
    try {
      const payload: Parameters<typeof api.updateProfile>[0] = {
        nom: editForm.nom,
        prenom: editForm.prenom,
      }
      if (profile?.role === 'candidate') {
        payload.profile = { ...profile.profile, linkedInUrl: editForm.linkedInUrl || undefined }
      }
      if (profile?.role === 'recruiter') {
        payload.recruiterProfile = editForm.recruiterProfile
      }
      const updatedProfile = await api.updateProfile(payload)
      setProfile(updatedProfile)
      setIsEditing(false)
      toast.success('Profil mis à jour avec succès')
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du profil')
      console.error(error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image (JPEG, PNG, GIF, WebP)')
      return
    }
    try {
      setIsUploadingAvatar(true)
      const { avatarUrl } = await api.uploadAvatar(file)
      setProfile({ ...profile, avatarUrl })
      toast.success('Photo de profil mise à jour')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'upload de la photo')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés')
      return
    }

    try {
      setIsAnalyzing(true)
      const snapshot = await api.uploadSnapshot(file)
      setSnapshots([snapshot, ...snapshots])
      
      // Si l'analyse est disponible, l'afficher
      if (snapshot.analysis) {
        setCvAnalysis(snapshot.analysis)
        toast.success('CV uploadé et analysé avec succès !')
      } else {
        toast.success('CV uploadé avec succès')
      }
    } catch (error: any) {
      toast.error('Erreur lors de l\'upload du CV')
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyzeCv = async () => {
    try {
      setIsAnalyzing(true)
      const result = await api.analyzeCv()
      setCvAnalysis(result.analysis)
      // Recharger le profil pour avoir les données à jour
      const profileData = await api.getProfile()
      setProfile(profileData)
      toast.success('CV analysé avec succès !')
    } catch (error: any) {
      toast.error('Erreur lors de l\'analyse du CV')
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement du profil...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-linkedin">
            Mon profil
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {profile.role === 'recruiter' ? 'Profil & identité marque employeur' : 'Profil & CV'}
          </h1>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-border bg-bg-elevated p-4 shadow-sm"
        >
          <div className="flex gap-4">
            <div className="relative">
              <label className="block cursor-pointer">
                {profile.avatarUrl ? (
                  <img
                    src={getUploadUrl(profile.avatarUrl)}
                    alt="Photo de profil"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-linkedin flex items-center justify-center text-white text-2xl font-semibold">
                    {profile.fullName.charAt(0) || '?'}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingAvatar}
                  onChange={handleAvatarUpload}
                />
              </label>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold text-accent">
                {profile.role.toUpperCase()}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-[10px] text-white">
                  ...
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1 text-sm">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.prenom}
                      onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                      placeholder="Prénom"
                    />
                    <input
                      type="text"
                      value={editForm.nom}
                      onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                      placeholder="Nom"
                    />
                  </div>
                  {profile.role === 'candidate' && (
                    <div>
                      <label className="text-[11px] text-text-muted">Lien LinkedIn</label>
                      <input
                        type="url"
                        value={editForm.linkedInUrl}
                        onChange={(e) => setEditForm({ ...editForm, linkedInUrl: e.target.value })}
                        className="mt-0.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  )}
                  {profile.role === 'recruiter' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-text-muted">Nom de l'entreprise</label>
                        <input
                          type="text"
                          value={editForm.recruiterProfile.companyName ?? ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            recruiterProfile: { ...editForm.recruiterProfile, companyName: e.target.value },
                          })}
                          className="mt-0.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                          placeholder="Entreprise"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-text-muted">Taille</label>
                          <input
                            type="text"
                            value={editForm.recruiterProfile.companySize ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              recruiterProfile: { ...editForm.recruiterProfile, companySize: e.target.value },
                            })}
                            className="mt-0.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                            placeholder="ex: 50-200"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-text-muted">Secteur</label>
                          <input
                            type="text"
                            value={editForm.recruiterProfile.industry ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              recruiterProfile: { ...editForm.recruiterProfile, industry: e.target.value },
                            })}
                            className="mt-0.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                            placeholder="ex: Tech"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-text-muted">Site web</label>
                        <input
                          type="url"
                          value={editForm.recruiterProfile.website ?? ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            recruiterProfile: { ...editForm.recruiterProfile, website: e.target.value },
                          })}
                          className="mt-0.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-linkedin focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="rounded-full bg-linkedin px-3 py-1 text-xs font-semibold text-white hover:bg-linkedin/90"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text hover:bg-bg-elevated"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-text">
                    {profile.fullName}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {profile.email}
                  </p>
                  {profile.role === 'candidate' && profile.profile?.linkedInUrl && (
                    <a
                      href={profile.profile.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-linkedin hover:underline"
                    >
                      Profil LinkedIn
                    </a>
                  )}
                  {profile.role === 'recruiter' && profile.recruiterProfile?.companyName && (
                    <p className="text-xs text-text-muted">
                      {profile.recruiterProfile.companyName}
                      {profile.recruiterProfile.industry && ` • ${profile.recruiterProfile.industry}`}
                    </p>
                  )}
                  {profile.tenantId && (
                    <p className="text-[11px] text-text-muted">
                      Tenant ID : {profile.tenantId}
                    </p>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text hover:bg-bg-elevated"
                  >
                    Modifier le profil
                  </button>
                </>
              )}
            </div>
          </div>

          {cvAnalysis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text">Analyse du CV (ChatGPT)</p>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  Analysé
                </span>
              </div>
              <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {cvAnalysis.skills && cvAnalysis.skills.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-text-muted">Compétences extraites</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.skills.slice(0, 5).join(', ')}
                      {cvAnalysis.skills.length > 5 && ` +${cvAnalysis.skills.length - 5} autres`}
                    </p>
                  </div>
                )}
                {cvAnalysis.experience && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-text-muted">Expérience</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.experience.substring(0, 100)}
                      {cvAnalysis.experience.length > 100 && '...'}
                    </p>
                  </div>
                )}
                {cvAnalysis.education && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-text-muted">Formation</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.education}
                    </p>
                  </div>
                )}
                {cvAnalysis.yearsOfExperience !== undefined && cvAnalysis.yearsOfExperience > 0 && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-text-muted">Années d'expérience</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.yearsOfExperience} ans
                    </p>
                  </div>
                )}
                {cvAnalysis.languages && cvAnalysis.languages.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-text-muted">Langues</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.languages.join(', ')}
                    </p>
                  </div>
                )}
                {cvAnalysis.summary && (
                  <div className="rounded-xl border border-border bg-white p-3 sm:col-span-2 lg:col-span-3">
                    <p className="text-text-muted">Résumé professionnel</p>
                    <p className="mt-1 text-[11px] text-text">
                      {cvAnalysis.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-white p-3">
                <p className="text-text-muted">Domaines de recrutement</p>
                <p className="mt-1 text-[11px] text-text">
                  
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-3">
                <p className="text-text-muted">Niveaux ciblés</p>
                <p className="mt-1 text-[11px] text-text">
                  
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-3">
                <p className="text-text-muted">Mode de travail</p>
                <p className="mt-1 text-[11px] text-text">
                  
                </p>
              </div>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3 rounded-2xl border border-dashed border-border bg-bg-elevated p-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-text">
              CV & templates de besoins
            </h2>
            <p className="text-[11px] text-text-muted">
              Déposez des JD ou exemples de talents pour entraîner le matching
              IA. Les fichiers sont stockés sur MinIO/S3 avec snapshots
              immuables.
            </p>
          </div>

          <label
            htmlFor="cv-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white px-4 py-6 text-center text-xs text-text-muted hover:border-linkedin/80 hover:bg-slate-50"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg text-xs font-semibold text-linkedin">
              PDF
            </span>
            <div>
              <p className="text-xs font-medium text-text">
                Glissez-déposez vos CV ou fiches de poste
              </p>
              <p className="mt-1 text-[11px]">
                PDF uniquement • Structuration automatique par domaine •
                versionnage garanti.
              </p>
            </div>
            <input
              id="cv-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {snapshots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-muted">
                  CV uploadé
                </p>
                <button
                  type="button"
                  onClick={handleAnalyzeCv}
                  disabled={isAnalyzing}
                  className="rounded-full bg-linkedin px-3 py-1 text-[10px] font-semibold text-white hover:bg-linkedin/90 disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyse...' : 'Analyser le CV'}
                </button>
              </div>
              <div className="space-y-2">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-xs text-text">
                        {snapshot.filename}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        Domaine : {snapshot.domain} • Créé le{' '}
                        {new Date(snapshot.createdAt).toLocaleDateString('fr-FR')}{' '}
                        • Snapshot figé
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-linkedin hover:underline"
                    >
                      Prévisualiser
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
