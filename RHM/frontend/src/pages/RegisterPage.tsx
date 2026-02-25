import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { toast } from 'sonner'

export type RegisterRequest = {
  nom: string
  prenom: string
  email: string
  password: string
  role?: 'candidate' | 'recruiter'
}

export function RegisterPage() {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      setIsLoading(false)
      return
    }

    try {
      await api.register({
        nom,
        prenom,
        email,
        password,
        role,
      })
      toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du compte')
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
            Créer un compte
          </h1>
          <p className="mt-2 text-xs text-text-muted">
            Rejoignez la plateforme RHM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prenom"
                className="mb-1 block text-xs font-medium text-text"
              >
                Prénom
              </label>
              <input
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                placeholder="Jean"
              />
            </div>

            <div>
              <label
                htmlFor="nom"
                className="mb-1 block text-xs font-medium text-text"
              >
                Nom
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                placeholder="Dupont"
              />
            </div>
          </div>

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
              placeholder="jean.dupont@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-xs font-medium text-text"
            >
              Je suis
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'candidate' | 'recruiter')}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-linkedin focus:outline-none"
            >
              <option value="candidate">Candidat</option>
              <option value="recruiter">Recruteur</option>
            </select>
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
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-xs font-medium text-text"
            >
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
            {isLoading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-semibold text-linkedin hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
