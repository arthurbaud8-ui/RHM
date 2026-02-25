import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { NotificationBell } from '../ui/NotificationBell'
import { UserMenu } from '../ui/UserMenu'
import { api } from '../../services/api'

export function Header() {
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    api.getProfile().then((p) => setUserRole(p.role)).catch(() => setUserRole(null))
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            rh
          </span>
          <span className="font-semibold text-text">RHM</span>
          <span className="hidden text-xs text-text-muted sm:inline">
            La Révolution du Recrutement en Ligne
          </span>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Navigation compacte pour mobile */}
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-2 border-t border-border/60 px-3 py-2 text-[11px] text-text-muted sm:hidden">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            [
              'rounded-full px-3 py-1',
              isActive ? 'bg-linkedin text-white' : 'hover:bg-slate-100',
            ].join(' ')
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/offers"
          className={({ isActive }) =>
            [
              'rounded-full px-3 py-1',
              isActive ? 'bg-linkedin text-white' : 'hover:bg-slate-100',
            ].join(' ')
          }
        >
          Offres
        </NavLink>
        
        {userRole === 'candidate' && (
          <NavLink
            to="/applications"
            className={({ isActive }) =>
              [
                'rounded-full px-3 py-1',
                isActive ? 'bg-linkedin text-white' : 'hover:bg-slate-100',
              ].join(' ')
            }
          >
            Candidatures
          </NavLink>
        )}
        <NavLink
          to="/messaging"
          className={({ isActive }) =>
            [
              'rounded-full px-3 py-1',
              isActive ? 'bg-linkedin text-white' : 'hover:bg-slate-100',
            ].join(' ')
          }
        >
          Messagerie
        </NavLink>
      </nav>
    </header>
  )
}

