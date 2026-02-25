import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../services/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      toast.error('Lien invalide. Demandez un nouveau lien de réinitialisation.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (!token) return
    setIsLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
      toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (error: any) {
      toast.error(error.message || 'Lien expiré ou invalide.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-bg-elevated p-8 shadow-lg text-center"
        >
          <h1 className="text-xl font-semibold text-text">Lien invalide</h1>
          <p className="text-sm text-text-muted">
            Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau depuis la page « Mot de passe oublié ».
          </p>
          <Link
            to="/forgot-password"
            className="inline-block rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white hover:bg-linkedin/90"
          >
            Nouveau lien
          </Link>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-bg-elevated p-8 shadow-lg text-center"
        >
          <h1 className="text-xl font-semibold text-text">Mot de passe mis à jour</h1>
          <p className="text-sm text-text-muted">Redirection vers la page de connexion...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Link
        to="/login"
        className="absolute left-4 top-4 text-xs font-medium text-text-muted hover:text-linkedin"
      >
        ← Retour à la connexion
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
            Nouveau mot de passe
          </h1>
          <p className="mt-2 text-xs text-text-muted">
            Choisissez un mot de passe d'au moins 6 caractères.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-text">
              Nouveau mot de passe
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
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-text">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-linkedin/90 disabled:opacity-50"
          >
            {isLoading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
