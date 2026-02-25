import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { api } from '../services/api'
import type { LoginRequest } from '../services/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  user: { email: string; name: string; fullName: string; role?: string } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ email: string; name: string; fullName: string; role?: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        setIsAuthenticated(!!token)
        
        // Si un token existe, charger le profil utilisateur
        if (token) {
          try {
            // Attendre un peu pour s'assurer que le token est disponible
            await new Promise(resolve => setTimeout(resolve, 100))
            const profile = await api.getProfile()
            setUser({
              email: profile.email,
              name: profile.fullName,
              fullName: profile.fullName,
              role: profile.role,
            })
          } catch (error: any) {
            // Token invalide ou erreur API - nettoyer seulement si c'est une erreur 401
            if (error.message?.includes('Non autorisé') || error.message?.includes('401')) {
              localStorage.removeItem('auth_token')
              setIsAuthenticated(false)
              setUser(null)
            } else {
              // Pour les autres erreurs (NetworkError, etc.), ne pas nettoyer le token
              console.warn('Erreur lors du chargement du profil:', error)
            }
          }
        }
      } catch {
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await api.login(credentials)
      // Attendre que le token soit bien stocké
      await new Promise(resolve => setTimeout(resolve, 100))
      setIsAuthenticated(true)
      setUser({
        email: response.user.email,
        name: response.user.fullName,
        fullName: response.user.fullName,
        role: response.user.role,
      })
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    // Réinitialiser complètement l'état avant de rediriger
    setIsAuthenticated(false)
    setUser(null)
    setIsLoading(false)
    
    // Appeler la fonction de déconnexion de l'API qui nettoie le localStorage
    api.logout()
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
