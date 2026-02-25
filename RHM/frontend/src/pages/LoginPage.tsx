import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login({ email, password })
      toast.success('Connexion réussie !')
      navigate('/')
    } catch (error: any) {
      toast.error(error.message || 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Link
        to="/home"
        className="absolute left-4 top-4 text-xs font-medium text-text-muted hover:text-linkedin"
      >
        ← Retour à l'accueil
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-bg-elevated p-8 shadow-lg"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg text-lg font-semibold uppercase tracking-[0.18em] text-accent">
            rh
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Connexion RHM
          </h1>
          <p className="mt-2 text-xs text-text-muted">
          La Révolution du Recrutement en Ligne
                    </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-text"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-text"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="••••••••"
            />
            <Link
              to="/forgot-password"
              className="mt-1 block text-right text-xs text-linkedin hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-linkedin/90 disabled:opacity-50"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-bg-elevated px-2 text-text-muted">Ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/register')}
          className="w-full rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-bg-elevated"
        >
          Créer un compte
        </button>

      </motion.div>
    </div>
  )
}
