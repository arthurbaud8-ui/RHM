import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { toast } from 'sonner'

type TestResultRow = {
  id: string
  testId: string
  score: number
  maxScore: number
  percentage: number
  completedAt: string | null
  testTitle?: string
}

export function TestResultsPage() {
  const [results, setResults] = useState<TestResultRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const data = await api.getTestResults()
        const tests = await api.getTests().catch(() => [])
        const byId: Record<string, string> = {}
        tests.forEach((t: any) => { byId[t.id] = t.title })

        const rows: TestResultRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
          id: r.id,
          testId: r.testId,
          score: r.score ?? 0,
          maxScore: r.maxScore ?? 0,
          percentage: r.percentage ?? 0,
          completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
          testTitle: byId[r.testId] || `Test ${r.testId}`,
        }))
        setResults(rows)
      } catch (error: any) {
        toast.error('Erreur lors du chargement des résultats')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des résultats...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Tests
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Mes résultats de tests
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Historique des tests passés (score, date).
          </p>
        </div>
        <Link
          to="/tests"
          className="rounded-full bg-linkedin px-4 py-2 text-xs font-semibold text-white hover:bg-linkedin/90"
        >
          Passer un test
        </Link>
      </header>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-elevated p-8 text-center text-sm text-text-muted">
          <p>Aucun résultat pour le moment.</p>
          <Link to="/tests" className="mt-2 inline-block text-linkedin hover:underline">
            Voir les tests disponibles
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated text-xs shadow-sm">
          <table className="w-full">
            <thead className="border-b border-border bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-text">{r.testTitle}</td>
                  <td className="px-3 py-2">
                    <span className={r.percentage >= 60 ? 'text-success font-semibold' : 'text-text-muted'}>
                      {r.percentage}%
                    </span>
                    <span className="ml-1 text-text-muted">({r.score}/{r.maxScore})</span>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {r.completedAt
                      ? new Date(r.completedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
