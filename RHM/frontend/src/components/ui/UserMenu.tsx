import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleProfileClick = () => {
    navigate('/profile')
    setIsOpen(false)
  }

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PL'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs text-text hover:border-linkedin hover:text-white"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-linkedin to-accent text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden flex-col text-left leading-tight sm:flex">
          <span className="text-[11px] font-semibold">{user?.name }</span>
          <span className="text-[10px] text-text-muted">
          </span>
        </span>
        <span className="hidden text-[10px] text-text-muted sm:inline">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-lg">
          <div className="p-1">
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-full rounded-md px-3 py-2 text-left text-xs text-text hover:bg-slate-100"
            >
              Mon profil
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md px-3 py-2 text-left text-xs text-text hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

