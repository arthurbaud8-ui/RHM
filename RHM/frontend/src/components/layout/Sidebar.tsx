import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'

type NavItem = {
  to: string
  label: string
  shorthand: string
  roles?: ('candidate' | 'recruiter')[] // si absent = visible pour tous
}

const ALL_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', shorthand: 'DB' },
  { to: '/offers', label: 'Offres', shorthand: 'OF' },
  { to: '/applications', label: 'Candidatures', shorthand: 'CA', roles: ['candidate'] },
  { to: '/messaging', label: 'Messagerie', shorthand: 'MS' },
  { to: '/test-results', label: 'Mes résultats', shorthand: 'MR', roles: ['candidate'] },
  { to: '/profile', label: 'Profil', shorthand: 'PR' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    api.getProfile().then((p) => setUserRole(p.role)).catch(() => setUserRole(null))
  }, [])

  const navItems = userRole
    ? ALL_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(userRole as 'candidate' | 'recruiter'))
    : ALL_NAV_ITEMS

  return (
    <aside className="relative hidden border-r border-border bg-bg-elevated text-sm text-text-muted sm:flex">
      <motion.div
        animate={{ width: collapsed ? 72 : 260 }}
        className="flex h-full flex-col px-3 py-4"
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Navigation
              </span>
              <span className="text-[10px] text-text-muted/70">
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg text-[10px] text-text-muted hover:border-accent hover:text-accent"
          >
            {collapsed ? '⟩' : '⟨'}
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-linkedin text-white shadow-sm'
                    : 'text-text-muted hover:bg-slate-100 hover:text-text',
                ].join(' ')
              }
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg text-[11px] font-semibold text-text">
                {item.shorthand}
              </span>
              {!collapsed && (
                <span className="truncate">
                  {item.label}
                  {item.to === '/offers' && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
                      Live
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border/70 pt-3 text-[11px] text-text-muted/70">
          {!collapsed && (
            <>
              <p className="flex items-center justify-between">
                
              </p>
              <p className="text-[10px] leading-snug">
              </p>
            </>
          )}
        </div>
      </motion.div>
    </aside>
  )
}

