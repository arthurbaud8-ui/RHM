import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSent(false)
    try {
      await api.forgotPassword(email)
      setSent(true)
      toast.success('Si cet email est associé à un compte, vous recevrez un lien par email.')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi')
    } finally {
      setIsLoading(false)
    }
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
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-xs text-text-muted">
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center text-sm text-text">
            <p>Un email vous a été envoyé si un compte existe pour cette adresse.</p>
            <p className="text-text-muted">Vérifiez aussi vos spams. Le lien est valable 1 heure.</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-linkedin/90"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-text">
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
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-linkedin/90 disabled:opacity-50"
            >
              {isLoading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
