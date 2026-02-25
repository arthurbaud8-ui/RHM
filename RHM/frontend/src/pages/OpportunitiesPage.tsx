import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setIsLoading(true)
        const data = await api.getOpportunities()
        setOpportunities(data)
      } catch (error: any) {
        toast.error('Erreur lors du chargement des opportunités')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  const handleUpdateStatus = async (opportunityId: string, status: string) => {
    try {
      await api.updateOpportunityStatus(opportunityId, status)
      toast.success('Statut mis à jour')
      // Recharger les opportunités
      const data = await api.getOpportunities()
      setOpportunities(data)
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour')
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des opportunités...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Opportunités
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Mes opportunités
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Découvrez les opportunités qui correspondent à votre profil
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {opportunities.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-text-muted">
            Aucune opportunité pour le moment
          </div>
        ) : (
          opportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-2xl border border-border bg-bg-elevated p-4 shadow-sm"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {opp.companyName}
                  </h3>
                  <p className="text-xs text-text-muted">{opp.jobTitle}</p>
                </div>

                <p className="text-xs text-text">{opp.message}</p>

                {opp.compatibilityScore && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Compatibilité :</span>
                    <span className="text-sm font-semibold text-linkedin">
                      {opp.compatibilityScore}%
                    </span>
                  </div>
                )}

                {opp.deadline && (
                  <p className="text-xs text-text-muted">
                    Délai : {opp.deadline}
                  </p>
                )}

                {opp.meeting && (
                  <p className="text-xs text-text-muted">
                    Rendez-vous : {opp.meeting}
                  </p>
                )}

                <div className="flex gap-2">
                  {opp.action === 'Postuler' && (
                    <button
                      onClick={() => navigate('/offers')}
                      className="flex-1 rounded-full bg-linkedin px-3 py-1 text-xs font-semibold text-white hover:bg-linkedin/90"
                    >
                      {opp.actionLabel || opp.action}
                    </button>
                  )}
                  {opp.action === 'Reprendre' && (
                    <button
                      onClick={() => navigate('/tests')}
                      className="flex-1 rounded-full bg-linkedin px-3 py-1 text-xs font-semibold text-white hover:bg-linkedin/90"
                    >
                      {opp.action}
                    </button>
                  )}
                  {opp.action === 'Confirmer' && (
                    <button
                      onClick={() => handleUpdateStatus(opp.id, 'confirmed')}
                      className="flex-1 rounded-full bg-linkedin px-3 py-1 text-xs font-semibold text-white hover:bg-linkedin/90"
                    >
                      {opp.action}
                    </button>
                  )}
                  {opp.status === 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(opp.id, 'completed')}
                      className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text hover:bg-bg-elevated"
                    >
                      Marquer comme complété
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
