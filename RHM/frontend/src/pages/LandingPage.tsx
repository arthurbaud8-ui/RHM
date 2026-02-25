import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Background: gradient mesh */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgb(var(--color-bg)),rgb(248_250_252))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgb(var(--color-linkedin)/0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgb(var(--color-accent-soft)/0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,rgb(var(--color-accent)/0.08),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/home" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linkedin shadow-lg shadow-linkedin/25">
              <span className="text-lg font-bold tracking-tighter text-white">R</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-text">RHM</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-text-muted transition hover:text-text"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white shadow-md shadow-linkedin/25 transition hover:bg-linkedin/90"
            >
              S'inscrire
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24 md:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-linkedin/30 bg-linkedin/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-linkedin"
            >
              Projet Epitech
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ delay: 0.08 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linkedin shadow-xl shadow-linkedin/30 sm:h-24 sm:w-24"
            >
              <RHMLogo className="h-12 w-12 text-white sm:h-14 sm:w-14" />
            </motion.div>
            <motion.h1
              {...fadeUp}
              transition={{ delay: 0.1 }}
              className="text-5xl font-bold tracking-tight text-text sm:text-6xl md:text-7xl"
            >
              <span className="bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">
                RHM
              </span>
            </motion.h1>
            <motion.p
              {...fadeUp}
              transition={{ delay: 0.2 }}
              className="mt-4 text-lg font-medium text-linkedin sm:text-xl"
            >
              La Révolution du Recrutement en Ligne
            </motion.p>
            <motion.p
              {...fadeUp}
              transition={{ delay: 0.3 }}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-muted"
            >
              Une plateforme intelligente qui connecte recruteurs et candidats grâce au matching IA,
              aux tests techniques et à une messagerie intégrée — pour recruter mieux, plus vite.
            </motion.p>
            <motion.div
              {...fadeUp}
              transition={{ delay: 0.45 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-linkedin px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-linkedin/30 transition hover:bg-linkedin/90"
              >
                Démarrer gratuitement
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-bg-elevated px-6 py-3 text-sm font-semibold text-text transition hover:border-linkedin hover:text-linkedin"
              >
                J'ai déjà un compte
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Le problème */}
        <section className="relative border-y border-border/60 bg-bg-elevated/50 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-2xl font-bold text-text sm:text-3xl"
            >
              Le recrutement, un défi pour toutes les entreprises
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-4 max-w-2xl text-center text-text-muted"
            >
              Candidats noyés sous les offres, recruteurs submergés de CV non ciblés,
              processus longs et peu de visibilité sur les compétences réelles.
            </motion.p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: 'CV et offres en masse',
                  desc: 'Difficile de trouver le bon profil parmi des centaines de candidatures.',
                  icon: '📄',
                },
                {
                  title: 'Matching approximatif',
                  desc: 'Peu d’outils pour évaluer objectivement les compétences et l’adéquation au poste.',
                  icon: '🎯',
                },
                {
                  title: 'Processus fragmentés',
                  desc: 'Tests, échanges et suivi éparpillés entre plusieurs outils.',
                  icon: '🔀',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 * i }}
                  className="rounded-2xl border border-border bg-bg p-6 text-center shadow-sm"
                >
                  <span className="text-3xl" aria-hidden>{item.icon}</span>
                  <h3 className="mt-3 font-semibold text-text">{item.title}</h3>
                  <p className="mt-2 text-sm text-text-muted">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* La solution RHM */}
        <section className="relative px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-2xl font-bold text-text sm:text-3xl"
            >
              RHM : une plateforme tout-en-un
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-4 max-w-2xl text-center text-text-muted"
            >
              Matching par IA, tests techniques intégrés, messagerie et tableaux de bord
              pour recruteurs et candidats — le recrutement simplifié de A à Z.
            </motion.p>
            <div className="mt-14 grid gap-8 md:grid-cols-2">
              {[
                {
                  title: 'Matching IA',
                  desc: 'Analyse des CV et des offres pour proposer les candidats les plus pertinents et un score d’adéquation.',
                  gradient: 'from-linkedin/20 to-accent-soft/20',
                },
                {
                  title: 'Tests techniques',
                  desc: 'Génération et passage de tests techniques directement sur la plateforme, avec correction et notation automatiques.',
                  gradient: 'from-accent/15 to-linkedin/15',
                },
                {
                  title: 'Messagerie intégrée',
                  desc: 'Échanges entre recruteurs et candidats, envoi de tests supplémentaires et suivi des conversations.',
                  gradient: 'from-linkedin/15 to-accent-soft/15',
                },
                {
                  title: 'Tableaux de bord',
                  desc: 'Recruteurs : offres, candidatures, scores. Candidats : candidatures, résultats de tests et opportunités.',
                  gradient: 'from-accent-soft/20 to-linkedin/15',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className={`rounded-2xl border border-border bg-gradient-to-br ${item.gradient} p-6 shadow-sm`}
                >
                  <h3 className="font-semibold text-text">{item.title}</h3>
                  <p className="mt-2 text-sm text-text-muted">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA + Epitech */}
        <section className="relative border-t border-border/60 bg-bg-elevated/50 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-bg p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold text-text sm:text-2xl">
                Prêt à transformer votre recrutement ?
              </h2>
              <p className="mt-2 text-text-muted">
                Rejoignez la plateforme RHM — recruteurs et candidats, en un clic.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="rounded-full bg-linkedin px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-linkedin/90"
                >
                  Créer un compte
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-text transition hover:border-linkedin hover:text-linkedin"
                >
                  Se connecter
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">Projet réalisé dans le cadre d’</span>
                <a
                  href="https://www.epitech.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm font-semibold text-text transition hover:border-linkedin hover:text-linkedin"
                >
                  <img 
                    src="https://companieslogo.com/img/orig/epitech-eu-6dc66ba1.svg" 
                    alt="Epitech" 
                    className="h-5 w-5"
                    onError={(e) => {
                      // Fallback sur le SVG personnalisé si l'image ne charge pas
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('svg')) {
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('class', 'h-5 w-5');
                        svg.setAttribute('viewBox', '0 0 24 24');
                        svg.setAttribute('fill', 'currentColor');
                        svg.innerHTML = '<rect x="4" y="4" width="3" height="16" fill="currentColor"/><rect x="4" y="4" width="14" height="3" fill="currentColor"/><rect x="4" y="10.5" width="10" height="3" fill="currentColor"/><rect x="4" y="17" width="14" height="3" fill="currentColor"/>';
                        parent.insertBefore(svg, target);
                      }
                    }}
                  />
                  Epitech
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linkedin">
                <span className="text-sm font-bold text-white">R</span>
              </div>
              <span className="font-semibold text-text">RHM</span>
            </div>
            <p className="text-center text-xs text-text-muted sm:text-left">
              © {new Date().getFullYear()} RHM — Projet Epitech. La Révolution du Recrutement en Ligne.
            </p>
            <div className="flex gap-6 text-xs text-text-muted">
              <Link to="/login" className="hover:text-linkedin">Connexion</Link>
              <Link to="/register" className="hover:text-linkedin">S'inscrire</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

/** Logo RHM — lettre R classique */
function RHMLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <text
        x="16"
        y="24"
        fontSize="24"
        fontWeight="bold"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        R
      </text>
    </svg>
  )
}

