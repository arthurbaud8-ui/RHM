import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { toast } from 'sonner'

export function CreateOfferPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary: '',
    contractType: 'CDI' as 'CDI' | 'CDD' | 'Stage' | 'Freelance',
    experience: 'Junior' as 'Junior' | 'Confirmé' | 'Senior' | 'Expert',
    skills: '',
    benefits: '',
    testInstructions: '',
    publishImmediately: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.location) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Convertir les champs texte en tableaux
      const requirements = formData.requirements
        .split('\n')
        .filter(r => r.trim().length > 0)
      const skills = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      const benefits = formData.benefits
        .split('\n')
        .filter(b => b.trim().length > 0)

      const createdOffer = await api.createJobOffer({
        title: formData.title,
        description: formData.description,
        requirements,
        location: formData.location,
        salary: formData.salary || undefined,
        contractType: formData.contractType,
        experience: formData.experience,
        skills,
        benefits: benefits.length > 0 ? benefits : undefined,
        testInstructions: formData.testInstructions.trim() || undefined,
      })

      // Si l'utilisateur veut publier immédiatement, mettre à jour le statut
      if (formData.publishImmediately && createdOffer.id) {
        try {
          await api.updateOffer(createdOffer.id, { status: 'live' })
          toast.success('Offre créée et publiée avec succès ! Un test technique a été généré automatiquement.')
        } catch (error) {
          toast.success('Offre créée avec succès ! Vous pouvez la publier depuis la liste des offres.')
        }
      } else {
        toast.success('Offre créée avec succès ! Un test technique a été généré automatiquement. Publiez-la pour qu\'elle soit visible par les candidats.')
      }
      
      navigate('/offers')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création de l\'offre')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Nouvelle offre
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Publier une offre d'emploi
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Remplissez les informations ci-dessous. Un test technique sera généré automatiquement par IA.
        </p>
      </header>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-bg-elevated p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Titre du poste *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: Développeur Full-Stack React/Node.js"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Décrivez le poste, les missions principales, l'environnement de travail..."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Localisation *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: Paris, Remote, Lyon..."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Salaire
            </label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: 45k€ - 60k€"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Type de contrat *
            </label>
            <select
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-linkedin focus:outline-none"
              required
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Niveau d'expérience *
            </label>
            <select
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-linkedin focus:outline-none"
              required
            >
              <option value="Junior">Junior</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Senior">Senior</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Compétences requises * (séparées par des virgules)
            </label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: React, Node.js, TypeScript, PostgreSQL"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Prérequis (un par ligne)
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Exemple:&#10;Minimum 2 ans d'expérience&#10;Maîtrise de React&#10;Connaissance de Git"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Avantages (un par ligne)
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Exemple:&#10;Télétravail flexible&#10;Mutuelle&#10;Ticket restaurant"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-text">
              Ce que vous souhaitez tester en priorité (optionnel)
            </label>
            <textarea
              value={formData.testInstructions}
              onChange={(e) => setFormData({ ...formData, testInstructions: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
              placeholder="Ex: compréhension des boucles et async, qualité du code, gestion d'erreurs..."
            />
            <p className="mt-1 text-xs text-text-muted">
              Cette note sera utilisée par l’IA pour orienter les questions du test technique.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.publishImmediately}
                onChange={(e) => setFormData({ ...formData, publishImmediately: e.target.checked })}
                className="rounded border-border text-linkedin focus:ring-linkedin"
              />
              <span className="text-sm font-medium text-text">
                Publier immédiatement (visible par les candidats)
              </span>
            </label>
            <p className="mt-1 text-xs text-text-muted">
              Si non coché, l'offre sera créée en brouillon et vous pourrez la publier plus tard.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-linkedin px-6 py-2 text-sm font-semibold text-white hover:bg-linkedin/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Création...' : 'Créer l\'offre'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/offers')}
            className="rounded-full border border-border bg-white px-6 py-2 text-sm font-semibold text-text hover:bg-bg-elevated"
          >
            Annuler
          </button>
        </div>
      </motion.form>
    </div>
  )
}
