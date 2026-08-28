'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: { username: string; email: string } | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'kalingapp-facility-auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch (err) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Simple demo validation
      if (username === 'admin' && password === 'admin123') {
        const loggedInUser = { username, email: `${username}@facility.local` }
        setUser(loggedInUser)
        setIsAuthenticated(true)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser))
        }
      } else {
        setError('Invalid username or password')
        setIsAuthenticated(false)
      }
    } catch (err) {
      setError('An error occurred during login')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, error, login, logout }}>
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
