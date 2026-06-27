'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: { username: string } | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Simple demo validation
      if (username === 'admin' && password === 'admin123') {
        setUser({ username })
        setIsAuthenticated(true)
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
