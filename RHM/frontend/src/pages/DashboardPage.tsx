import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import type { DashboardOverview, Offer, Application } from '../services/api'
import { toast } from 'sonner'

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [testResultsCount, setTestResultsCount] = useState<number>(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const profile = await api.getProfile()
        setUserRole(profile.role)

        if (profile.role === 'recruiter') {
          const [dashboardData, offersData, applicationsData] = await Promise.all([
            api.getDashboard(),
            api.getRecruiterOffers(),
            api.getApplications(),
          ])
          setDashboard(dashboardData)
          setOffers(offersData)
          setApplications(applicationsData)
        } else {
          // Candidat : mes candidatures, mes résultats de tests
          const [applicationsData, testResults] = await Promise.all([
            api.getApplications(),
            api.getTestResults().catch(() => []),
          ])
          setApplications(applicationsData)
          setTestResultsCount(Array.isArray(testResults) ? testResults.length : 0)
          setDashboard({
            tokensBalance: 0,
            activeOffers: 0,
            applicationsInReview: 0,
          })
          // Offres publiques pour le lien "Voir les offres"
          const offersData = await api.getOffers().catch(() => [])
          setOffers(offersData)
        }
      } catch (error: any) {
        toast.error('Erreur lors du chargement du dashboard')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-text-muted">Chargement du dashboard...</div>
      </div>
    )
  }

  // ——— Dashboard CANDIDAT ———
  if (userRole === 'candidate') {
    const myApplications = applications
    const activeOffersPreview = offers.filter((o) => o.status === 'live').slice(0, 5)

    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Vue candidat
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Suivez vos candidatures et vos résultats de tests.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
            <p className="text-text-muted">Mes candidatures</p>
            <p className="mt-2 text-2xl font-semibold text-text">{myApplications.length}</p>
            <p className="mt-1 text-[11px] text-text-muted">
              <Link to="/applications" className="text-linkedin hover:underline">
                Voir tout →
              </Link>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
            <p className="text-text-muted">Mes tests passés</p>
            <p className="mt-2 text-2xl font-semibold text-text">{testResultsCount}</p>
            <p className="mt-1 text-[11px] text-text-muted">
              <Link to="/tests" className="text-linkedin hover:underline">
                Passer un test
              </Link>
              {' · '}
              <Link to="/test-results" className="text-linkedin hover:underline">
                Voir mes résultats →
              </Link>
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text">
                Offres d'emploi
              </h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Découvrez les offres qui correspondent à votre profil.
              </p>
            </div>
            <Link
              to="/offers"
              className="text-[11px] font-medium text-linkedin hover:underline"
            >
              Voir tout
            </Link>
          </div>
          {activeOffersPreview.length === 0 ? (
            <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-center text-xs text-text-muted">
              Aucune offre disponible. <Link to="/offers" className="text-linkedin hover:underline">Voir les offres</Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 pr-1">
              {activeOffersPreview.map((offer) => (
                <Link
                  key={offer.id}
                  to="/offers"
                  className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-sm transition-colors hover:border-linkedin/50"
                >
                  <div className="absolute inset-0 bg-slate-900/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="h-28 bg-gradient-to-br from-accent/80 via-accent-soft/40 to-linkedin/70" />
                  <div className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {offer.contractType || 'Offre'}
                  </div>
                  <div className="relative space-y-2 p-3">
                    <h3 className="line-clamp-2 text-xs font-semibold text-text">{offer.title}</h3>
                    <p className="text-[11px] text-text-muted">
                      {offer.location || '—'} · {offer.contractType || '—'}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-text-muted">
                        {offer.applicants} candidature{offer.applicants !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // ——— Dashboard RECRUTEUR ———
  const activeOffersCards = offers
    .filter((offer) => offer.status === 'live')
    .slice(0, 10)
    .map((offer) => ({
      id: offer.id,
      title: offer.title,
      score: offer.applicants > 0 ? 75 : 0,
      tokens: offer.tokensPerMonth,
      applicants: offer.applicants,
      location: offer.location,
      contractType: offer.contractType,
    }))

  const recommendedApplications = applications
    .sort((a, b) => (b.overallScore ?? b.score) - (a.overallScore ?? a.score))
    .slice(0, 10)
    .map((app) => ({
      id: app.id,
      title: `${app.candidate} • ${app.role}`,
      score: app.overallScore ?? app.score,
      tokens: 0,
      applicants: 0,
    }))

  const pipelineCards = applications.slice(0, 10).map((app) => ({
    id: app.id,
    title: `${app.candidate} • ${app.role}`,
    subtitle: `Étape: ${app.stage}`,
    score: app.overallScore ?? app.score,
    tokens: 0,
    applicants: 0,
  }))

  const sectionsData = [
    {
      title: 'Offres actives',
      subtitle: 'Campagnes en cours, statut en un coup d\'oeil.',
      cards: activeOffersCards,
      linkTo: '/offers',
    },
    {
      title: 'Talents recommandés',
      subtitle: 'Matching IA sur vos offres prioritaires.',
      cards: recommendedApplications,
      linkTo: '/applications',
    },
    {
      title: 'Pipeline de candidatures',
      subtitle: 'Suivi temps réel des conversations et tests techniques.',
      cards: pipelineCards,
      linkTo: '/applications',
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Vue recruteur
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Dashboard
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <p className="text-text-muted">Offres actives</p>
          <p className="mt-2 text-2xl font-semibold text-text">
            {dashboard?.activeOffers ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            <Link to="/offers" className="text-linkedin hover:underline">Voir tout</Link>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <p className="text-text-muted">Candidatures en review</p>
          <p className="mt-2 text-2xl font-semibold text-text">
            {dashboard?.applicationsInReview ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            <Link to="/applications" className="text-linkedin hover:underline">Voir tout</Link>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sectionsData.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-text">
                  {section.title}
                </h2>
                <p className="mt-0.5 text-[11px] text-text-muted">{section.subtitle}</p>
              </div>
              <Link
                to={section.linkTo}
                className="text-[11px] font-medium text-linkedin hover:underline"
              >
                Voir tout
              </Link>
            </div>

            {section.cards.length === 0 ? (
              <div className="rounded-2xl border border-border bg-bg-elevated p-4 text-center text-xs text-text-muted">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="relative">
                <motion.div
                  className="flex gap-3 overflow-x-auto pb-3 pr-1"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                >
                  {section.cards.map((card) => (
                    <Link
                      key={`${section.title}-${card.id}`}
                      to={section.linkTo}
                      className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-sm transition-colors hover:border-linkedin/50"
                    >
                      <div className="absolute inset-0 bg-slate-900/5 opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="h-28 bg-gradient-to-br from-accent/80 via-accent-soft/40 to-linkedin/70" />
                      <div className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Score IA {card.score}%
                      </div>
                      <div className="relative space-y-2 p-3">
                        <h3 className="line-clamp-2 text-xs font-semibold text-text">
                          {card.title}
                        </h3>
                        {'subtitle' in card && card.subtitle != null && card.subtitle !== '' && (
                          <p className="text-[11px] text-text-muted">{String(card.subtitle)}</p>
                        )}
                        {'location' in card && (card as { location?: string; contractType?: string }).location != null && (
                          <p className="text-[11px] text-text-muted">
                            {String((card as { location?: string; contractType?: string }).location)} · {String((card as { location?: string; contractType?: string }).contractType ?? '')}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          {card.tokens > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-accent">
                              ⎔ {card.tokens} tokens
                            </span>
                          )}
                          {card.applicants > 0 && (
                            <span className="text-text-muted">
                              {card.applicants} candidat{card.applicants > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
