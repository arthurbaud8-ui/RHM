import { getUploadUrl } from '../services/api'

export type CandidateProfileData = {
  nom: string
  prenom: string
  email: string
  avatarUrl?: string
  profile?: {
    linkedInUrl?: string
    skills?: string[]
    experience?: string
    education?: string
    preferredLocation?: string
    jobPreferences?: string[]
    cvAnalysis?: {
      skills?: string[]
      experience?: string
      education?: string
      yearsOfExperience?: number
      languages?: string[]
      summary?: string
    }
  }
}

type Props = {
  candidate: CandidateProfileData | null
  onClose: () => void
}

export function CandidateProfileModal({ candidate, onClose }: Props) {
  if (!candidate) return null

  const fullName = `${candidate.prenom} ${candidate.nom}`
  const profile = candidate.profile
  const cv = profile?.cvAnalysis

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Profil du candidat"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-bg-elevated px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Profil du candidat</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted hover:bg-slate-200 hover:text-text"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4 space-y-4 text-xs">
          <div className="flex items-center gap-3">
            {candidate.avatarUrl ? (
              <img
                src={getUploadUrl(candidate.avatarUrl)}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linkedin text-xl font-semibold text-white">
                {fullName.charAt(0) || '?'}
              </div>
            )}
            <div>
              <p className="font-semibold text-text">{fullName}</p>
              <a
                href={`mailto:${candidate.email}`}
                className="text-[11px] text-linkedin hover:underline"
              >
                {candidate.email}
              </a>
              {profile?.linkedInUrl && (
                <a
                  href={profile.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-[11px] text-linkedin hover:underline"
                >
                  Profil LinkedIn →
                </a>
              )}
            </div>
          </div>

          {(profile?.skills?.length || cv?.skills?.length) ? (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Compétences</p>
              <p className="text-[11px] text-text">
                {(cv?.skills ?? profile?.skills ?? []).slice(0, 15).join(', ')}
                {((cv?.skills ?? profile?.skills)?.length ?? 0) > 15 && ' …'}
              </p>
            </div>
          ) : null}

          {(profile?.experience || cv?.experience) && (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Expérience</p>
              <p className="text-[11px] text-text whitespace-pre-wrap line-clamp-4">
                {cv?.experience || profile?.experience || '—'}
              </p>
              {cv?.yearsOfExperience != null && cv.yearsOfExperience > 0 && (
                <p className="mt-1 text-[11px] text-text-muted">
                  {cv.yearsOfExperience} an{cv.yearsOfExperience > 1 ? 's' : ''} d&apos;expérience
                </p>
              )}
            </div>
          )}

          {(profile?.education || cv?.education) && (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Formation</p>
              <p className="text-[11px] text-text">{cv?.education || profile?.education}</p>
            </div>
          )}

          {profile?.preferredLocation && (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Localisation préférée</p>
              <p className="text-[11px] text-text">{profile.preferredLocation}</p>
            </div>
          )}

          {profile?.jobPreferences?.length ? (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Préférences métier</p>
              <p className="text-[11px] text-text">{profile.jobPreferences.join(', ')}</p>
            </div>
          ) : null}

          {cv?.languages?.length ? (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Langues</p>
              <p className="text-[11px] text-text">{cv.languages.join(', ')}</p>
            </div>
          ) : null}

          {cv?.summary && (
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold text-text-muted">Résumé (analyse CV)</p>
              <p className="text-[11px] text-text whitespace-pre-wrap">{cv.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
