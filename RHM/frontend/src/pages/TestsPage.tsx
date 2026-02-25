import Editor from '@monaco-editor/react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { QcmQuestion } from '../services/api'
import { toast } from 'sonner'

export function TestsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tests, setTests] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<any | null>(null)
  const [testResultId, setTestResultId] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QcmQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBlurred, setIsBlurred] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testResult, setTestResult] = useState<any | null>(null)

  const handleStartTest = useCallback(async (testId: string) => {
    try {
      const { testResultId: resultId, test } = await api.startTest(testId)
      setSelectedTest(test)
      setTestResultId(resultId)
      setCodeAnswers({})
      // Inclure TOUTES les questions QCM (même si options vides ou mal formatées)
      // Ne pas filtrer trop strictement pour ne pas perdre de questions
      const qcmQuestions: QcmQuestion[] = (test.questions || [])
        .filter((q: any) => {
          // Inclure si c'est explicitement multiple-choice ou si ce n'est PAS du code
          const isCode = q.type === 'code' || q.codeExerciseType || q.initialCode || q.starterCode;
          return !isCode && (q.type === 'multiple-choice' || q.type === 'qcm' || !q.type || !q.codeExerciseType);
        })
        .map((q: any) => ({
          id: q.id || `qcm-${Math.random()}`,
          question: q.question || 'Question sans texte',
          options: Array.isArray(q.options) && q.options.length > 0 
            ? q.options 
            : ['Option A', 'Option B', 'Option C', 'Option D'], // Fallback si pas d'options
          correctIndex: 0,
        }))
      setQuestions(qcmQuestions)
      toast.success('Test démarré !')
    } catch (error: any) {
      toast.error('Erreur lors du démarrage du test')
      console.error(error)
    }
  }, [])

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setIsLoading(true)
        const data = await api.getTests()
        setTests(data)
        
        // Vérifier si un testId est passé dans l'URL (depuis une candidature)
        const testIdFromUrl = searchParams.get('testId')
        const applicationIdFromUrl = searchParams.get('applicationId')
        
        if (testIdFromUrl && !selectedTest) {
          setApplicationId(applicationIdFromUrl)
          // Démarrer automatiquement le test
          await handleStartTest(testIdFromUrl)
          // Nettoyer les paramètres URL pour éviter de redémarrer le test
          navigate('/tests', { replace: true })
        }
      } catch (error: any) {
        toast.error('Erreur lors du chargement des tests')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTests()
  }, [searchParams, handleStartTest, selectedTest, navigate])

  const handleSubmitTest = async () => {
    if (!selectedTest || !testResultId) return

    try {
      setIsSubmitting(true)
      // Toutes les réponses : QCM + code (une entrée par question du test)
      const formattedAnswers: { questionId: string; answer: string | string[] }[] = []
      selectedTest.questions?.forEach((q: any) => {
        const isCode = q.type === 'code' || q.codeExerciseType || q.initialCode || q.starterCode;
        if (isCode) {
          const value = codeAnswers[q.id] ?? (q.codeExerciseType === 'fix' ? q.initialCode ?? '' : q.starterCode ?? '')
          formattedAnswers.push({ questionId: q.id || `q-${Math.random()}`, answer: value })
        } else {
          const answer = answers[q.id]
          formattedAnswers.push({
            questionId: q.id || `q-${Math.random()}`,
            answer: Array.isArray(answer) ? answer : (answer != null ? answer : ''),
          })
        }
      })

      const result = await api.submitTest(selectedTest.id, {
        testResultId,
        answers: formattedAnswers,
        applicationId: applicationId || undefined, // Lier le test à la candidature si disponible
      })

      setTestResult(result)
      toast.success(`Test soumis ! Score : ${result.result.percentage}%`)
      
      // Si le test était lié à une candidature, rediriger vers les candidatures
      if (applicationId) {
        setTimeout(() => {
          navigate('/applications')
        }, 2000)
      }
    } catch (error: any) {
      toast.error('Erreur lors de la soumission du test')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const onBlur = () => setIsBlurred(true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement des tests...</div>
      </div>
    )
  }

  if (testResult) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Résultats du test
          </h1>
        </header>
        <div className="rounded-2xl border border-border bg-bg-elevated p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-muted">Score obtenu</p>
              <p className="text-3xl font-bold text-linkedin">
                {testResult.result.percentage}%
              </p>
              <p className="text-xs text-text-muted">
                {testResult.result.score} / {testResult.result.maxScore} points
              </p>
            </div>
            <div>
              <p className={`text-sm font-semibold ${testResult.passed ? 'text-success' : 'text-danger'}`}>
                {testResult.passed ? '✅ Test réussi !' : '❌ Test échoué'}
              </p>
            </div>
            <button
              onClick={() => {
                setTestResult(null)
                setSelectedTest(null)
                setTestResultId(null)
                setAnswers({})
                setCodeAnswers({})
              }}
              className="rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white hover:bg-linkedin/90"
            >
              Retour aux tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedTest) {
    return (
      <div className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Tests
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Tests de compétences
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Sélectionnez un test pour commencer
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="rounded-2xl border border-border bg-bg-elevated p-4"
            >
              <h3 className="text-sm font-semibold text-text">{test.title}</h3>
              <p className="mt-1 text-xs text-text-muted">{test.description}</p>
              <button
                onClick={() => handleStartTest(test.id)}
                className="mt-4 w-full rounded-full bg-linkedin px-4 py-2 text-xs font-semibold text-white hover:bg-linkedin/90"
              >
                Démarrer le test
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Tests
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {selectedTest.title}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Interface fluide avec QCM à gauche, éditeur de code Monaco à droite
            et anti-cheat léger (tab/window blur).
          </p>
        </div>
        <button
          onClick={handleSubmitTest}
          disabled={isSubmitting}
          className="rounded-full bg-linkedin px-4 py-2 text-xs font-semibold text-white hover:bg-linkedin/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Soumission...' : 'Soumettre le test'}
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <section className="space-y-3 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <h2 className="text-sm font-semibold text-text">QCM technique</h2>
          <p className="text-[11px] text-text-muted">
            Répondez aux questions ci-dessous. Les résultats détaillés et
            explications sont visibles côté recruteur uniquement.
          </p>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-text-muted">
                Aucune question disponible
              </div>
            ) : (
              questions.map((q, index) => (
                <div
                  key={q.id}
                  className="space-y-2 rounded-xl border border-border bg-white p-3"
                >
                  <p className="text-xs font-medium text-text">
                    Q{index + 1}. {q.question}
                  </p>
                  <div className="grid gap-1.5">
                    {q.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[11px] text-text-muted hover:border-linkedin/70 hover:text-text"
                      >
                        <input
                          type="radio"
                          name={`qcm-${q.id}`}
                          value={optIndex}
                          checked={answers[q.id] === option}
                          onChange={() =>
                            setAnswers({ ...answers, [q.id]: option })
                          }
                          className="h-3 w-3 accent-linkedin"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="relative space-y-4 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text">
              Exercices de code
            </h2>
            <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] text-text-muted">
              Anti-cheat : actif
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            Corrigez le code ou implémentez les fonctions demandées. Évaluation automatique par IA (GPT).
          </p>

          {selectedTest.questions
            ?.filter((q: any) => q.type === 'code' || (!q.type && (q.codeExerciseType || q.initialCode || q.starterCode)))
            .map((q: any, idx: number) => (
              <div key={q.id} className="space-y-2 rounded-xl border border-border bg-white p-3">
                <p className="text-xs font-medium text-text">
                  {q.codeExerciseType === 'fix' ? '🔧 Corriger le code' : '✏️ Écris une fonction'} — Q{idx + 1}
                </p>
                <p className="text-[11px] text-text-muted">{q.question}</p>
                {q.codeExerciseType === 'fix' && q.initialCode && (
                  <div className="rounded-lg border border-border bg-slate-50 p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-muted">Code à corriger :</p>
                    <pre className="overflow-x-auto whitespace-pre text-[11px] text-text font-mono">
                      {q.initialCode}
                    </pre>
                  </div>
                )}
                {q.codeExerciseType === 'write' && q.starterCode && (
                  <div className="rounded-lg border border-border bg-slate-50 p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-muted">Squelette (optionnel) :</p>
                    <pre className="overflow-x-auto whitespace-pre text-[11px] text-text font-mono">
                      {q.starterCode}
                    </pre>
                  </div>
                )}
                <div className="h-44 overflow-hidden rounded-lg border border-border bg-slate-900">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                    }}
                    value={codeAnswers[q.id] ?? (q.codeExerciseType === 'fix' ? q.initialCode ?? '' : q.starterCode ?? '')}
                    onChange={(value) => setCodeAnswers((prev) => ({ ...prev, [q.id]: value ?? '' }))}
                  />
                </div>
              </div>
            ))}

          {selectedTest.questions?.filter((q: any) => q.type === 'code' || (!q.type && (q.codeExerciseType || q.initialCode || q.starterCode))).length === 0 && (
            <div className="py-4 text-center text-[11px] text-text-muted">
              Aucun exercice de code dans ce test
            </div>
          )}

          {isBlurred && (
            <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 px-4 text-center">
              <div className="max-w-md space-y-2 rounded-2xl border border-danger/60 bg-bg-elevated p-4 text-xs text-text shadow-sm">
                <p className="text-sm font-semibold text-danger">
                  Changement de fenêtre détecté
                </p>
                <p className="text-[11px] text-text-muted">
                  Pour garantir l'intégrité du test, vos changements de fenêtre
                  sont journalisés côté recruteur. Merci de rester concentré sur
                  l'exercice.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
