'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout, getMe, ApiError, type BackendUser } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  user: { username: string; email: string } | null
  isLoading: boolean
  // True only while the one-time startup check (is there already a
  // valid token?) is running -- separate from isLoading so the login
  // button doesn't show "Signing in..." before anyone has touched it.
  isInitializing: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toDisplayUser(backendUser: BackendUser) {
  // The backend's User model has no separate "username" field (it logs
  // in with email) -- existing screens expect { username, email } though,
  // so we derive a display username from the email's local part.
  return { username: backendUser.email.split('@')[0], email: backendUser.email }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On load, check for an existing token and confirm it's still valid
  // (rather than trusting whatever was last saved) by re-fetching /auth/me/.
  useEffect(() => {
    let cancelled = false

    getMe()
      .then((backendUser) => {
        if (cancelled) return
        if (backendUser && backendUser.role === 'facility_staff') {
          setUser(toDisplayUser(backendUser))
          setIsAuthenticated(true)
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const backendUser = await apiLogin(email, password)
      setUser(toDisplayUser(backendUser))
      setIsAuthenticated(true)
    } catch (err) {
      setIsAuthenticated(false)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not reach the server. Please try again.')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, isInitializing, error, login, logout }}>
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
